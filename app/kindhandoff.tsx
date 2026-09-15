'use client';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type SubmitEvent,
} from 'react';
import {
  ArrowUpRight,
  AudioLines,
  CircleCheck,
  Plus,
  Sprout,
  ShieldCheck,
  Headphones,
  Handshake,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Check,
  Clock3,
  Link2,
  Copy,
  Download,
  KeyRound,
  LogOut,
  Send,
  Mic,
  MicOff,
  Volume2,
  X,
  ChevronRight,
  Users,
  Activity,
  Settings2,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { callMcp, type Trace } from '@/lib/mcp-client';
import type { Member, Plan, Snapshot } from '@/lib/domain/types';
import type { ToolName } from '@/lib/server/tools';
import {
  api,
  isRecord,
  type ApiResponses,
  type Invitation,
  type McpToken,
} from '@/lib/api-client';
import {
  browserModelContext,
  speechConstructor,
  type SpeechRecognitionInput,
} from '@/lib/browser-api';
import { brief, readiness, assess } from '@/lib/domain/engine';
import { interpret, type Intent } from '@/lib/domain/language';
const statuses = {
  open: 'Needs a helper',
  blocked: 'Needs a new handoff',
  offered: 'Awaiting acceptance',
  accepted: 'Accepted',
  done: 'Done',
};
const caps = {
  home_access: 'Can access the home',
  driving: 'Can drive',
  company: 'Companionship',
};
const stamp = (date: string, tz: string) =>
  new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: tz,
  }).format(new Date(date));
const datedStamp = (date: string, tz: string) =>
  new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: tz,
  }).format(new Date(date));
const datetime = (date: string) => {
  const d = new Date(date);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};
const textField = (value: FormDataEntryValue | null) =>
  typeof value === 'string' ? value : '';
const iso = (value: FormDataEntryValue | null) =>
  new Date(textField(value)).toISOString();
