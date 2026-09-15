/** Opaque, exact identity IDs. Resolve the authenticated principal before calling. */
export type CommitmentStatus = 'open' | 'offered' | 'accepted' | 'done' | 'blocked';

export interface Commitment {
  readonly id: string;
  readonly ownerId: string;
  readonly version: number;
  readonly status: CommitmentStatus;
  readonly assigneeId: string | null;
  readonly proposedAssigneeId: string | null;
}

export type HandoffAction =
  | { readonly type: 'propose'; readonly candidateId: string }
  | { readonly type: 'accept' | 'decline' | 'complete' | 'disrupt' | 'reopen' };

export interface TransitionContext {
  readonly actorId: string;
  readonly expectedVersion: number;
  /** UTC ISO-8601 timestamp with a Z suffix, supplied by the trusted caller. */
  readonly now: string;
  /** Uniqueness and retry storage are enforced by the caller's transaction. */
  readonly eventId: string;
}

export type ErrorCode = 'INVALID_INPUT' | 'INVALID_DATE' | 'INVALID_STATE' |
  'STALE_VERSION' | 'VERSION_EXHAUSTED' | 'FORBIDDEN' | 'INVALID_TRANSITION' | 'DUPLICATE_ID';
export interface GuardError { readonly code: ErrorCode; readonly message: string }
export interface Failure { readonly ok: false; readonly error: GuardError }

export interface HandoffEvent {
  readonly id: string;
  readonly commitmentId: string;
  readonly actorId: string;
  readonly action: HandoffAction['type'];
  readonly at: string;
  readonly previousVersion: number;
  readonly version: number;
  readonly before: Commitment;
  readonly after: Commitment;
}

export type TransitionResult = Failure | {
  readonly ok: true;
  readonly commitment: Commitment;
  readonly event: HandoffEvent;
};

const STATUSES = new Set<string>(['open', 'offered', 'accepted', 'done', 'blocked']);
const ACTIONS = new Set<string>(['propose', 'accept', 'decline', 'complete', 'disrupt', 'reopen']);
const failure = (code: ErrorCode, message: string): Failure => ({ ok: false, error: { code, message } });
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const identity = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= 256 && value.trim() === value && !/[\u0000-\u001f\u007f]/.test(value);
const strings = (value: unknown): value is readonly string[] => Array.isArray(value) && Array.from(value).every(identity);

/** Strict UTC parsing rejects impossible calendar dates and timezone ambiguity. */
function utcMilliseconds(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,3}))?Z$/.exec(value);
  if (!match) return null;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return null;
  const canonical = `${match[1]}.${(match[2] ?? '').padEnd(3, '0')}Z`;
  return new Date(parsed).toISOString() === canonical ? parsed : null;
}

function validateCommitment(value: unknown): GuardError | null {
  if (!record(value) || !identity(value.id) || !identity(value.ownerId) ||
    !Number.isSafeInteger(value.version) || (value.version as number) < 0 ||
    typeof value.status !== 'string' || !STATUSES.has(value.status) ||
    !(value.assigneeId === null || identity(value.assigneeId)) ||
    !(value.proposedAssigneeId === null || identity(value.proposedAssigneeId))) {
    return { code: 'INVALID_INPUT', message: 'Commitment requires exact IDs, a nonnegative safe integer version, a known status, and nullable assignee fields.' };
  }
  const valid = value.status === 'offered'
    ? value.assigneeId === null && identity(value.proposedAssigneeId)
    : value.status === 'accepted' || value.status === 'done'
      ? identity(value.assigneeId) && value.proposedAssigneeId === null
      : value.assigneeId === null && value.proposedAssigneeId === null;
  return valid ? null : { code: 'INVALID_STATE', message: 'Offered commitments have only a proposed assignee; accepted/done commitments have only an assignee; open/blocked commitments have neither.' };
}

function snapshot(value: Commitment): Commitment {
  return Object.freeze({ id: value.id, ownerId: value.ownerId, version: value.version,
    status: value.status, assigneeId: value.assigneeId, proposedAssigneeId: value.proposedAssigneeId });
}

