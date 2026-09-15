# Demo video renderer

`render-demo.py` combines actual browser captures, approved narration, and word-aligned captions into a 1920 × 1080, 24 fps MP4. It does not operate the app or invent product frames. The video visibly identifies the fictional household and AI-generated narration, including on the closing card.

## Dependencies

- Python 3.9 or newer.
- Pillow, installed with the requirements file below.
- FFmpeg and FFprobe on `PATH`. Set `FFMPEG` and `FFPROBE` to absolute executable paths if needed. The FFmpeg build must include the `libx264` encoder and AAC support.
- A regular and bold TrueType font pair. For repeatable typography, use `NotoSans-Regular.ttf` and `NotoSans-Bold.ttf`, and set `VIDEO_FONT_DIR` to their directory. Alternatively set both `VIDEO_FONT_REGULAR` and `VIDEO_FONT_BOLD` to exact font paths. The script can also discover Noto Sans, DejaVu Sans, or Arial in common system locations. Font substitution changes line wrapping, so inspect previews on each machine.

Run these commands from the repository root:

```sh
python3 -m venv .venv-video
.venv-video/bin/python -m pip install -r docs/video-source/requirements.txt
ffmpeg -version
ffprobe -version
```

On Windows, use `.venv-video\Scripts\python.exe` in place of `.venv-video/bin/python`.

## Required inputs

The renderer intentionally fails if any source input is absent. Supply the genuine inputs before rendering:

| Path | Contents |
| --- | --- |
| `work/video/audio/manifest.json` | Ordered `segments` with `id`, `file`, approved `text`, and `transcript.words` containing `word`, `start`, and `end` in seconds. |
| `work/video/audio/<file>` | The corresponding narration audio. |
| `docs/deliverables/Captions-source.json` | Matching segment IDs and ordered `cues`, each with `text`. Cue words must cover the approved narration. |
| `docs/video-source/edit.json` | The editorial plan described below, based on captured product behavior. |
| `work/video/captures/<shot>/frames.json` | A nonempty array ordered by capture time, each entry containing `timestamp` in seconds and `file`, relative to this shot directory. |
| `work/video/captures/<shot>/<file>` | The unmodified browser capture files referenced in the frame index. |

`edit.json` contains an ordered `segments` array. Each segment must have the same `id` as its narration and captions, a display `number`, `title`, `detail`, and a nonempty `shots` array. Each shot names an existing capture directory with `name`; optional `label`, positive `weight`, `lead` in seconds, and `crop` as `[left, top, right, bottom]` control presentation. Optional `frame` selects a zero-based index in that shot's genuine frame list for an editorial still. Optional segment fields are `min_duration` in seconds, `closing: true`, and `closing_after` in seconds. Do not add fabricated captures to fill missing shots.

The renderer preserves action order within motion captures. It proportionally scales frames, optionally crops to the declared rectangle, fits longer capture sequences into the assigned shot duration, and holds a declared or final genuine frame when needed. Crops are checked against source bounds. Narration plays at 0.9× speed. The script stops if the resulting video would reach three minutes or the transcription diverges substantially from the approved script.

## Preview, inspect, then render

```sh
.venv-video/bin/python docs/video-source/render-demo.py --preview
```

Inspect every `work/video/preview-*.png`, especially captions, long panel titles, mobile captures, and the closing disclosure. Previews include segment midpoints, individual shots, and the closing card. Preview generation also creates aligned SRT/VTT files and prints the planned duration. It does not encode a video.

After confirming the capture selection and previews:

```sh
.venv-video/bin/python docs/video-source/render-demo.py
```

Outputs:

- `docs/deliverables/KindHandoff-Demo.mp4`
- `docs/deliverables/KindHandoff-Captions.srt`
- `docs/deliverables/KindHandoff-Captions.vtt`
- `work/video/edit-result.json` with timing and source-shot references.

Watch the full final video with sound. Check transitions against narration, verify every action really appears in the captured product, confirm caption legibility, and confirm the exported duration remains under three minutes. Uploading or publishing the finished video is a separate step.
