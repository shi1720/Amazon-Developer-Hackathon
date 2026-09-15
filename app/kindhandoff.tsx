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
  CalendarDays,
  ChevronLeft,
  Pencil,
  Trash2,
  LoaderCircle,
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
import {
  calendarDay,
  captureCircleReview,
  commitmentsForDay,
  dayLabel,
  defaultCommitmentWindow,
  reconcileSnapshot,
  isReviewCurrent,
  reviewedMutationVersion,
  staleReviewMessage,
  shiftCalendarDay,
  type CircleReview,
} from '@/lib/ui-model';
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
  disabled,
}: {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  options: { value: string; label: string }[];
  onChange?: (value: string) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <Select
      name={name}
      value={value}
      defaultValue={defaultValue}
      disabled={disabled}
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
function CapabilityFields({
  defaults = [],
  legend = 'What this commitment needs',
  disabled = false,
}: {
  defaults?: readonly string[];
  legend?: string;
  disabled?: boolean;
}) {
  return (
    <fieldset>
      <legend>{legend}</legend>
      <div className="check-options">
        {Object.entries(caps).map(([value, label]) => (
          <label className="check-label" key={value}>
            <Checkbox
              name="capabilities"
              value={value}
              defaultChecked={defaults.includes(value)}
              disabled={disabled}
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
  const [modalTaskId, setModalTaskId] = useState<string | null>(null);
  const [modalReview, setModalReview] = useState<CircleReview | null>(null);
  const [modalWindow, setModalWindow] = useState<{
    start: string;
    end: string;
  } | null>(null);
  const [availabilityWindows, setAvailabilityWindows] = useState<
    { id: string; start: string; end: string }[]
  >([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [refreshError, setRefreshError] = useState('');
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
  const operationInFlight = useRef(false);
  const refreshInFlight = useRef(false);
  const sessionEpoch = useRef(0);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const c = snapshot?.circle;
  const actor = c?.members.find((m) => m.id === snapshot?.memberId);
  const isOwner = actor?.role === 'owner';
  const detail = c?.tasks.find((t) => t.id === detailId);
  const demoRole = snapshot?.kind === 'demo' ? snapshot.memberId : undefined;
  const today = calendarDay(currentTime, c?.timeZone ?? 'UTC');
  const selectedDay = selectedDate || today;
  const modalNeedsReview = [
    'task',
    'edit',
    'cancel',
    'helper',
    'availability',
    'change',
  ].includes(modal ?? '');
  const staleModal =
    modalNeedsReview && !!snapshot && !isReviewCurrent(snapshot, modalReview);
  const addTrace = useCallback(
    (t: Trace) => setTraces((x) => [t, ...x].slice(0, 30)),
    [],
  );
  const load = useCallback(async () => {
    const epoch = sessionEpoch.current;
    const s = await api('/api/session');
    if (epoch !== sessionEpoch.current) return s;
    setSnapshot((old) => reconcileSnapshot(old, s));
    setRefreshError('');
    if (!s.circle) {
      sessionEpoch.current++;
      setModal(null);
      setDetailId(null);
      setInvite(null);
      setToken(null);
      setPlan(null);
      setError(
        'Your session has ended. Sign in again, or ask your coordinator for a fresh invitation.',
      );
    }
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
      if (
        document.visibilityState !== 'visible' ||
        refreshInFlight.current ||
        operationInFlight.current
      )
        return;
      refreshInFlight.current = true;
      void load()
        .catch(() =>
          setRefreshError(
            'Updates are paused. Check your connection and refresh before making another change.',
          ),
        )
        .finally(() => {
          refreshInFlight.current = false;
        });
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
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  async function call<N extends ToolName>(
    name: N,
    args: Record<string, unknown> = {},
    write = false,
    review?: CircleReview | null,
  ) {
    if (!snapshot || operationInFlight.current) return null;
    operationInFlight.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await callMcp(
        name,
        write
          ? {
              ...args,
              expectedVersion:
                review === undefined
                  ? snapshot.circle.version
                  : reviewedMutationVersion(snapshot, review),
              requestId: crypto.randomUUID(),
            }
          : args,
        demoRole,
        addTrace,
      );
      if ('circle' in result)
        setSnapshot((s) =>
          s ? reconcileSnapshot(s, { ...s, circle: result.circle }) : s,
        );
      setRefreshError('');
      if ('message' in result) setNotice(result.message);
      return result;
    } catch (e) {
      setError((e as Error).message);
      await load().catch(() => {});
      return null;
    } finally {
      operationInFlight.current = false;
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
    if (!c || !actor || !text.trim() || busy) return;
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
    if (operationInFlight.current) return null;
    operationInFlight.current = true;
    setBusy(true);
    setError('');
    try {
      return await api(path, method, data);
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      operationInFlight.current = false;
      setBusy(false);
    }
  }
  function openModal(
    next: string,
    options: {
      memberId?: string;
      taskId?: string;
      window?: { start: string; end: string };
    } = {},
  ) {
    if (busy || !c || !snapshot) return;
    setError('');
    setModalReview(captureCircleReview(snapshot));
    setModalMember(options.memberId ?? '');
    setModalTaskId(options.taskId ?? null);
    setModalWindow(options.window ?? defaultCommitmentWindow(c, selectedDay));
    if (next === 'availability') {
      const person = c.members.find((member) => member.id === options.memberId);
      setAvailabilityWindows(
        (person?.availability ?? []).map((window) => ({
          ...window,
          id: crypto.randomUUID(),
        })),
      );
    }
    setModal(next);
  }
  async function formSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (key: string) => textField(f.get(key));
    let result: unknown;
    try {
      if (modalNeedsReview) reviewedMutationVersion(snapshot!, modalReview);
      if (modal === 'task' || modal === 'edit')
        result = await call(
          modal === 'edit' ? 'edit_commitment' : 'add_commitment',
          {
            ...(modal === 'edit' ? { taskId: modalTaskId } : {}),
            title: get('title'),
            details: get('details'),
            start: iso(f.get('start')),
            end: iso(f.get('end')),
            requiredCapabilities: f.getAll('capabilities'),
            dependsOn: f.getAll('dependsOn').map(textField),
          },
          true,
          modalReview,
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
          modalReview,
        );
      if (modal === 'availability')
        result = await call(
          'set_availability',
          {
            memberId: modalMember,
            canAccept: f.has('canAccept'),
            availability: f.getAll('availabilityStart').map((start, index) => ({
              start: iso(start),
              end: iso(f.getAll('availabilityEnd')[index] ?? null),
            })),
            capabilities: f.getAll('capabilities'),
          },
          true,
          modalReview,
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
          modalReview,
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
          sessionEpoch.current++;
          setSnapshot(created);
          setSelectedDate('');
          setPlan(null);
          setReply('');
        }
      }
      if (modal === 'delete') {
        result = await actionApi('/api/account', 'DELETE', {
          confirmation: get('confirmation'),
        });
        if (result) {
          sessionEpoch.current++;
          setSnapshot(null);
          window.location.reload();
        }
      }
      if (result) {
        setModal(null);
        if (modal === 'task' || modal === 'edit') {
          setSelectedDate(calendarDay(iso(f.get('start')), c!.timeZone));
          setView('today');
          setDetailId(null);
          setPlan(null);
        }
        if (modal === 'helper' || modal === 'availability') setView('circle');
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
            {loading ? <LoaderCircle className="loading-spin" /> : <Sprout />}
          </span>
          <h1>{loading ? 'Getting the day together…' : 'Let’s reconnect.'}</h1>
          <p>
            {loading
              ? 'Opening your own family demo. No signup needed.'
              : error}
          </p>
          {!loading && (
            <div className="reconnect-actions">
              <a className="button" href="/signin">
                Sign in to your circle <ArrowRight size={17} />
              </a>
              <button
                className="button secondary"
                disabled={busy}
                onClick={async () => {
                  const result = await actionApi('/api/session', 'POST', {
                    mode: 'demo',
                  });
                  if (result) {
                    sessionEpoch.current++;
                    setSnapshot(result);
                    setSelectedDate('');
                    setError('');
                  }
                }}
              >
                Open a fresh demo
              </button>
              <button
                className="text-button"
                onClick={() => window.location.reload()}
              >
                Retry connection
              </button>
            </div>
          )}
        </div>
      </main>
    );
  const ordered = commitmentsForDay(c.tasks, selectedDay, c.timeZone);
  const scheduledDays = [
    ...new Set(c.tasks.map((task) => calendarDay(task.start, c.timeZone))),
  ].sort((left, right) => left.localeCompare(right));
  const nextScheduledDay =
    scheduledDays.find((day) => day > selectedDay) ??
    scheduledDays.find((day) => day !== selectedDay);
  const uncovered = ordered.filter((t) =>
    ['open', 'blocked', 'offered'].includes(t.status),
  ).length;
  const accepted = ordered.filter((t) => t.status === 'accepted').length;
  const completed = ordered.filter((t) => t.status === 'done').length;
  const b = brief(c);
  const selectedMember = c.members.find((m) => m.id === modalMember);
  const editingTask = c.tasks.find((task) => task.id === modalTaskId);
  const formStart =
    modalWindow?.start ?? defaultCommitmentWindow(c, selectedDay).start;
  const formEnd =
    modalWindow?.end ?? defaultCommitmentWindow(c, selectedDay).end;
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
              onClick={() => (c.demo ? openModal('create') : setView('circle'))}
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
            <RefreshCw
              size={18}
              className={busy ? 'loading-spin' : undefined}
            />
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
        <span
          className={`ribbon-detail ${snapshot?.kind === 'demo' ? '' : 'identity-detail'}`}
        >
          {snapshot?.kind === 'demo'
            ? 'Your changes stay in your own workspace'
            : `Viewing as ${actor.name} · ${isOwner ? 'Coordinator' : 'Helper'}`}
        </span>
        {snapshot?.kind === 'demo' && (
          <div className="role-switch">
            <span>Demo role:</span>
            <Choice
              label="Demo role"
              disabled={busy}
              value={actor.id}
              options={c.members.map((m) => ({ value: m.id, label: m.name }))}
              onChange={(value) => {
                setSnapshot((s) => (s ? { ...s, memberId: value } : s));
                setPending(null);
                setPendingNote('');
                setPlan(null);
                setReply('');
                setUtterance('');
                setInput('');
                setDetailId(null);
                recognition.current?.abort();
                setListening(false);
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
            <p className="eyebrow">{dayLabel(selectedDay).toUpperCase()}</p>
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
        {refreshError && (
          <div className="sync-banner" role="alert">
            <AlertCircle size={18} />
            <span>{refreshError}</span>
            <button
              className="text-button"
              disabled={busy}
              onClick={() => call('get_day')}
            >
              Refresh now
            </button>
          </div>
        )}
        {error && !modal && !detail && (
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
                disabled={busy}
                onClick={() => openModal('task')}
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
                          <button
                            className="task-title"
                            onClick={() => setDetailId(t.id)}
                          >
                            <h3>{t.title}</h3>
                          </button>
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

                <div className="day-toolbar" aria-label="Choose a day">
                  <div className="date-control">
                    <label htmlFor="plan-date">
                      <CalendarDays size={16} />
                      Viewing date
                    </label>
                    <input
                      id="plan-date"
                      type="date"
                      value={selectedDay}
                      onChange={(event) => {
                        if (event.target.value)
                          setSelectedDate(event.target.value);
                      }}
                    />
                  </div>
                  <div className="day-navigation">
                    <button
                      className="icon-button"
                      aria-label="Previous day"
                      onClick={() =>
                        setSelectedDate(shiftCalendarDay(selectedDay, -1))
                      }
                    >
                      <ChevronLeft size={19} />
                    </button>
                    <button
                      className="button small secondary"
                      disabled={selectedDay === today}
                      onClick={() => setSelectedDate(today)}
                    >
                      Today
                    </button>
                    <button
                      className="icon-button"
                      aria-label="Next day"
                      onClick={() =>
                        setSelectedDate(shiftCalendarDay(selectedDay, 1))
                      }
                    >
                      <ChevronRight size={19} />
                    </button>
                  </div>
                  <a
                    className="text-button mobile-voice-jump"
                    href="#voice-desk"
                  >
                    <AudioLines size={16} />
                    Voice desk
                  </a>
                </div>
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
                    <span>
                      still {uncovered === 1 ? 'needs' : 'need'} acceptance
                    </span>
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
                    <h2>
                      {c.tasks.length
                        ? 'A little room in the day.'
                        : 'A fresh start for your circle.'}
                    </h2>
                    <p>
                      {c.tasks.length
                        ? 'There are no commitments on this date. Choose another day or add a plan here.'
                        : isOwner
                          ? 'Start with one commitment, then add the people who can help and invite them to your circle.'
                          : 'Your coordinator has not added any commitments yet. Your invitations and offers will appear here.'}
                    </p>
                    {isOwner && (
                      <button
                        className="button"
                        disabled={busy}
                        onClick={() => openModal('task')}
                      >
                        <Plus size={17} />
                        {c.tasks.length
                          ? 'Add a commitment on this day'
                          : 'Add the first commitment'}
                      </button>
                    )}
                    {nextScheduledDay && (
                      <button
                        className="text-button"
                        onClick={() => setSelectedDate(nextScheduledDay)}
                      >
                        View {dayLabel(nextScheduledDay)}{' '}
                        <ArrowRight size={16} />
                      </button>
                    )}
                    {isOwner && c.members.length === 1 && (
                      <button
                        className="text-button"
                        disabled={busy}
                        onClick={() => openModal('helper')}
                      >
                        <Users size={16} />
                        Add someone who can help
                      </button>
                    )}
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
                            <span>to {stamp(t.end, c.timeZone)}</span>
                            {calendarDay(t.start, c.timeZone) < selectedDay ? (
                              <span>From previous day</span>
                            ) : calendarDay(t.end, c.timeZone) > selectedDay ? (
                              <span>Ends next day</span>
                            ) : null}
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
                            {isOwner &&
                              ['open', 'blocked'].includes(t.status) && (
                                <div className="task-actions">
                                  <button
                                    className="text-button"
                                    disabled={busy}
                                    onClick={() => setDetailId(t.id)}
                                  >
                                    <Users size={16} />
                                    Choose a helper
                                  </button>
                                  <button
                                    className="text-button muted"
                                    disabled={busy}
                                    onClick={() =>
                                      openModal('edit', {
                                        taskId: t.id,
                                        window: t,
                                      })
                                    }
                                  >
                                    <Pencil size={15} />
                                    Edit
                                  </button>
                                </div>
                              )}
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
                                    disabled={busy}
                                    onClick={() =>
                                      openModal('change', {
                                        memberId: t.assigneeId!,
                                        taskId: t.id,
                                        window: t,
                                      })
                                    }
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
                            ? `· waiting for ${t.proposedTo}`
                            : '· no helper yet'}
                        </p>
                      ))}
                    </div>
                  )}
                  <div className="brief-block">
                    <h3>Who’s carrying what</h3>
                    {b.accepted.length ? (
                      b.accepted.map((t) => (
                        <div className="brief-assignment" key={t.id}>
                          <span>{datedStamp(t.start, c.timeZone)}</span>
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
                      <p>No accepted commitments to hand over.</p>
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
                      disabled={busy}
                      onClick={() => openModal('helper')}
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
                        {!m.canAccept && (
                          <span className="chip amber-chip">
                            Paused for new offers
                          </span>
                        )}
                        {!m.capabilities.length && (
                          <span className="source-label">
                            No capabilities selected
                          </span>
                        )}
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
                            disabled={busy}
                            onClick={() =>
                              openModal('availability', { memberId: m.id })
                            }
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
                              onClick={() =>
                                openModal('revoke', { memberId: m.id })
                              }
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
                    <span>
                      {traces.length} {traces.length === 1 ? 'call' : 'calls'}{' '}
                      this session
                    </span>
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
                        disabled={busy}
                        onClick={() => openModal('create')}
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
                            sessionEpoch.current++;
                            setSnapshot(r);
                            setSelectedDate('');
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
                        disabled={busy}
                        onClick={() => openModal('delete')}
                      >
                        Delete this circle
                      </button>
                    )}
                  </div>
                </div>
              </TabsContent>
            </section>
            <aside
              id="voice-desk"
              className="voice-panel"
              aria-label="Voice desk and language simulator"
            >
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
              {plan &&
                plan.assignments.every((assignment) =>
                  c.tasks.some((task) => task.id === assignment.taskId),
                ) && (
                  <div className="plan-card">
                    <div className="plan-label">
                      <span className="eyebrow">A POSSIBLE PLAN B</span>
                      <span>v{plan.basedOnVersion}</span>
                    </div>
                    {plan.assignments.map((a) => (
                      <div className="plan-assignment" key={a.taskId}>
                        <div>
                          <span className="plan-time">
                            {datedStamp(
                              c.tasks.find((t) => t.id === a.taskId)!.start,
                              c.timeZone,
                            )}
                          </span>
                          <strong>
                            {
                              c.members.find((m) => m.id === a.candidateId)
                                ?.name
                            }
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
                          Create {plan.assignments.length} handoff{' '}
                          {plan.assignments.length === 1 ? 'offer' : 'offers'}{' '}
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
                      Suggestions cover your circle’s unassigned commitments. No
                      messages are sent.
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
                  disabled={busy}
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
              <details className="supported-requests">
                <summary>What can I ask?</summary>
                <p>
                  This simulator understands these requests. You review every
                  change before it is saved.
                </p>
                <ul>
                  <li>“Maya is unavailable this afternoon.”</li>
                  <li>“Who can help?”</li>
                  <li>“What should the next helper know?”</li>
                  <li>“Note: the blue bag is by the door.”</li>
                </ul>
                <p>
                  For a different date, a new commitment, or a helper’s
                  availability, use the day and circle controls.
                </p>
              </details>
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
              <SheetDescription>
                {detail.details || 'No extra details have been added.'}
              </SheetDescription>
              {error && !modal && (
                <p className="error-banner" role="alert">
                  {error}
                </p>
              )}
              <span
                className={`chip ${detail.status === 'accepted' ? 'blue-chip' : 'subtle'}`}
              >
                {statuses[detail.status]}
              </span>
              <p>
                {datedStamp(detail.start, c.timeZone)} to{' '}
                {datedStamp(detail.end, c.timeZone)} · {c.timeZone}
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
                    <button
                      className="text-button"
                      key={id}
                      onClick={() => setDetailId(id)}
                    >
                      {c.tasks.find((t) => t.id === id)?.title} ·{' '}
                      {statuses[c.tasks.find((t) => t.id === id)!.status]}
                    </button>
                  ))}
                </div>
              )}
              {['open', 'blocked'].includes(detail.status) && isOwner && (
                <div className="offer-options">
                  <div className="task-actions detail-edit-actions">
                    <button
                      className="button small secondary"
                      disabled={busy}
                      onClick={() =>
                        openModal('edit', { taskId: detail.id, window: detail })
                      }
                    >
                      <Pencil size={16} />
                      Edit commitment
                    </button>
                    <button
                      className="text-button danger"
                      disabled={busy}
                      onClick={() => openModal('cancel', { taskId: detail.id })}
                    >
                      <Trash2 size={16} />
                      Cancel commitment
                    </button>
                  </div>
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
              {detail.status === 'offered' &&
                detail.proposedAssigneeId === actor.id && (
                  <div className="task-actions">
                    <button
                      className="button"
                      disabled={busy}
                      onClick={() =>
                        call(
                          'respond_to_handoff',
                          { taskId: detail.id, response: 'accept' },
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
                          { taskId: detail.id, response: 'decline' },
                          true,
                        )
                      }
                    >
                      I can’t
                    </button>
                  </div>
                )}
              {detail.status === 'accepted' &&
                (isOwner || detail.assigneeId === actor.id) && (
                  <div className="task-actions">
                    <button
                      className="button"
                      disabled={busy || readiness(c, detail).waiting.length > 0}
                      onClick={() =>
                        call('complete_commitment', { taskId: detail.id }, true)
                      }
                    >
                      <CircleCheck size={16} />
                      Mark complete
                    </button>
                    <button
                      className="text-button"
                      disabled={busy}
                      onClick={() =>
                        openModal('change', {
                          memberId: detail.assigneeId!,
                          taskId: detail.id,
                          window: detail,
                        })
                      }
                    >
                      Report a change
                    </button>
                  </div>
                )}
              {detail.status === 'offered' && isOwner && (
                <div className="brief-block">
                  <p>
                    Waiting for{' '}
                    {
                      c.members.find(
                        (member) => member.id === detail.proposedAssigneeId,
                      )?.name
                    }{' '}
                    to respond. If they are unavailable, report that change
                    before editing this commitment.
                  </p>
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={() =>
                      openModal('change', {
                        memberId: detail.proposedAssigneeId!,
                        taskId: detail.id,
                        window: detail,
                      })
                    }
                  >
                    Report a change
                  </button>
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
                  edit: 'Edit commitment',
                  cancel: 'Cancel this commitment?',
                  helper: 'Add a helper',
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
                      : modal === 'cancel'
                        ? 'This removes the commitment from your active plan and keeps a cancellation record. Commitments with dependent tasks must be resolved first.'
                        : modal === 'availability'
                          ? 'Keep each available window separate. Time between these windows remains unavailable.'
                          : 'Clear details make the next handoff easier.'}
            </DialogDescription>
          </DialogHeader>
          {(staleModal || error) && (
            <p role="alert" className="error-banner">
              {staleModal ? staleReviewMessage : error}
            </p>
          )}
          {[
            'task',
            'edit',
            'helper',
            'availability',
            'change',
            'create',
            'delete',
          ].includes(modal ?? '') && (
            <form className="app-form" onSubmit={formSubmit} aria-busy={busy}>
              {(modal === 'task' || modal === 'edit') && (
                <>
                  <label>
                    Commitment
                    <input
                      name="title"
                      maxLength={120}
                      required
                      placeholder="A ride to book club"
                      defaultValue={modal === 'edit' ? editingTask?.title : ''}
                      disabled={busy}
                    />
                  </label>
                  <label>
                    The details
                    <textarea
                      name="details"
                      maxLength={800}
                      placeholder="What should the helper know?"
                      defaultValue={
                        modal === 'edit' ? editingTask?.details : ''
                      }
                      disabled={busy}
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
                      disabled={busy}
                    />
                  </label>
                  <label>
                    Relationship
                    <input
                      name="relation"
                      maxLength={100}
                      placeholder="Son, neighbour, friend…"
                      disabled={busy}
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
                      disabled={busy}
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
                      disabled={busy}
                    />
                  </label>
                </>
              )}
              {['task', 'edit', 'helper', 'change'].includes(modal ?? '') && (
                <>
                  <div className="form-row">
                    <label>
                      From
                      <input
                        type="datetime-local"
                        name="start"
                        defaultValue={datetime(formStart)}
                        required
                        disabled={busy}
                      />
                    </label>
                    <label>
                      Until
                      <input
                        type="datetime-local"
                        name="end"
                        defaultValue={datetime(formEnd)}
                        required
                        disabled={busy}
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
              {modal === 'availability' && (
                <fieldset className="availability-editor">
                  <legend>Available times</legend>
                  <label
                    className="check-label"
                    htmlFor="availability-can-accept"
                  >
                    <Checkbox
                      id="availability-can-accept"
                      name="canAccept"
                      defaultChecked={selectedMember?.canAccept ?? true}
                      disabled={busy}
                    />
                    Can accept new handoff offers
                  </label>
                  {availabilityWindows.length === 0 && (
                    <p className="form-hint">
                      No available times are set. Add a window when you can
                      help.
                    </p>
                  )}
                  {availabilityWindows.map((window, index) => (
                    <div className="availability-window" key={window.id}>
                      <div className="window-heading">
                        <strong>Window {index + 1}</strong>
                        <button
                          className="text-button danger"
                          type="button"
                          disabled={busy}
                          aria-label={`Remove availability window ${index + 1}`}
                          onClick={() =>
                            setAvailabilityWindows((windows) =>
                              windows.filter((item) => item.id !== window.id),
                            )
                          }
                        >
                          <X size={15} />
                          Remove
                        </button>
                      </div>
                      <div className="form-row">
                        <label>
                          From
                          <input
                            name="availabilityStart"
                            type="datetime-local"
                            defaultValue={
                              window.start ? datetime(window.start) : ''
                            }
                            required
                            disabled={busy}
                          />
                        </label>
                        <label>
                          Until
                          <input
                            name="availabilityEnd"
                            type="datetime-local"
                            defaultValue={
                              window.end ? datetime(window.end) : ''
                            }
                            required
                            disabled={busy}
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                  <button
                    className="button secondary small"
                    type="button"
                    disabled={busy || availabilityWindows.length >= 8}
                    onClick={() =>
                      setAvailabilityWindows((windows) => [
                        ...windows,
                        { id: crypto.randomUUID(), start: '', end: '' },
                      ])
                    }
                  >
                    <Plus size={16} />
                    Add time window
                  </button>
                  <p className="form-hint">
                    Up to eight separate windows. Enter times in your device
                    time zone:{' '}
                    {new Intl.DateTimeFormat().resolvedOptions().timeZone}.
                  </p>
                </fieldset>
              )}
              {['task', 'edit', 'helper', 'availability'].includes(
                modal ?? '',
              ) && (
                <CapabilityFields
                  disabled={busy}
                  legend={
                    modal === 'task' || modal === 'edit'
                      ? 'What this commitment needs'
                      : 'How this person can help'
                  }
                  defaults={
                    modal === 'availability'
                      ? selectedMember?.capabilities
                      : modal === 'edit'
                        ? editingTask?.requiredCapabilities
                        : []
                  }
                />
              )}
              {(modal === 'task' || modal === 'edit') && (
                <fieldset className="dependency-editor">
                  <legend>Earlier commitments</legend>
                  <p className="form-hint">
                    Optional. Choose up to eight commitments that must finish
                    first.
                  </p>
                  {c.tasks.filter((task) => task.id !== modalTaskId).length ? (
                    <div className="dependency-choices">
                      {[...c.tasks]
                        .filter((task) => task.id !== modalTaskId)
                        .sort((left, right) =>
                          left.start.localeCompare(right.start),
                        )
                        .map((task) => (
                          <label
                            className="check-label"
                            key={task.id}
                            htmlFor={`dependency-${task.id}`}
                          >
                            <Checkbox
                              id={`dependency-${task.id}`}
                              name="dependsOn"
                              value={task.id}
                              defaultChecked={
                                modal === 'edit' &&
                                (editingTask?.dependsOn.includes(task.id) ??
                                  false)
                              }
                              disabled={busy}
                            />
                            <span>
                              {task.title}
                              <small>
                                {datedStamp(task.start, c.timeZone)} ·{' '}
                                {statuses[task.status]}
                              </small>
                            </span>
                          </label>
                        ))}
                    </div>
                  ) : (
                    <p className="form-hint">No earlier commitments yet.</p>
                  )}
                </fieldset>
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
                      disabled={busy}
                    />
                  </label>
                  <label>
                    Who is this circle for?
                    <input
                      name="recipient"
                      maxLength={80}
                      required
                      placeholder="A parent, friend, or family member"
                      disabled={busy}
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
                    disabled={busy}
                  />
                </label>
              )}
              <button
                disabled={busy || staleModal}
                type="submit"
                className={`button ${modal === 'delete' ? 'danger-button' : ''}`}
              >
                {busy
                  ? 'Saving…'
                  : modal === 'change'
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
          {modal === 'cancel' && editingTask && (
            <div className="cancel-confirmation">
              <h3>{editingTask.title}</h3>
              <p>{datedStamp(editingTask.start, c.timeZone)}</p>
              <div className="task-actions">
                <button
                  className="button danger-button"
                  disabled={busy || staleModal}
                  onClick={async () => {
                    const result = await call(
                      'cancel_commitment',
                      { taskId: editingTask.id },
                      true,
                      modalReview,
                    );
                    if (result) {
                      setModal(null);
                      setDetailId(null);
                      setPlan(null);
                    }
                  }}
                >
                  <Trash2 size={16} />
                  {busy ? 'Cancelling…' : 'Confirm cancellation'}
                </button>
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() => setModal(null)}
                >
                  Keep commitment
                </button>
              </div>
            </div>
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