/** Pure state transition. No clock reads, random IDs, persistence, or external calls. */
export function transitionCommitment(commitment: Commitment, action: HandoffAction, context: TransitionContext): TransitionResult {
  const invalid = validateCommitment(commitment);
  if (invalid) return { ok: false, error: invalid };
  if (!record(action) || typeof action.type !== 'string' || !ACTIONS.has(action.type) ||
    (action.type === 'propose' && !identity(action.candidateId)) ||
    !record(context) || !identity(context.actorId) || !identity(context.eventId) ||
    !Number.isSafeInteger(context.expectedVersion) || context.expectedVersion < 0) {
    return failure('INVALID_INPUT', 'Action and context must include valid exact IDs and an expectedVersion.');
  }
  if (utcMilliseconds(context.now) === null) return failure('INVALID_DATE', 'now must be a valid UTC ISO timestamp ending in Z.');
  if (context.expectedVersion !== commitment.version) return failure('STALE_VERSION', 'The commitment changed. Reload the current version before proposing another action.');
  if (commitment.version === Number.MAX_SAFE_INTEGER) return failure('VERSION_EXHAUSTED', 'Version cannot be incremented safely.');
  const owner = context.actorId === commitment.ownerId;
  const assignee = context.actorId === commitment.assigneeId;
  const candidate = context.actorId === commitment.proposedAssigneeId;
  let changes: Pick<Commitment, 'status' | 'assigneeId' | 'proposedAssigneeId'>;
  switch (action.type) {
    case 'propose':
      if (!owner) return failure('FORBIDDEN', 'Only the owner can propose a handoff.');
      if (commitment.status !== 'open' && commitment.status !== 'blocked') return failure('INVALID_TRANSITION', 'A handoff can only be proposed for an open or blocked commitment.');
      changes = { status: 'offered', assigneeId: null, proposedAssigneeId: action.candidateId };
      break;
    case 'accept':
    case 'decline':
      if (commitment.status !== 'offered') return failure('INVALID_TRANSITION', 'Only an offered commitment can be accepted or declined.');
      if (!candidate) return failure('FORBIDDEN', 'Only the exact proposed candidate can accept or decline.');
      changes = action.type === 'accept'
        ? { status: 'accepted', assigneeId: commitment.proposedAssigneeId, proposedAssigneeId: null }
        : { status: 'open', assigneeId: null, proposedAssigneeId: null };
      break;
    case 'complete':
      if (!owner && !assignee) return failure('FORBIDDEN', 'Only the owner or accepted assignee can complete a commitment.');
      if (commitment.status !== 'accepted') return failure('INVALID_TRANSITION', 'A commitment must be accepted before it can be completed.');
      changes = { status: 'done', assigneeId: commitment.assigneeId, proposedAssigneeId: null };
      break;
    case 'disrupt':
      if (!owner && !assignee) return failure('FORBIDDEN', 'Only the owner or accepted assignee can report a disruption.');
      if (commitment.status !== 'accepted' && commitment.status !== 'offered') return failure('INVALID_TRANSITION', 'Only an accepted or offered commitment can be disrupted.');
      changes = { status: 'blocked', assigneeId: null, proposedAssigneeId: null };
      break;
    case 'reopen':
      if (!owner) return failure('FORBIDDEN', 'Only the owner can reopen a commitment.');
      if (commitment.status !== 'blocked' && commitment.status !== 'done') return failure('INVALID_TRANSITION', 'Only a blocked or completed commitment can be reopened.');
      changes = { status: 'open', assigneeId: null, proposedAssigneeId: null };
      break;
    default:
      return failure('INVALID_INPUT', 'Unknown action.');
  }
  const before = snapshot(commitment);
  const after = snapshot({ ...before, ...changes, version: before.version + 1 });
  const event: HandoffEvent = Object.freeze({ id: context.eventId, commitmentId: before.id,
    actorId: context.actorId, action: action.type, at: context.now,
    previousVersion: before.version, version: after.version, before, after });
  return Object.freeze({ ok: true, commitment: after, event });
}

export interface CoverageSummary {
  readonly total: number;
  readonly open: number;
  readonly offered: number;
  readonly accepted: number;
  readonly done: number;
  readonly blocked: number;
  readonly covered: number;
  readonly uncovered: number;
  /** Null for an empty set, because no coverage rate can be inferred. */
  readonly coveragePercent: number | null;
}
export type CoverageResult = Failure | { readonly ok: true; readonly summary: CoverageSummary };