function Choice({
  id,
  name,
  value,
  defaultValue,
  options,
  onChange,
  label,
}: {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  options: { value: string; label: string }[];
  onChange?: (value: string) => void;
  label: string;
}) {
  return (
    <Select
      name={name}
      value={value}
      defaultValue={defaultValue}
      onValueChange={(v) => v && onChange?.(v)}
    >
      <SelectTrigger id={id} aria-label={label} className="choice">
        <SelectValue>
          {(v) => options.find((o) => o.value === v)?.label ?? 'Choose…'}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
function CapabilityFields({ defaults = [] }: { defaults?: readonly string[] }) {
  return (
    <fieldset>
      <legend>What’s needed</legend>
      <div className="check-options">
        {Object.entries(caps).map(([value, label]) => (
          <label className="check-label" key={value}>
            <Checkbox
              name="capabilities"
              value={value}
              defaultChecked={defaults.includes(value)}
            />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
function Avatar({ m, tiny = false }: { m: Member; tiny?: boolean }) {
  return (
    <span className={`avatar ${tiny ? 'tiny' : ''} ${m.color}`}>
      {m.name[0]}
    </span>
  );
}
export default function KindHandoff() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState('today');
  const [modal, setModal] = useState<string | null>(null);
  const [modalMember, setModalMember] = useState<string>('');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [utterance, setUtterance] = useState('');
  const [reply, setReply] = useState('');
  const [pending, setPending] = useState<Extract<
    Intent,
    { kind: 'unavailable' }
  > | null>(null);
  const [pendingNote, setPendingNote] = useState('');
  const [plan, setPlan] = useState<Plan | null>(null);
  const [traces, setTraces] = useState<Trace[]>([]);
  const [invite, setInvite] = useState<Invitation | null>(null);
  const [token, setToken] = useState<McpToken | null>(null);
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognition = useRef<SpeechRecognitionInput | null>(null);
  const booted = useRef(false);
  const [initialTime] = useState(() => Date.now());
  const c = snapshot?.circle;
  const actor = c?.members.find((m) => m.id === snapshot?.memberId);
  const isOwner = actor?.role === 'owner';
  const detail = c?.tasks.find((t) => t.id === detailId);
  const demoRole = snapshot?.kind === 'demo' ? snapshot.memberId : undefined;
  const addTrace = useCallback(
    (t: Trace) => setTraces((x) => [t, ...x].slice(0, 30)),
    [],
  );
  const load = useCallback(async () => {
    const s = await api('/api/session');
    if (s.circle)
      setSnapshot((old) => ({
        ...s,
        memberId:
          old?.kind === 'demo' && s.kind === 'demo' ? old.memberId : s.memberId,
      }));
    return s;
  }, []);
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    void (async () => {
      try {
        let s = await api('/api/session');
        if (!s.circle) s = await api('/api/session', 'POST', { mode: 'demo' });
        if (!s.circle) throw new Error('Unable to open your circle.');
        setSnapshot(s);
        setVoiceSupported(!!speechConstructor());
        if (
          s.signedIn &&
          s.circle.demo &&
          new URLSearchParams(window.location.search).get('setup') === '1'
        ) {
          setModal('create');
          history.replaceState(null, '', '/');
        }
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
    return () => recognition.current?.abort();
  }, []);
  const hasSnapshot = snapshot !== null;
  useEffect(() => {
    if (!hasSnapshot) return;
    const refreshVisible = () => {
      if (document.visibilityState === 'visible') void load().catch(() => {});
    };
    const timer = setInterval(refreshVisible, 12000);
    window.addEventListener('focus', refreshVisible);
    document.addEventListener('visibilitychange', refreshVisible);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', refreshVisible);
      document.removeEventListener('visibilitychange', refreshVisible);
    };
  }, [hasSnapshot, load]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 6500);
    return () => clearTimeout(timer);
  }, [notice]);
  async function call<N extends ToolName>(
    name: N,
    args: Record<string, unknown> = {},
    write = false,
  ) {
    if (!snapshot) return null;
    setBusy(true);
    setError('');
    try {
      const result = await callMcp(
        name,
        write
          ? {
              ...args,
              expectedVersion: snapshot.circle.version,
              requestId: crypto.randomUUID(),
            }
          : args,
        demoRole,
        addTrace,
      );
      if ('circle' in result)
        setSnapshot((s) => (s ? { ...s, circle: result.circle } : s));
      if ('message' in result) setNotice(result.message);
      return result;
    } catch (e) {
      setError((e as Error).message);
      await load().catch(() => {});
      return null;
    } finally {
      setBusy(false);
    }
  }
  async function recover() {
    const result = await call('preview_recovery');
    if (result) {
      setPlan(result.plan);
      setPending(null);
      setReply(
        result.plan.assignments.length
          ? 'Here’s a feasible way to carry the day forward. These are suggestions until you create the offers and each helper accepts.'
          : result.plan.unresolved.length
            ? 'No feasible replacement yet. Update the circle’s availability or arrange help directly.'
            : 'No unassigned commitments need a new plan. Check the day for any offers still awaiting acceptance.',
      );
    }
    return result?.plan ?? null;
  }
  async function send(text = input) {
    if (!c || !actor || !text.trim()) return;
    setInput('');
    setUtterance(text);
    setPending(null);
    setPendingNote('');
    const intent = interpret(text, c, actor.id);
    if (intent.kind === 'unavailable') {
      setPlan(null);
      setPending(intent);
      setReply(
        'Let’s make sure I understood. Review the person, time, and affected commitments before changing the plan.',
      );
    } else if (intent.kind === 'recovery') await recover();
    else if (intent.kind === 'brief') {
      const result = await call('get_handoff_brief');
      if (result) {
        setReply(result.summary);
        setView('brief');
      }
    } else if (intent.kind === 'note') {
      setPendingNote(intent.text);
      setReply('Review this note before saving it for your circle.');
    } else if (intent.kind === 'help') setReply(intent.message);
  }
  async function confirmDisruption() {
    if (!pending) return;
    const result = await call(
      'report_unavailable',
      {
        memberId: pending.memberId,
        from: pending.from,
        to: pending.to,
        reason: pending.reason,
      },
      true,
    );
    if (result) {
      setPending(null);
      const proposal = await callMcp(
        'preview_recovery',
        {},
        demoRole,
        addTrace,
      ).catch((e) => {
        setError(e.message);
        return null;
      });
      if (proposal) {
        setPlan(proposal.plan);
        setReply(
          'The affected commitments are open again. I checked each helper’s availability, capabilities, and existing commitments. Review the replacement plan below.',
        );
      }
    }
  }
  function startVoice() {
    if (listening) {
      recognition.current?.stop();
      return;
    }
    const Speech = speechConstructor();
    if (!Speech) return;
    const r = new Speech();
    recognition.current = r;
    r.lang = 'en-US';
    r.interimResults = false;
    r.continuous = false;
    r.onstart = () => setListening(true);
    r.onend = () => setListening(false);
    r.onerror = () => {
      setListening(false);
      setError(
        'Microphone input was unavailable. You can type the same request.',
      );
    };
    r.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (!transcript) return;
      setInput(transcript);
      setNotice('Voice captured. Review the words and send when ready.');
    };
    r.start();
  }
  async function actionApi<
    P extends keyof ApiResponses,
    M extends keyof ApiResponses[P],
  >(path: P, method: M, data?: unknown) {
    setBusy(true);
    setError('');
    try {
      return await api(path, method, data);
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  }
  async function formSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (key: string) => textField(f.get(key));
    let result: unknown;
    try {
      if (modal === 'task')
        result = await call(
          'add_commitment',
          {
            title: get('title'),
            details: get('details'),
            start: iso(f.get('start')),
            end: iso(f.get('end')),
            requiredCapabilities: f.getAll('capabilities'),
            dependsOn: get('dependsOn') ? [get('dependsOn')] : [],
          },
          true,
        );
      if (modal === 'helper')
        result = await call(
          'add_helper',
          {
            name: get('name'),
            relation: get('relation'),
            capabilities: f.getAll('capabilities'),
            start: iso(f.get('start')),
            end: iso(f.get('end')),
          },
          true,
        );
      if (modal === 'availability')
        result = await call(
          'set_availability',
          {
            memberId: modalMember,
            canAccept: true,
            start: iso(f.get('start')),
            end: iso(f.get('end')),
            capabilities: f.getAll('capabilities'),
          },
          true,
        );
      if (modal === 'change')
        result = await call(
          'report_unavailable',
          {
            memberId: get('memberId'),
            from: iso(f.get('start')),
            to: iso(f.get('end')),
            reason: get('reason'),
          },
          true,
        );
      if (modal === 'create') {
        const created = await actionApi('/api/session', 'POST', {
          mode: 'create',
          recipient: get('recipient'),
          name: get('name'),
          timeZone: new Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
        result = created;
        if (created) {
          setSnapshot(created);
          setPlan(null);
          setReply('');
        }
      }
      if (modal === 'delete') {
        result = await actionApi('/api/account', 'DELETE', {
          confirmation: get('confirmation'),
        });
        if (result) {
          setSnapshot(null);
          window.location.reload();
        }
      }
      if (result) {
        setModal(null);
        if (modal === 'change') {
          const r = await callMcp('preview_recovery', {}, demoRole, addTrace);
          setPlan(r.plan);
          setReply('The disruption is recorded. Review the proposed handoffs.');
        }
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setNotice('Copied. Share this privately with the intended person.');
    } catch {
      setNotice('Select and copy the link shown below.');
    }
  }
  const webRef = useRef({ call, recover });
  useEffect(() => {
    webRef.current = { call, recover };
  });
  useEffect(() => {
    const context = browserModelContext();
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    for (const tool of [
      {
        name: 'kindhandoff_read_day',
        title: 'Read family plan',
        description:
          'Read the currently authenticated circle through the same live MCP connection as the interface.',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        execute: async (input: unknown) => {
          if (!isRecord(input) || Object.keys(input).length)
            throw new Error('No arguments accepted.');
          return await webRef.current.call('get_day');
        },
      },
      {
        name: 'kindhandoff_preview_recovery',
        title: 'Preview replacement plan',
        description:
          'Check available helpers and display a proposed recovery plan. Does not create offers or confirm coverage.',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        execute: async (input: unknown) => {
          if (!isRecord(input) || Object.keys(input).length)
            throw new Error('No arguments accepted.');
          const plan = await webRef.current.recover();
          if (!plan) throw new Error('Unable to preview the current plan.');
          return { status: 'previewed', plan };
        },
      },
    ])
      Promise.resolve(
        context.registerTool(tool, { signal: lifecycle.signal }),
      ).catch(() => {});
    return () => lifecycle.abort();
  }, []);
  if (!c || !actor)
    return (
      <main className="join-page">
        <div className="join-card">
          <span className="brand-icon">
            <Sprout />
          </span>
          <h1>{loading ? 'Getting the day together…' : 'Let’s reconnect.'}</h1>
          <p>
            {loading
              ? 'Opening your own family demo. No signup needed.'
              : error}
          </p>
          {!loading && (
            <button className="button" onClick={() => window.location.reload()}>
              Try again
            </button>
          )}
        </div>
      </main>
    );
  const ordered = [...c.tasks].sort((a, b) => a.start.localeCompare(b.start));
  const uncovered = c.tasks.filter((t) =>
    ['open', 'blocked', 'offered'].includes(t.status),
  ).length;
  const accepted = c.tasks.filter((t) => t.status === 'accepted').length;
  const completed = c.tasks.filter((t) => t.status === 'done').length;
  const b = brief(c);
  const selectedMember = c.members.find((m) => m.id === modalMember);
  const formStart =
    selectedMember?.availability[0]?.start ??
    ordered.find((t) => t.status !== 'done')?.start ??
    new Date(initialTime).toISOString();
  const formEnd =
    selectedMember?.availability.at(-1)?.end ??
    ordered.at(-1)?.end ??
    new Date(initialTime + 3600000).toISOString();
  return (
    <div className="dw-app">
      <header className="topbar">
        <a className="wordmark" href="/">
          <span className="brand-icon">
            <Sprout size={25} />
          </span>
          kindhandoff
        </a>
        <span className="quiet-label">CARE, CARRIED FORWARD</span>
        <div className="header-actions">
          {snapshot?.signedIn ? (
            <button
              className="account-button"
              onClick={() => (c.demo ? setModal('create') : setView('circle'))}
            >
              My circle <ArrowUpRight size={16} />
            </button>
          ) : (
            <a className="account-button" href="/signin" target="_top">
              Sign in <ArrowUpRight size={16} />
            </a>
          )}
          <button
            className="icon-button"
            aria-label="Refresh circle"
            disabled={busy}
            onClick={() => call('get_day')}
          >
            <RefreshCw size={18} />
          </button>
          <button
            className="icon-button"
            aria-label="Settings"
            onClick={() => setView('settings')}
          >
            <Settings2 size={19} />
          </button>
        </div>
      </header>
      <div className="demo-ribbon">
        <span className="live-dot" />
        {c.demo ? 'Illustrative family demo' : 'Private family circle'}
        <span className="ribbon-detail">
          {c.demo
            ? 'Your changes stay in your own workspace'
            : `Signed in as ${actor.name} · ${c.name}`}
        </span>
        {snapshot?.kind === 'demo' && (
          <div className="role-switch">
            <span>Demo role:</span>
            <Choice
              label="Demo role"
              value={actor.id}
              options={c.members.map((m) => ({ value: m.id, label: m.name }))}
              onChange={(value) => {
                setSnapshot((s) => (s ? { ...s, memberId: value } : s));
                setNotice(
                  `Now viewing the isolated demo as ${c.members.find((m) => m.id === value)?.name}.`,
                );
              }}
            />
          </div>
        )}
      </div>
      <main className="workspace">
        <div className="page-heading">
          <div>
            <p className="eyebrow">
              {ordered[0]
                ? new Intl.DateTimeFormat('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    timeZone: c.timeZone,
                  })
                    .format(new Date(ordered[0].start))
                    .toUpperCase()
                : 'YOUR FAMILY’S PLAN B'}
            </p>
            <h1>
              {c.recipient}’s day<span className="heading-dot">.</span>
            </h1>
            <p className="subheading">
              {uncovered
                ? `${uncovered} handoff${uncovered === 1 ? ' needs' : 's need'} someone to say “I’ve got it.”`
                : 'A little coordination. A lot more peace of mind.'}
            </p>
          </div>
          <div className="circle-preview">
            <div className="avatar-stack">
              {c.members.slice(0, 4).map((m) => (
                <Avatar key={m.id} m={m} />
              ))}
            </div>
            <div>
              <strong>
                One circle. {c.members.length} helping{' '}
                {c.members.length === 1 ? 'hand' : 'hands'}.
              </strong>
              <p>Every handoff has a person behind it.</p>
            </div>
          </div>
        </div>
        {error && (
          <div className="error-banner" role="alert">
            <AlertCircle size={19} />
            <span>{error}</span>
            <button aria-label="Dismiss error" onClick={() => setError('')}>
              <X size={17} />
            </button>
          </div>
        )}
        {notice && (
          <output className="toast">
            <CircleCheck size={19} />
            {notice}
          </output>
        )}
        <Tabs value={view} onValueChange={(v) => setView(String(v))}>
          <div className="nav-row">
            <TabsList variant="line" className="main-tabs">
              <TabsTrigger value="today">The day</TabsTrigger>
              <TabsTrigger value="brief">Handoff brief</TabsTrigger>
              <TabsTrigger value="circle">Your circle</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="settings" className="settings-tab">
                Settings
              </TabsTrigger>
            </TabsList>
            {isOwner && (
              <button
                className="button small secondary"
                onClick={() => setModal('task')}
              >
                <Plus size={16} /> Add a commitment
              </button>
            )}
          </div>
          <div className="work-grid">
            <section className="main-surface">
              <TabsContent value="today">
                {c.tasks.some(
                  (t) =>
                    t.status === 'offered' && t.proposedAssigneeId === actor.id,
                ) && (
                  <section
                    className="helper-inbox"
                    aria-label="Your pending handoffs"
                  >
                    <p className="eyebrow">
                      FOR YOU, {actor.name.toUpperCase()}
                    </p>
                    <h2>A hand with {c.recipient}’s day?</h2>
                    {c.tasks
                      .filter(
                        (t) =>
                          t.status === 'offered' &&
                          t.proposedAssigneeId === actor.id,
                      )
                      .map((t) => (
                        <article key={t.id}>
                          <h3>{t.title}</h3>
                          <p>
                            {new Intl.DateTimeFormat('en-US', {
                              dateStyle: 'full',
                              timeZone: c.timeZone,
                            }).format(new Date(t.start))}
                            <br />
                            {stamp(t.start, c.timeZone)}–
                            {stamp(t.end, c.timeZone)} · {c.timeZone}
                          </p>
                          <p>{t.details}</p>
                          {t.dependsOn.length > 0 && (
                            <p className="dependency">
                              <Handshake size={15} />
                              Depends on{' '}
                              {t.dependsOn
                                .map(
                                  (id) =>
                                    c.tasks.find((x) => x.id === id)?.title,
                                )
                                .join(', ')}
                            </p>
                          )}
                          <div className="task-actions">
                            <button
                              className="button"
                              disabled={busy}
                              onClick={() =>
                                call(
                                  'respond_to_handoff',
                                  { taskId: t.id, response: 'accept' },
                                  true,
                                )
                              }
                            >
                              <Check size={16} />I can do this
                            </button>
                            <button
                              className="button secondary"
                              disabled={busy}
                              onClick={() =>
                                call(
                                  'respond_to_handoff',
                                  { taskId: t.id, response: 'decline' },
                                  true,
                                )
                              }
                            >
                              I can’t
                            </button>
                          </div>
                        </article>
                      ))}
                  </section>
                )}

                <div
                  className={`status-strip ${uncovered ? 'needs-attention' : ''}`}
                >
                  <div>
                    <span className="stat-number">
                      {String(completed + accepted).padStart(2, '0')}
                    </span>
                    <span>accepted or done</span>
                  </div>
                  <div>
                    <span
                      className={`stat-number ${uncovered ? 'amber' : 'blue'}`}
                    >
                      {String(uncovered).padStart(2, '0')}
                    </span>
                    <span>still need acceptance</span>
                  </div>
                  <ShieldCheck size={26} />
                </div>
                <div className="section-heading">
                  <h2>The day, together</h2>
                  <span className="chip subtle">
                    {c.timeZone.replace('_', ' ')}
                  </span>
                </div>
                {ordered.length === 0 ? (
                  <div className="empty-state">
                    <Sprout size={30} />
                    <h2>A fresh start for your circle.</h2>
                    <p>
                      Add a ride, a visit, or a little company. Then invite
                      someone to carry it with you.
                    </p>
                    <button className="button" onClick={() => setModal('task')}>
                      <Plus size={17} />
                      Add the first commitment
                    </button>
                  </div>
                ) : (
                  <div className="timeline">
                    {ordered.map((t) => {
                      const person = c.members.find(
                        (m) => m.id === (t.assigneeId ?? t.proposedAssigneeId),
                      );
                      const ready = readiness(c, t);
                      return (
                        <div className="timeline-row" key={t.id}>
                          <div className="time-label">
                            {stamp(t.start, c.timeZone)}
                            <span>
                              {new Intl.DateTimeFormat('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                timeZone: c.timeZone,
                              }).format(new Date(t.start))}
                            </span>
                          </div>
                          <div
                            className={`timeline-node ${t.status === 'blocked' ? 'node-alert' : ''}`}
                          >
                            {t.status === 'done' ? (
                              <CircleCheck size={19} />
                            ) : (
                              <span />
                            )}
                          </div>
                          <article className={`task-card task-${t.status}`}>
                            <div className="task-card-top">
                              <button
                                className="task-title"
                                onClick={() => setDetailId(t.id)}
                              >
                                <h3>{t.title}</h3>
                              </button>
                              <span
                                className={`chip ${t.status === 'done' ? 'green' : t.status === 'accepted' ? 'blue-chip' : 'amber-chip'}`}
                              >
                                {statuses[t.status]}
                              </span>
                            </div>
                            <p>{t.details}</p>
                            <div className="task-card-bottom">
                              {person ? (
                                <span className="person">
                                  <Avatar m={person} tiny />
                                  {person.name}
                                  {t.status === 'offered' && (
                                    <span className="source-label">
                                      {' '}
                                      · asked
                                    </span>
                                  )}
                                </span>
                              ) : (
                                <span className="person unassigned">
                                  <Users size={17} /> Not assigned
                                </span>
                              )}
                              {t.dependsOn.length > 0 ? (
                                <span
                                  className={`dependency ${ready.waiting.length ? '' : 'dependency-done'}`}
                                >
                                  <Handshake size={15} />
                                  {ready.waiting.length
                                    ? 'Waiting for ' +
                                      c.tasks.find(
                                        (x) => x.id === ready.waiting[0],
                                      )?.title
                                    : 'Earlier handoff complete'}
                                </span>
                              ) : (
                                <span className="source-label">
                                  {t.status === 'done'
                                    ? 'Completion recorded'
                                    : t.status === 'offered'
                                      ? 'A request is not coverage'
                                      : 'View details →'}
                                </span>
                              )}
                            </div>
                            {t.status === 'accepted' &&
                              (isOwner || t.assigneeId === actor.id) && (
                                <div className="task-actions">
                                  <button
                                    disabled={busy || !!ready.waiting.length}
                                    className="text-button"
                                    onClick={() =>
                                      call(
                                        'complete_commitment',
                                        { taskId: t.id },
                                        true,
                                      )
                                    }
                                  >
                                    <CircleCheck size={16} />
                                    Mark complete
                                  </button>
                                  <button
                                    className="text-button muted"
                                    onClick={() => {
                                      setModalMember(t.assigneeId!);
                                      setModal('change');
                                    }}
                                  >
                                    Report a change
                                  </button>
                                </div>
                              )}
                          </article>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="principle-note">
                  <ShieldCheck size={20} />
                  <p>
                    <strong>A promise has two sides.</strong> An offer stays
                    open until the next person accepts. An accepted ride can
                    still be waiting for the bag.
                  </p>
                </div>
              </TabsContent>
              <TabsContent value="brief">
                <div className="brief-card">
                  <div className="section-heading">
                    <div>
                      <p className="eyebrow">CARRY THE CONTEXT</p>
                      <h2>For the next pair of hands.</h2>
                    </div>
                    <span className="chip blue-chip">Revision {b.version}</span>
                  </div>
                  <p className="brief-summary">{b.summary}</p>
                  {b.unclaimed.length > 0 && (
                    <div className="brief-block">
                      <h3>Still needs a yes</h3>
                      {b.unclaimed.map((t) => (
                        <p key={t.id}>
                          <span className="status-dot amber-bg" />
                          {t.title}{' '}
                          {t.proposedTo
                            ? `— waiting for ${t.proposedTo}`
                            : '— no helper yet'}
                        </p>
                      ))}
                    </div>
                  )}
                  <div className="brief-block">
                    <h3>Who’s carrying what</h3>
                    {b.accepted.length ? (
                      b.accepted.map((t) => (
                        <div className="brief-assignment" key={t.id}>
                          <span>{stamp(t.start, c.timeZone)}</span>
                          <p>
                            <strong>{t.person}</strong> · {t.title}
                            {t.waiting.length > 0 && (
                              <small>
                                Waiting for{' '}
                                {t.waiting
                                  .map(
                                    (id) =>
                                      c.tasks.find((x) => x.id === id)?.title,
                                  )
                                  .join(', ')}
                              </small>
                            )}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p>No upcoming accepted commitments.</p>
                    )}
                  </div>
                  <div className="brief-block">
                    <h3>From your circle</h3>
                    {b.notes.length ? (
                      b.notes.map((n) => (
                        <blockquote key={n.id}>
                          <p>“{n.text}”</p>
                          <cite>
                            {c.members.find((m) => m.id === n.actorId)?.name} ·{' '}
                            {stamp(n.at, c.timeZone)} ·{' '}
                            {n.id === 'welcome'
                              ? 'Illustrative note'
                              : 'Recorded note'}
                          </cite>
                        </blockquote>
                      ))
                    ) : (
                      <p>No notes yet.</p>
                    )}
                  </div>
                  <button
                    disabled={busy}
                    className="button"
                    onClick={() =>
                      call(
                        'acknowledge_brief',
                        { briefVersion: b.version },
                        true,
                      )
                    }
                  >
                    <Check size={17} /> I’ve read this handoff
                  </button>
                  {c.acknowledgments.map((a) => (
                    <p className="read-receipt" key={a.memberId}>
                      {c.members.find((m) => m.id === a.memberId)?.name} read
                      revision {a.version} at {stamp(a.at, c.timeZone)}.{' '}
                      {a.version < b.version
                        ? 'New updates to read.'
                        : 'Up to date.'}
                    </p>
                  ))}
                </div>
                <form
                  className="note-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    const form = e.currentTarget;
                    const r = await call(
                      'add_note',
                      { text: textField(f.get('note')) },
                      true,
                    );
                    if (r) form.reset();
                  }}
                >
                  <label htmlFor="note">Leave the next helper a note</label>
                  <textarea
                    id="note"
                    name="note"
                    required
                    maxLength={1200}
                    placeholder="The little detail that makes their day easier…"
                  />
                  <button
                    disabled={busy}
                    className="button small secondary"
                    type="submit"
                  >
                    Save note <ArrowRight size={16} />
                  </button>
                </form>
              </TabsContent>
              <TabsContent value="circle">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">YOUR PEOPLE</p>
                    <h2>Different hands. One shared day.</h2>
                  </div>
                  {isOwner && (
                    <button
                      className="button small secondary"
                      onClick={() => setModal('helper')}
                    >
                      <Plus size={16} /> Add helper
                    </button>
                  )}
                </div>
                <div className="member-list">
                  {c.members.map((m) => (
                    <article className="member-card" key={m.id}>
                      <div className="member-heading">
                        <Avatar m={m} />
                        <div>
                          <h3>{m.name}</h3>
                          <p>{m.relation}</p>
                        </div>
                        <span className="chip subtle">
                          {m.role === 'owner' ? 'Coordinator' : 'Helper'}
                        </span>
                      </div>
                      <div className="member-capabilities">
                        {m.capabilities.map((cap) => (
                          <span className="chip blue-chip" key={cap}>
                            {caps[cap as keyof typeof caps] ?? cap}
                          </span>
                        ))}
                      </div>
                      <p className="availability">
                        <Clock3 size={16} />
                        {m.availability.length
                          ? m.availability
                              .map(
                                (w) =>
                                  `${datedStamp(w.start, c.timeZone)} – ${datedStamp(w.end, c.timeZone)}`,
                              )
                              .join(', ')
                          : 'No availability set'}{' '}
                        <span> · {c.timeZone}</span>
                      </p>
                      <div className="member-actions">
                        {(isOwner || actor.id === m.id) && (
                          <button
                            className="text-button"
                            onClick={() => {
                              setModalMember(m.id);
                              setModal('availability');
                            }}
                          >
                            Edit availability
                          </button>
                        )}
                        {isOwner && m.role === 'helper' && (
                          <>
                            <button
                              className="text-button"
                              disabled={busy}
                              onClick={async () => {
                                const r = await actionApi(
                                  '/api/invite',
                                  'POST',
                                  { memberId: m.id },
                                );
                                if (r) {
                                  setInvite(r);
                                  setModal('invite');
                                }
                              }}
                            >
                              <Link2 size={15} /> Invite
                            </button>
                            <button
                              className="text-button muted"
                              disabled={busy}
                              onClick={() => {
                                setModalMember(m.id);
                                setModal('revoke');
                              }}
                            >
                              Revoke access
                            </button>
                          </>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
                <p className="privacy-note">
                  <ShieldCheck size={18} />
                  Each helper gets a private, single-use invitation. Only that
                  helper can accept their offers. Share invitations directly;
                  the app does not send messages.
                </p>
              </TabsContent>
              <TabsContent value="activity">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">NO GUESSWORK</p>
                    <h2>A record of what really happened.</h2>
                  </div>
                  <button
                    className="icon-button"
                    aria-label="Refresh activity"
                    disabled={busy}
                    onClick={() => call('get_day')}
                  >
                    <RefreshCw size={18} />
                  </button>
                </div>
                <div className="activity-list">
                  {c.events.length ? (
                    [...c.events].reverse().map((e) => (
                      <div className="event" key={e.id}>
                        <div className="event-dot" />
                        <div>
                          <p>{e.detail}</p>
                          <span>
                            {c.members.find((m) => m.id === e.actorId)?.name ??
                              'Circle'}{' '}
                            · {stamp(e.at, c.timeZone)} · Revision {e.version}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="empty-state">
                      <Activity size={28} />
                      <h2>Ready for the first handoff.</h2>
                      <p>
                        Accepted offers, changes, and completion records will
                        appear here with a person and time.
                      </p>
                    </div>
                  )}
                </div>
                <details className="trace-panel">
                  <summary>
                    Live MCP execution trace{' '}
                    <span>{traces.length} calls this session</span>
                  </summary>
                  <p>
                    These entries come from actual server requests. Language
                    interpretation in the free voice desk uses a limited,
                    deterministic grammar.
                  </p>
                  {traces.map((t) => (
                    <div key={t.id} className="trace-row">
                      <span className={t.ok ? 'green-text' : 'amber'}>
                        {t.ok ? '✓' : '×'}
                      </span>
                      <code>{t.tool}</code>
                      <span>{t.duration} ms</span>
                      <small>MCP {t.protocol} · Streamable HTTP</small>
                      {!t.ok && <p>{t.detail}</p>}
                    </div>
                  ))}
                </details>
              </TabsContent>
              <TabsContent value="settings">
                <div className="brief-card">
                  <p className="eyebrow">YOUR CIRCLE, YOUR CHOICE</p>
                  <h2>Privacy & connections</h2>
                  <p className="settings-intro">
                    {c.demo
                      ? 'This isolated workspace contains an illustrative family. Create your own circle to start with a blank plan.'
                      : 'Your circle is stored privately. Only you and helpers with valid invitations can access it.'}
                  </p>
                  {c.demo &&
                    (snapshot?.signedIn ? (
                      <button
                        className="button"
                        onClick={() => setModal('create')}
                      >
                        Create my own circle <ArrowRight size={17} />
                      </button>
                    ) : (
                      <a
                        className="button"
                        target="_top"

                        href="/signin"
                      >
                        Sign in to create a circle <ArrowRight size={17} />
                      </a>
                    ))}
                  <div className="settings-block">
                    <h3>Take your data with you</h3>
                    <p>
                      Export commitments, helper details, source notes, and the
                      latest 250 activity records as JSON.
                    </p>
                    {isOwner && (
                      <a
                        href="/api/export"
                        className="button secondary small"
                        download
                      >
                        <Download size={16} /> Export circle
                      </a>
                    )}
                  </div>
                  {isOwner && (
                    <div className="settings-block">
                      <h3>Connect an MCP client</h3>
                      <p>
                        Generate a coordinator token for an MCP client. It
                        expires within 24 hours. Keep it private. The web voice
                        desk is an Alexa+ simulation; native Alexa onboarding is
                        separate.
                      </p>
                      <button
                        disabled={busy}
                        className="button secondary small"
                        onClick={async () => {
                          const r = await actionApi('/api/token', 'POST');
                          if (r) {
                            setToken(r);
                            setModal('token');
                          }
                        }}
                      >
                        <KeyRound size={16} /> Generate MCP token
                      </button>
                      <button
                        disabled={busy}
                        className="text-button muted"
                        onClick={async () => {
                          const r = await actionApi('/api/token', 'DELETE');
                          if (r) setNotice('MCP tokens revoked.');
                        }}
                      >
                        Revoke tokens
                      </button>
                    </div>
                  )}
                  <div className="settings-block">
                    <h3>Practical support, with clear boundaries</h3>
                    <p>
                      KindHandoff helps with rides, visits, meals, and everyday
                      coordination. It does not provide clinical care or
                      emergency monitoring. Availability is stated by helpers; a
                      green status records acceptance, not a guarantee.
                    </p>
                    <p>
                      Voice input starts only when you press the microphone.
                      Your browser may process speech through its provider.
                      KindHandoff stores confirmed text notes and changes, not
                      microphone audio.
                    </p>
                    <p>
                      Demo circles expire after 24 hours; personal-circle helper
                      sessions after 7 days. Notes retain the latest 100
                      entries. Read receipts refer to a specific revision.
                    </p>
                  </div>
                  <div className="settings-actions">
                    {snapshot?.kind === 'demo' && (
                      <button
                        className="button secondary small"
                        disabled={busy}
                        onClick={async () => {
                          const r = await actionApi('/api/session', 'POST', {
                            mode: 'demo',
                          });
                          if (r) {
                            setSnapshot(r);
                            setPlan(null);
                            setReply('');
                            setTraces([]);
                            setView('today');
                            setNotice('A fresh isolated demo is ready.');
                          }
                        }}
                      >
                        <RefreshCw size={16} /> Reset demo
                      </button>
                    )}
                    <button
                      className="button secondary small"
                      disabled={busy}
                      onClick={async () => {
                        const r = await actionApi('/api/session', 'DELETE');
                        if (r) window.location.assign('/');
                      }}
                    >
                      <LogOut size={16} /> Sign out
                    </button>
                    {isOwner && (
                      <button
                        className="text-button danger"
                        onClick={() => setModal('delete')}
                      >
                        Delete this circle
                      </button>
                    )}
                  </div>
                </div>
              </TabsContent>
            </section>
            <aside className="voice-panel">
              <div className="voice-top">
                <span className="eyebrow">THE VOICE DESK</span>
                <span className="chip voice-chip">Alexa+ simulation</span>
              </div>
              <div className={`voice-orb ${busy ? 'working' : ''}`}>
                <AudioLines size={42} strokeWidth={1.4} />
              </div>
              <h2>
                {reply ? (
                  'Let’s carry it forward.'
                ) : (
                  <>
                    Plans change.
                    <br />
                    Care continues.
                  </>
                )}
              </h2>
              {!reply ? (
                <>
                  <p className="voice-intro">
                    Say what changed. We’ll check who can help, then keep every
                    handoff open until someone accepts.
                  </p>
                  <button
                    className="suggestion"
                    disabled={busy}
                    onClick={() => send('I can’t make it this afternoon.')}
                  >
                    <span>“I can’t make it this afternoon.”</span>
                    <ArrowUpRight size={20} />
                  </button>
                  <button
                    className="suggestion"
                    disabled={busy}
                    onClick={() => send('What should the next helper know?')}
                  >
                    <span>“What should the next helper know?”</span>
                    <ArrowUpRight size={20} />
                  </button>
                </>
              ) : (
                <div className="voice-conversation" aria-live="polite">
                  {utterance && <p className="utterance">“{utterance}”</p>}
                  <p className="reply">{reply}</p>
                  <button
                    aria-label="Read response aloud"
                    className="speak-button"
                    onClick={() => {
                      window.speechSynthesis?.cancel();
                      window.speechSynthesis?.speak(
                        new SpeechSynthesisUtterance(reply),
                      );
                    }}
                  >
                    <Volume2 size={16} /> Listen
                  </button>
                </div>
              )}
              {pending && (
                <div className="confirm-card">
                  <p className="eyebrow">REVIEW THE CHANGE</p>
                  <h3>
                    {c.members.find((m) => m.id === pending.memberId)?.name} is
                    unavailable
                  </h3>
                  <p>
                    {stamp(pending.from, c.timeZone)}–
                    {stamp(pending.to, c.timeZone)} · {c.timeZone}
                  </p>
                  <ul>
                    {c.tasks
                      .filter(
                        (t) =>
                          t.assigneeId === pending.memberId &&
                          t.status === 'accepted' &&
                          t.start < pending.to &&
                          pending.from < t.end,
                      )
                      .map((t) => (
                        <li key={t.id}>{t.title}</li>
                      ))}
                  </ul>
                  <button
                    disabled={busy}
                    className="button light"
                    onClick={confirmDisruption}
                  >
                    Confirm change <ArrowRight size={17} />
                  </button>
                  <button
                    className="text-button on-dark"
                    onClick={() => setPending(null)}
                  >
                    Cancel
                  </button>
                </div>
              )}
              {pendingNote && (
                <div className="confirm-card">
                  <p>{pendingNote}</p>
                  <button
                    className="button light"
                    disabled={busy}
                    onClick={async () => {
                      const r = await call(
                        'add_note',
                        { text: pendingNote },
                        true,
                      );
                      if (r) {
                        setPendingNote('');
                        setReply(r.message);
                      }
                    }}
                  >
                    Save this note
                  </button>
                </div>
              )}
              {plan && (
                <div className="plan-card">
                  <div className="plan-label">
                    <span className="eyebrow">A POSSIBLE PLAN B</span>
                    <span>v{plan.basedOnVersion}</span>
                  </div>
                  {plan.assignments.map((a) => (
                    <div className="plan-assignment" key={a.taskId}>
                      <div>
                        <span className="plan-time">
                          {stamp(
                            c.tasks.find((t) => t.id === a.taskId)!.start,
                            c.timeZone,
                          )}
                        </span>
                        <strong>
                          {c.members.find((m) => m.id === a.candidateId)?.name}
                        </strong>
                      </div>
                      <p>{c.tasks.find((t) => t.id === a.taskId)?.title}</p>
                      <small>{a.reason}</small>
                    </div>
                  ))}
                  {plan.searchLimited && (
                    <p className="unresolved-note">
                      Search limit reached. This is a feasible partial plan;
                      other arrangements may exist.
                    </p>
                  )}
                  {plan.unresolved.length > 0 && (
                    <p className="unresolved-note">
                      Still unresolved:{' '}
                      {plan.unresolved
                        .map((id) => c.tasks.find((t) => t.id === id)?.title)
                        .join(', ')}
                      . Arrange help directly or update availability.
                    </p>
                  )}
                  <details className="reasoning">
                    <summary>Why this plan?</summary>
                    {plan.assessments.map((a) => (
                      <div key={a.taskId}>
                        <strong>
                          {c.tasks.find((t) => t.id === a.taskId)?.title}
                        </strong>
                        {a.candidates.map((m) => (
                          <p key={m.candidateId}>
                            <b>
                              {
                                c.members.find((x) => x.id === m.candidateId)
                                  ?.name
                              }
                              :
                            </b>{' '}
                            {m.eligible
                              ? 'Available, capable, no conflict.'
                              : m.reasons
                                  .filter(
                                    (r) =>
                                      ![
                                        'AVAILABLE',
                                        'CAPABLE',
                                        'NO_CONFLICTS',
                                      ].includes(r.code),
                                  )
                                  .map((r) => r.message)
                                  .join(' ')}
                          </p>
                        ))}
                      </div>
                    ))}
                  </details>
                  {isOwner &&
                    plan.assignments.length > 0 &&
                    (plan.basedOnVersion === c.version ? (
                      <button
                        disabled={busy}
                        className="button light"
                        onClick={async () => {
                          const r = await call('propose_recovery', {}, true);
                          if (r) {
                            setPlan(null);
                            setReply(
                              'The offers are ready. The commitments still need each helper’s acceptance. Open their private invitation, or switch roles in this isolated demo, to see their side.',
                            );
                          }
                        }}
                      >
                        Create {plan.assignments.length} handoff offers{' '}
                        <ArrowRight size={17} />
                      </button>
                    ) : (
                      <button
                        className="button light"
                        disabled={busy}
                        onClick={recover}
                      >
                        Plan changed · check again
                      </button>
                    ))}
                  <p className="plan-disclaimer">
                    Suggestions only. No messages are sent.
                  </p>
                </div>
              )}
              <form
                className="voice-input"
                onSubmit={(e) => {
                  e.preventDefault();
                  void send();
                }}
              >
                <input
                  value={input}
                  maxLength={1200}
                  onChange={(e) => setInput(e.target.value)}
                  aria-label="Tell KindHandoff what changed"
                  placeholder="Tell us what changed…"
                />
                {voiceSupported && (
                  <button
                    type="button"
                    aria-label={
                      listening ? 'Stop microphone' : 'Use microphone'
                    }
                    onClick={startVoice}
                  >
                    {listening ? <MicOff size={18} /> : <Mic size={18} />}
                  </button>
                )}
                <button
                  type="submit"
                  disabled={busy || !input.trim()}
                  aria-label="Send message"
                >
                  <Send size={18} />
                </button>
              </form>
              <div className="voice-footer">
                <Headphones size={15} />
                <span>
                  {busy
                    ? 'Checking the real shared plan…'
                    : 'Free language simulator · live MCP tools'}
                </span>
              </div>
              <button
                className="text-button on-dark recovery-link"
                disabled={busy}
                onClick={recover}
              >
                Find a replacement plan <ChevronRight size={16} />
              </button>
            </aside>
          </div>
        </Tabs>
        <footer className="workspace-footer">
          <span>
            <Sprout size={16} /> Small handoffs. A day held together.
          </span>
          <a href="https://github.com/shi1720/Amazon-Developer-Hackathon">
            Created by Shivam Gupta <ArrowUpRight size={14} />
          </a>
        </footer>
      </main>
      <Sheet open={!!detail} onOpenChange={(v) => !v && setDetailId(null)}>
        <SheetContent className="task-sheet">
          {detail && (
            <>
              <p className="eyebrow">A COMMITMENT, CLEARLY</p>
              <SheetTitle>{detail.title}</SheetTitle>
              <SheetDescription>{detail.details}</SheetDescription>
              <span
                className={`chip ${detail.status === 'accepted' ? 'blue-chip' : 'subtle'}`}
              >
                {statuses[detail.status]}
              </span>
              <p>
                {stamp(detail.start, c.timeZone)}–
                {stamp(detail.end, c.timeZone)} · {c.timeZone}
              </p>
              <div className="brief-block">
                <h3>What’s needed</h3>
                <p>
                  {detail.requiredCapabilities
                    .map((k) => caps[k as keyof typeof caps])
                    .join(', ') || 'No special capability stated.'}
                </p>
              </div>
              <div className="brief-block">
                <h3>Source</h3>
                <p>{detail.source}</p>
                <p>Commitment revision {detail.version}</p>
              </div>
              {detail.dependsOn.length > 0 && (
                <div className="brief-block">
                  <h3>Before this can finish</h3>
                  {detail.dependsOn.map((id) => (
                    <p key={id}>
                      {c.tasks.find((t) => t.id === id)?.title} ·{' '}
                      {c.tasks.find((t) => t.id === id)?.status}
                    </p>
                  ))}
                </div>
              )}
              {['open', 'blocked'].includes(detail.status) && isOwner && (
                <div className="offer-options">
                  <h3>Ask a helper</h3>
                  {assess(c, detail).candidates.map((m) => (
                    <div className="candidate-option" key={m.candidateId}>
                      <strong>
                        {c.members.find((x) => x.id === m.candidateId)?.name}
                      </strong>
                      <p>
                        {m.eligible
                          ? 'Available and capable'
                          : m.reasons
                              .filter(
                                (r) =>
                                  ![
                                    'AVAILABLE',
                                    'CAPABLE',
                                    'NO_CONFLICTS',
                                  ].includes(r.code),
                              )
                              .map((r) => r.message)
                              .join(' ')}
                      </p>
                      <button
                        disabled={busy || !m.eligible}
                        className="button small secondary"
                        onClick={() =>
                          call(
                            'offer_commitment',
                            { taskId: detail.id, candidateId: m.candidateId },
                            true,
                          )
                        }
                      >
                        Offer handoff
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {detail.status === 'done' && isOwner && (
                <button
                  disabled={busy}
                  className="button secondary"
                  onClick={() =>
                    call('reopen_commitment', { taskId: detail.id }, true)
                  }
                >
                  Reopen commitment
                </button>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
      <Dialog
        open={!!modal}
        onOpenChange={(v) => {
          if (!v) {
            setModal(null);
            setInvite(null);
            setToken(null);
          }
        }}
      >
        <DialogContent className="app-dialog">
          <DialogHeader>
            <DialogTitle>
              {
                {
                  task: 'Add a commitment',
                  helper: 'Invite a helping hand',
                  availability: `${selectedMember?.name}’s availability`,
                  change: 'Report a change',
                  create: 'A circle of your own',
                  invite: `Invite ${invite?.name}`,
                  token: 'Connect your MCP client',
                  delete: 'Delete this circle',
                  revoke: 'Revoke helper access',
                }[modal ?? '']
              }
            </DialogTitle>
            <DialogDescription>
              {modal === 'invite'
                ? 'This link signs in one helper. Share it privately.'
                : modal === 'token'
                  ? 'Copy this token now. It will not be shown again.'
                  : modal === 'delete'
                    ? 'This permanently removes commitments, notes, invitations, and access. Export your circle first if you need a copy.'
                    : modal === 'revoke'
                      ? 'Existing helper sessions and unused invitations will stop working. Their commitments remain visible.'
                      : 'Clear details make the next handoff easier.'}
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p role="alert" className="error-banner">
              {error}
            </p>
          )}
          {[
            'task',
            'helper',
            'availability',
            'change',
            'create',
            'delete',
          ].includes(modal ?? '') && (
            <form className="app-form" onSubmit={formSubmit}>
              {modal === 'task' && (
                <>
                  <label>
                    Commitment
                    <input
                      name="title"
                      maxLength={120}
                      required
                      placeholder="A ride to book club"
                    />
                  </label>
                  <label>
                    The details
                    <textarea
                      name="details"
                      maxLength={800}
                      placeholder="What should the helper know?"
                    />
                  </label>
                </>
              )}
              {modal === 'helper' && (
                <>
                  <label>
                    Helper’s name
                    <input
                      name="name"
                      maxLength={80}
                      required
                      placeholder="Dev"
                    />
                  </label>
                  <label>
                    Relationship
                    <input
                      name="relation"
                      maxLength={100}
                      placeholder="Son, neighbour, friend…"
                    />
                  </label>
                </>
              )}
              {modal === 'change' && (
                <>
                  <label htmlFor="unavailable-member">
                    Who is unavailable?
                    <Choice
                      id="unavailable-member"
                      name="memberId"
                      label="Unavailable helper"
                      defaultValue={modalMember || actor.id}
                      options={c.members
                        .filter((m) => isOwner || m.id === actor.id)
                        .map((m) => ({ value: m.id, label: m.name }))}
                    />
                  </label>
                  <label>
                    What changed?
                    <textarea
                      name="reason"
                      required
                      maxLength={500}
                      placeholder="A change of shift. Please help cover the afternoon."
                    />
                  </label>
                </>
              )}
              {['task', 'helper', 'availability', 'change'].includes(
                modal ?? '',
              ) && (
                <>
                  <div className="form-row">
                    <label>
                      From
                      <input
                        type="datetime-local"
                        name="start"
                        defaultValue={datetime(formStart)}
                        required
                      />
                    </label>
                    <label>
                      Until
                      <input
                        type="datetime-local"
                        name="end"
                        defaultValue={datetime(formEnd)}
                        required
                      />
                    </label>
                  </div>
                  <p className="form-hint">
                    Enter times in your device time zone:{' '}
                    {new Intl.DateTimeFormat().resolvedOptions().timeZone}. The
                    day displays {c.timeZone}.
                  </p>
                </>
              )}
              {['task', 'helper', 'availability'].includes(modal ?? '') && (
                <CapabilityFields
                  defaults={
                    modal === 'availability' ? selectedMember?.capabilities : []
                  }
                />
              )}
              {modal === 'task' && (
                <label htmlFor="commitment-dependency">
                  Depends on
                  <Choice
                    id="commitment-dependency"
                    name="dependsOn"
                    label="Earlier commitment"
                    defaultValue=""
                    options={[
                      { value: '', label: 'No earlier commitment' },
                      ...c.tasks.map((t) => ({ value: t.id, label: t.title })),
                    ]}
                  />
                </label>
              )}
              {modal === 'create' && (
                <>
                  <label>
                    Your name
                    <input
                      name="name"
                      maxLength={80}
                      required
                      placeholder="Shivam"
                    />
                  </label>
                  <label>
                    Who is this circle for?
                    <input
                      name="recipient"
                      maxLength={80}
                      required
                      placeholder="A parent, friend, or family member"
                    />
                  </label>
                  <p className="form-hint">
                    Starts with a blank plan. Your signed-in account is the
                    coordinator. One personal circle per account.
                  </p>
                </>
              )}
              {modal === 'delete' && (
                <label>
                  Type DELETE to confirm
                  <input
                    name="confirmation"
                    required
                    pattern="DELETE"
                    autoComplete="off"
                  />
                </label>
              )}
              <button
                disabled={busy}
                type="submit"
                className={`button ${modal === 'delete' ? 'danger-button' : ''}`}
              >
                {modal === 'change'
                  ? 'Confirm change'
                  : modal === 'create'
                    ? 'Create my circle'
                    : modal === 'delete'
                      ? 'Permanently delete circle'
                      : 'Save'}
                <ArrowRight size={17} />
              </button>
            </form>
          )}
          {modal === 'invite' && invite && (
            <div className="share-result">
              <p>
                Anyone with this unused link can join as{' '}
                <strong>{invite.name}</strong>. It expires on{' '}
                {datedStamp(invite.expiresAt, c.timeZone)} ({c.timeZone}) and
                can only be used once.
              </p>
              <textarea
                readOnly
                value={invite.url}
                aria-label="Private invitation link"
              />
              <button
                className="button secondary"
                onClick={() =>
                  copy(
                    `Hi ${invite.name}, could you help with ${c.recipient}’s day? Please open your private KindHandoff invitation, review the requested handoff, and accept only if you can do it. ${invite.url}`,
                  )
                }
              >
                <Copy size={17} />
                Copy invitation message
              </button>
              <button className="button" onClick={() => copy(invite.url)}>
                <Copy size={17} />
                Copy private invitation
              </button>
            </div>
          )}
          {modal === 'token' && token && (
            <div className="share-result">
              <label>
                MCP endpoint
                <input readOnly value={token.endpoint} />
              </label>
              <label>
                Bearer token
                <textarea readOnly value={token.token} />
              </label>
              <p>
                {token.expiresIn}. Use the Authorization: Bearer header. This
                grants coordinator access; create only for a client you trust.
              </p>
              <button className="button" onClick={() => copy(token.token)}>
                <Copy size={17} />
                Copy token
              </button>
            </div>
          )}
          {modal === 'revoke' && (
            <button
              className="button danger-button"
              disabled={busy}
              onClick={async () => {
                const r = await actionApi('/api/invite', 'DELETE', {
                  memberId: modalMember,
                });
                if (r) {
                  setModal(null);
                  setNotice(r.message);
                }
              }}
            >
              Revoke access
            </button>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
