"""Render genuine browser captures with generated narration and aligned captions.

Requires Pillow and FFmpeg. Never creates or changes application state.
Capture frames and audio are inputs; edit.json records timing and source shots.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from functools import lru_cache
from difflib import SequenceMatcher
from bisect import bisect_right
import json, re, subprocess, os, math, sys, shutil

ROOT = Path(__file__).resolve().parents[2]
WORK = ROOT / 'work/video'
OUT = ROOT / 'docs/deliverables'
def executable(name):
    value = os.environ.get(name.upper()) or shutil.which(name)
    if not value:
        raise RuntimeError(f'{name} is required. Put it on PATH or set {name.upper()} to its executable path.')
    return value

FFMPEG = executable('ffmpeg')
FFPROBE = executable('ffprobe')

def font_paths():
    regular, bold = os.environ.get('VIDEO_FONT_REGULAR'), os.environ.get('VIDEO_FONT_BOLD')
    if regular or bold:
        if not regular or not bold:
            raise RuntimeError('Set both VIDEO_FONT_REGULAR and VIDEO_FONT_BOLD to readable TrueType fonts.')
        return Path(regular).expanduser(), Path(bold).expanduser()
    directory = os.environ.get('VIDEO_FONT_DIR')
    if directory:
        root = Path(directory).expanduser()
        return root/'NotoSans-Regular.ttf', root/'NotoSans-Bold.ttf'
    candidates = [
        (Path.home()/'.cache/codex-runtimes/codex-primary-runtime/dependencies/native/libreoffice-headless/libreoffice/LibreOfficeDev.app/Contents/Resources/fonts/truetype', 'NotoSans-Regular.ttf', 'NotoSans-Bold.ttf'),
        (Path('/usr/share/fonts/truetype/noto'), 'NotoSans-Regular.ttf', 'NotoSans-Bold.ttf'),
        (Path('/usr/share/fonts/truetype/dejavu'), 'DejaVuSans.ttf', 'DejaVuSans-Bold.ttf'),
        (Path('/System/Library/Fonts/Supplemental'), 'Arial.ttf', 'Arial Bold.ttf'),
        (Path(os.environ.get('WINDIR', 'C:/Windows'))/'Fonts', 'arial.ttf', 'arialbd.ttf'),
    ]
    for root, regular, bold in candidates:
        if (root/regular).is_file() and (root/bold).is_file():
            return root/regular, root/bold
    raise RuntimeError('No supported font pair found. Set VIDEO_FONT_DIR to Noto Sans fonts, or set VIDEO_FONT_REGULAR and VIDEO_FONT_BOLD.')

FONT_REGULAR, FONT_BOLD = font_paths()
W, H, FPS = 1920, 1080, 24
NAVY, BLUE, PALE, WHITE = '#13263e', '#8eb4ff', '#c7d6e9', '#ffffff'
SPEED = 0.9

def font(size, bold=False):
    return ImageFont.truetype(str(FONT_BOLD if bold else FONT_REGULAR), size)

FONTS = {k: font(k) for k in (18, 20, 22, 24, 28, 32, 34, 42, 46, 54, 72)}
BOLD = {k: font(k, True) for k in (20, 24, 28, 34, 42, 46, 54, 72)}

def duration(file):
    return float(subprocess.check_output([FFPROBE, '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', str(file)], text=True))

def norm(word):
    return re.sub(r'[^a-z0-9]', '', word.lower())

@lru_cache(maxsize=256)
def wrap(text, max_width, face):
    lines, line = [], ''
    for word in text.split():
        trial = f'{line} {word}'.strip()
        if face.getlength(trial) > max_width and line:
            lines.append(line)
            line = word
        else:
            line = trial
    if line: lines.append(line)
    return lines

def aligned_words(text, observed):
    expected = text.split()
    a, b = list(map(norm, expected)), [norm(w['word']) for w in observed]
    matcher = SequenceMatcher(None, a, b, autojunk=False)
    if matcher.ratio() < 0.72:
        raise ValueError('Narration transcript diverges from the approved script.')
    result = [None] * len(a)
    for block in matcher.get_matching_blocks():
        for offset in range(block.size):
            result[block.a + offset] = dict(observed[block.b + offset])
    # Interpolate number-format differences between neighboring matched words.
    for start, value in enumerate(result):
        if value is not None: continue
        end = start
        while end < len(result) and result[end] is None: end += 1
        lo = result[start-1]['end'] if start else 0
        hi = result[end]['start'] if end < len(result) else observed[-1]['end']
        hi = max(hi, lo + .05 * (end-start))
        for i in range(start, end):
            result[i] = {'start': lo + (hi-lo)*(i-start)/(end-start), 'end': lo + (hi-lo)*(i+1-start)/(end-start)}
    return result

def timestamp(seconds, separator=','):
    ms = round(seconds * 1000)
    return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02}{separator}{ms%1000:03}'

manifest = json.loads((WORK/'audio/manifest.json').read_text())
source = json.loads((ROOT/'docs/deliverables/Captions-source.json').read_text())
edit = json.loads((ROOT/'docs/video-source/edit.json').read_text())
segments, captions, clock = [], [], 0.0
if not len(manifest['segments']) == len(source['segments']) == len(edit['segments']):
    raise ValueError('Narration, caption, and edit segment counts must match.')
for audio, caption, plan in zip(manifest['segments'], source['segments'], edit['segments']):
    assert audio['id'] == caption['id'] == plan['id']
    speech = WORK/'audio'/audio['file']
    speech_duration = duration(speech) / SPEED
    length = max(plan.get('min_duration', 0), speech_duration + 1.0)
    start_audio = clock + .35
    words = aligned_words(audio['text'], audio['transcript']['words'])
    cursor = 0
    for cue in caption['cues']:
        count = len(cue['text'].split())
        first, last = words[cursor], words[cursor+count-1]
        lines = wrap(cue['text'].replace('\u2014', ': '), 1550, FONTS[34])
        if len(lines) > 2: raise ValueError(f'Caption too long: {cue}')
        captions.append({'start': start_audio + first['start']/SPEED, 'end': start_audio + max(last['end'], first['start']+.3)/SPEED, 'lines': lines})
        cursor += count
    assert cursor == len(words), (audio['id'], cursor, len(words))
    segments.append({**plan, 'start':clock, 'end':clock+length, 'duration':length, 'audio':str(speech), 'speech_start':start_audio})
    clock += length
clock += 3.0
if clock >= 180: raise ValueError(f'Film exceeds hackathon limit: {clock:.2f}s')
OUT.mkdir(parents=True, exist_ok=True)
WORK.mkdir(parents=True, exist_ok=True)
for i in range(len(captions)-1):
    captions[i]['end'] = min(captions[i]['end']+.12, captions[i+1]['start']-.01)
(OUT/'KindHandoff-Captions.srt').write_text('\n\n'.join(f"{i+1}\n{timestamp(c['start'])} --> {timestamp(c['end'])}\n"+'\n'.join(c['lines']) for i,c in enumerate(captions))+'\n')
(OUT/'KindHandoff-Captions.vtt').write_text('WEBVTT\n\n'+'\n\n'.join(f"{timestamp(c['start'],'.')} --> {timestamp(c['end'],'.')}\n"+'\n'.join(c['lines']) for c in captions)+'\n')

@lru_cache(maxsize=16)
def prepared_capture(path, crop):
    # Cache the finished display image, never mutate a cached source screenshot.
    # Cropping and proportional scaling are the only capture transformations.
    with Image.open(path) as source:
        image = source.convert('RGB')
    if crop:
        if not (0 <= crop[0] < crop[2] <= image.width and 0 <= crop[1] < crop[3] <= image.height):
            raise ValueError(f'Crop extends outside the actual capture: {path}, {crop}')
        image = image.crop(crop)
    scale = min(1388/image.width, 822/image.height)
    image = image.resize((round(image.width*scale), round(image.height*scale)), Image.Resampling.LANCZOS)
    return image

@lru_cache(maxsize=40)
def shot_frames(name):
    directory = WORK/'captures'/name
    frames = json.loads((directory/'frames.json').read_text())
    if not frames: raise ValueError(f'No actual frames captured for {name}')
    origin = frames[0]['timestamp']
    return [(max(0, item['timestamp']-origin), directory/item['file']) for item in frames]

def selected_shot(segment, elapsed):
    shots = segment['shots']
    total = sum(item.get('weight', 1) for item in shots)
    consumed = 0.0
    for i, shot in enumerate(shots):
        length = segment['duration'] * shot.get('weight',1) / total
        if elapsed < consumed+length or i == len(shots)-1:
            return shot, elapsed-consumed, length
        consumed += length
    raise AssertionError('No shot')

def screen(shot, elapsed, length):
    frames = shot_frames(shot['name'])
    if 'frame' in shot:
        # An editorial still may hold only a frame listed in the genuine capture.
        index = shot['frame']
        if not isinstance(index, int) or not 0 <= index < len(frames):
            raise ValueError(f'Invalid source frame for {shot["name"]}: {index}')
        return prepared_capture(str(frames[index][1]), tuple(shot.get('crop', ())))
    raw_length = frames[-1][0]
    # Preserve natural action speed; trim long loading pauses, then hold the result.
    position = min(raw_length, max(0, elapsed-shot.get('lead',.3)) * max(1, raw_length/max(.5,length-.8)))
    chosen = frames[0][1]
    for stamp, file in frames:
        if stamp > position: break
        chosen = file
    return prepared_capture(str(chosen), tuple(shot.get('crop', ())))

def draw_lines(draw, text, x, y, width, face, fill, spacing=12):
    for line in wrap(text, width, face):
        draw.text((x,y),line,font=face,fill=fill)
        y += face.size + spacing
    return y

@lru_cache(maxsize=1)
def closing_card():
    image=Image.new('RGB',(W,H),NAVY)
    d=ImageDraw.Draw(image)
    d.ellipse((1260,-440,2270,570),fill='#1d3c60')
    d.text((100,70),'kindhandoff',font=BOLD[42],fill=WHITE)
    d.text((855,39),'FICTIONAL HOUSEHOLD  |  AI-GENERATED NARRATION',font=FONTS[18],fill=PALE)
    d.text((100,171),'CARE, CARRIED FORWARD',font=BOLD[20],fill=BLUE)
    d.text((95,249),'Clear plans.',font=BOLD[72],fill=WHITE)
    d.text((95,348),'Accepted responsibility.',font=BOLD[72],fill=WHITE)
    d.rounded_rectangle((100,515,1260,715),24,fill='#1c3654')
    d.text((137,536),'$12 / household / month',font=BOLD[42],fill=WHITE)
    d.text((137,605),'Pricing hypothesis. Every helper included.',font=FONTS[28],fill=PALE)
    d.text((137,650),'Household validation comes next.',font=FONTS[24],fill=PALE)
    d.text((100,792),'Try the working product',font=FONTS[24],fill=BLUE)
    d.text((100,835),'kindhandoff.web.app',font=BOLD[46],fill=WHITE)
    d.text((1375,810),'Created by',font=FONTS[24],fill=PALE)
    d.text((1375,848),'Shivam Gupta',font=BOLD[34],fill=WHITE)
    return image

caption_starts=[cue['start'] for cue in captions]
cached_capture=None
cached_meta=None
cached_scene=None

def render(time):
    global cached_capture,cached_meta,cached_scene
    segment = next((s for s in segments if s['start']<=time<s['end']),segments[-1])
    elapsed = min(segment['duration'],time-segment['start'])
    if segment.get('closing') and elapsed > segment.get('closing_after',4):
        image=closing_card().copy()
    else:
        shot, local_time, length=selected_shot(segment,elapsed)
        captured=screen(shot,local_time,length)
        meta=(segment['number'],segment['title'],segment['detail'],shot.get('label','Public Firebase app'))
        if captured is not cached_capture or meta!=cached_meta:
            base=Image.new('RGB',(W,H),NAVY)
            d=ImageDraw.Draw(base)
            d.text((48,28),'kindhandoff',font=BOLD[34],fill=WHITE)
            d.text((50,73),'kindhandoff.web.app',font=FONTS[18],fill=PALE)
            d.text((855,39),'FICTIONAL HOUSEHOLD  |  AI-GENERATED NARRATION',font=FONTS[18],fill=PALE)
            d.rounded_rectangle((47,105,1461,958),20,fill='#edf2f8')
            x=60+(1388-captured.width)//2
            y=120+(822-captured.height)//2
            base.paste(captured,(x,y))
            d.text((1510,119),segment['number'],font=BOLD[20],fill=BLUE)
            yy=draw_lines(d,segment['title'],1504,182,354,BOLD[42],WHITE,13)
            yy=draw_lines(d,segment['detail'],1508,yy+37,350,FONTS[24],PALE,11)
            if yy>775:
                raise ValueError(f'Sidebar copy exceeds its layout: {segment["id"]}')
            d.line((1510,790,1850,790),fill='#38516e',width=2)
            d.text((1510,816),'ACTUAL BROWSER CAPTURE',font=FONTS[18],fill=BLUE)
            bottom=draw_lines(d,meta[3],1510,854,350,FONTS[22],PALE,9)
            if bottom>965:
                raise ValueError(f'Shot label exceeds its layout: {shot["name"]}')
            cached_capture,cached_meta,cached_scene=captured,meta,base
        image=cached_scene.copy()
    d=ImageDraw.Draw(image)
    d.rectangle((0,965,W,H),fill='#0b192b')
    cue=captions[max(0,bisect_right(caption_starts,time)-1)]
    if cue['start']<=time<=cue['end']:
        y=977 if len(cue['lines'])==2 else 998
        for line in cue['lines']:
            d.text(((W-FONTS[34].getlength(line))/2,y),line,font=FONTS[34],fill=WHITE,anchor='lt')
            y+=41
    d.rectangle((0,H-4,round(W*min(1,time/clock)),H),fill='#7da9ff')
    return image

if '--preview' in sys.argv:
    for i,s in enumerate(segments): render((s['start']+s['end'])/2).save(WORK/f'preview-{i+1:02}.png')
    for i,s in enumerate(segments):
        total=sum(shot.get('weight',1) for shot in s['shots'])
        offset=0
        for j,shot in enumerate(s['shots']):
            length=s['duration']*shot.get('weight',1)/total
            moment=s['start']+offset+length/2
            if not s.get('closing') or moment-s['start']<=s.get('closing_after',4):
                render(moment).save(WORK/f'preview-shot-{i+1:02}-{j+1:02}-{shot["name"]}.png')
            offset+=length
    render(clock-2).save(WORK/'preview-closing.png')
    print(json.dumps({'duration':clock,'captions':len(captions),'segments':[{k:s[k] for k in ['id','start','end']} for s in segments]},indent=2))
    sys.exit()

video=WORK/'demo-silent.mp4'
cmd=[FFMPEG,'-y','-hide_banner','-loglevel','error','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-an','-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p',str(video)]
encoder=subprocess.Popen(cmd,stdin=subprocess.PIPE)
try:
    for frame in range(math.ceil(clock*FPS)):
        encoder.stdin.write(render(frame/FPS).tobytes())
        if frame%(FPS*20)==0: print(f'Rendered {frame/FPS:.0f}/{clock:.0f}s',flush=True)
finally: encoder.stdin.close()
if encoder.wait()!=0: raise RuntimeError('Video encoder failed')
inputs=[]
filters=[]
for i,s in enumerate(segments):
    inputs+=['-i',s['audio']]
    delay=round(s['speech_start']*1000)
    filters.append(f'[{i+1}:a]atempo={SPEED},adelay={delay}:all=1[a{i}]')
filters.append(''.join(f'[a{i}]' for i in range(len(segments)))+f'amix=inputs={len(segments)}:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=9,apad=whole_dur={clock}[mix]')
subprocess.run([FFMPEG,'-y','-hide_banner','-loglevel','error','-i',str(video),*inputs,'-filter_complex',';'.join(filters),'-map','0:v','-map','[mix]','-c:v','copy','-c:a','aac','-b:a','192k','-t',str(clock),'-movflags','+faststart','-metadata','title=KindHandoff: One Cancellation, Two Commitments','-metadata','artist=Shivam Gupta','-metadata','comment=Actual product captures; fictional household; AI-generated OpenAI narration.',str(OUT/'KindHandoff-Demo.mp4')],check=True)
(WORK/'edit-result.json').write_text(json.dumps({'duration':clock,'fps':FPS,'size':[W,H],'captions':len(captions),'narration_model':'gpt-4o-mini-tts','voice':'cedar','segments':segments},indent=2)+'\n')
print(f'Created {OUT/"KindHandoff-Demo.mp4"}: {clock:.2f}s, {len(captions)} captions.')