/** A proposal is not coverage. Accepted and completed commitments count as covered. */
export function summarizeCoverage(commitments: readonly Commitment[]): CoverageResult {
  if (!Array.isArray(commitments)) return failure('INVALID_INPUT', 'commitments must be an array.');
  const counts = { open: 0, offered: 0, accepted: 0, done: 0, blocked: 0 };
  const seen = new Set<string>();
  for (const commitment of commitments) {
    const invalid = validateCommitment(commitment);
    if (invalid) return { ok: false, error: invalid };
    if (seen.has(commitment.id)) return failure('DUPLICATE_ID', 'Coverage requires one current revision per commitment ID.');
    seen.add(commitment.id);
    counts[commitment.status as CommitmentStatus] += 1;
  }
  const covered = counts.accepted + counts.done;
  return { ok: true, summary: { total: commitments.length, ...counts, covered,
    uncovered: commitments.length - covered,
    coveragePercent: commitments.length === 0 ? null : covered / commitments.length * 100 } };
}

export interface TimeWindow { readonly start: string; readonly end: string }
export interface Candidate {
  readonly id: string;
  readonly canAccept: boolean;
  readonly capabilities: readonly string[];
  readonly availability: readonly TimeWindow[];
}
export interface ExistingAssignment extends TimeWindow {
  readonly id: string;
  readonly assigneeId: string | null;
  readonly status: CommitmentStatus;
}
export interface RankingInput {
  readonly window: TimeWindow;
  readonly requiredCapabilities: readonly string[];
  readonly candidates: readonly Candidate[];
  readonly existingAssignments?: readonly ExistingAssignment[];
  /** Exclude the commitment being replanned from existing workload/conflicts. */
  readonly commitmentId?: string;
}
export type CandidateReasonCode = 'CANNOT_ACCEPT' | 'MISSING_CAPABILITIES' | 'OUTSIDE_AVAILABILITY' |
  'OVERLAPPING_ASSIGNMENT' | 'AVAILABLE' | 'CAPABLE' | 'NO_CONFLICTS';
export interface CandidateReason { readonly code: CandidateReasonCode; readonly message: string }
export interface CandidateAssessment {
  readonly candidateId: string;
  readonly eligible: boolean;
  /** One-based rank for eligible candidates; null means ineligible. */
  readonly rank: number | null;
  readonly acceptedMinutesThatDay: number;
  readonly reasons: readonly CandidateReason[];
}
export type RankingResult = Failure | {
  readonly ok: true;
  readonly candidates: readonly CandidateAssessment[];
  readonly eligibleCandidateIds: readonly string[];
};
type Interval = readonly [number, number];
function interval(value: unknown): Interval | null {
  if (!record(value)) return null;
  const start = utcMilliseconds(value.start);
  const end = utcMilliseconds(value.end);
  return start !== null && end !== null && start < end ? [start, end] : null;
}
const compareIds = (left: string, right: string): number => left < right ? -1 : left > right ? 1 : 0;
const overlaps = (left: Interval, right: Interval): boolean => left[0] < right[1] && right[0] < left[1];
function covers(windows: readonly Interval[], target: Interval): boolean {
  let cursor = target[0];
  for (const [start, end] of [...windows].sort((a, b) => a[0] - b[0] || a[1] - b[1])) {
    if (end <= cursor) continue;
    if (start > cursor) return false;
    cursor = Math.max(cursor, end);
    if (cursor >= target[1]) return true;
  }
  return false;
}

/**
 * Deterministic feasibility ranking. Every valid candidate receives reasons.
 * Invalid input fails the entire call; a valid call may have zero eligible candidates.
 * Ranking is advice; revalidate schedules in the same transaction as acceptance.
 */
export function rankCandidates(input: RankingInput): RankingResult {
  if (!record(input) || !strings(input.requiredCapabilities) || !Array.isArray(input.candidates) ||
    (input.existingAssignments !== undefined && !Array.isArray(input.existingAssignments)) ||
    (input.commitmentId !== undefined && !identity(input.commitmentId))) return failure('INVALID_INPUT', 'Ranking requires capabilities, candidates, and valid optional assignment fields.');
  const target = interval(input.window);
  if (!target) return failure('INVALID_DATE', 'Requested window must have valid UTC timestamps and start before end.');
  const candidateIds = new Set<string>();
  const normalizedCandidates: { candidate: Candidate; windows: Interval[] }[] = [];
  for (const candidate of input.candidates) {
    if (!record(candidate) || !identity(candidate.id) || typeof candidate.canAccept !== 'boolean' ||
      !strings(candidate.capabilities) || !Array.isArray(candidate.availability)) return failure('INVALID_INPUT', 'Every candidate requires an exact ID, canAccept boolean, capabilities, and availability array.');
    if (candidateIds.has(candidate.id)) return failure('DUPLICATE_ID', 'Candidate IDs must be unique; identity is never inferred from names.');
    candidateIds.add(candidate.id);
    const windows: Interval[] = [];
    for (const window of candidate.availability) {
      const parsed = interval(window);
      if (!parsed) return failure('INVALID_DATE', `Candidate ${candidate.id} has an invalid availability window.`);
      windows.push(parsed);
    }
    normalizedCandidates.push({ candidate: candidate as unknown as Candidate, windows });
  }
  const assignmentIds = new Set<string>();
  const assignments: { assignment: ExistingAssignment; window: Interval }[] = [];
  for (const assignment of input.existingAssignments ?? []) {
    if (!record(assignment) || !identity(assignment.id) || typeof assignment.status !== 'string' || !STATUSES.has(assignment.status) ||
      !(assignment.assigneeId === null || identity(assignment.assigneeId)) ||
      ((assignment.status === 'accepted' || assignment.status === 'done') && !identity(assignment.assigneeId)) ||
      ((assignment.status === 'open' || assignment.status === 'offered' || assignment.status === 'blocked') && assignment.assigneeId !== null)) return failure('INVALID_INPUT', 'Existing assignments require a valid status and assignee consistent with that status.');
    if (assignmentIds.has(assignment.id)) return failure('DUPLICATE_ID', 'Assignment IDs must be unique.');
    assignmentIds.add(assignment.id);
    const parsed = interval(assignment);
    if (!parsed) return failure('INVALID_DATE', `Assignment ${assignment.id} has an invalid time window.`);
    if (assignment.id !== input.commitmentId && assignment.status === 'accepted') assignments.push({ assignment: assignment as unknown as ExistingAssignment, window: parsed });
  }
  const dayStart = Math.floor(target[0] / 86_400_000) * 86_400_000;
  const dayEnd = dayStart + 86_400_000;
  const assessments: CandidateAssessment[] = normalizedCandidates.map(({ candidate, windows }) => {
    const reasons: CandidateReason[] = [];
    if (!candidate.canAccept) reasons.push({ code: 'CANNOT_ACCEPT', message: 'This member is marked unavailable for new commitments.' });
    const missing = [...new Set(input.requiredCapabilities)].filter(capability => !candidate.capabilities.includes(capability)).sort(compareIds);
    reasons.push(missing.length > 0
      ? { code: 'MISSING_CAPABILITIES', message: `Missing required capabilities: ${missing.join(', ')}.` }
      : { code: 'CAPABLE', message: 'Has every required capability.' });
    const available = covers(windows, target);
    reasons.push(available
      ? { code: 'AVAILABLE', message: 'Availability covers the entire requested window.' }
      : { code: 'OUTSIDE_AVAILABILITY', message: 'Availability does not cover the entire requested window.' });
    const existing = assignments.filter(({ assignment }) => assignment.assigneeId === candidate.id);
    const conflicts = existing.filter(({ window }) => overlaps(window, target)).map(({ assignment }) => assignment.id).sort(compareIds);
    reasons.push(conflicts.length > 0
      ? { code: 'OVERLAPPING_ASSIGNMENT', message: `Conflicts with accepted commitments: ${conflicts.join(', ')}.` }
      : { code: 'NO_CONFLICTS', message: 'No overlapping accepted commitments.' });
    const acceptedMinutesThatDay = existing.reduce((total, { window }) =>
      total + Math.max(0, Math.min(window[1], dayEnd) - Math.max(window[0], dayStart)), 0) / 60_000;
    return { candidateId: candidate.id, eligible: candidate.canAccept && missing.length === 0 && available && conflicts.length === 0,
      rank: null, acceptedMinutesThatDay, reasons };
  });
  assessments.sort((a, b) => Number(b.eligible) - Number(a.eligible) || a.acceptedMinutesThatDay - b.acceptedMinutesThatDay || compareIds(a.candidateId, b.candidateId));
  let rank = 0;
  const ranked = assessments.map(assessment => ({ ...assessment, rank: assessment.eligible ? ++rank : null }));
  return { ok: true, candidates: ranked, eligibleCandidateIds: ranked.filter(candidate => candidate.eligible).map(candidate => candidate.candidateId) };
}
