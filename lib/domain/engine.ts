import {
  rankCandidates,
  transitionCommitment,
} from '../../packages/handoff-guard/src/index';
import {
  DomainError,
  type Circle,
  type Task,
  type Plan,
  type Principal,
} from './types';
export function member(circle: Circle, id: string) {
  const m = circle.members.find((m) => m.id === id);
  if (!m)
    throw new DomainError(
      'NOT_FOUND',
      'That helper is not in this circle.',
      404,
    );
  return m;
}
export function task(circle: Circle, id: string) {
  const t = circle.tasks.find((t) => t.id === id);
  if (!t)
    throw new DomainError(
      'NOT_FOUND',
      'That commitment is not in this circle.',
      404,
    );
  return t;
}
export const owner = (c: Circle) => c.members.find((m) => m.role === 'owner')!;
export function assertOwner(c: Circle, p: Principal) {
  if (p.memberId !== owner(c).id)
    throw new DomainError(
      'FORBIDDEN',
      'Only the coordinator can change the shared plan.',
      403,
    );
}
export function readiness(c: Circle, t: Task) {
  const waiting = t.dependsOn.filter((id) => task(c, id).status !== 'done');
  return {
    ready:
      (t.status === 'accepted' || t.status === 'done') && waiting.length === 0,
    waiting,
  };
}
export function checkWindow(start: string, end: string) {
  if (
    !Number.isFinite(Date.parse(start)) ||
    !Number.isFinite(Date.parse(end)) ||
    start >= end
  )
    throw new DomainError(
      'INVALID_INPUT',
      'Choose a valid start and end time.',
    );
  if (Date.parse(end) - Date.parse(start) > 86400000)
    throw new DomainError(
      'INVALID_INPUT',
      'A commitment can last up to 24 hours.',
    );
}
export function assess(c: Circle, t: Task, assignments = c.tasks) {
  const result = rankCandidates({
    window: t,
    requiredCapabilities: t.requiredCapabilities,
    candidates: c.members,
    existingAssignments: assignments,
    commitmentId: t.id,
  });
  if (!result.ok)
    throw new DomainError(result.error.code, result.error.message);
  return result;
}
export function planRecovery(c: Circle): Plan {
  const pending = c.tasks
    .filter((t) => t.status === 'open' || t.status === 'blocked')
    .sort(
      (a, b) =>
        assess(c, a).eligibleCandidateIds.length -
          assess(c, b).eligibleCandidateIds.length ||
        b.requiredCapabilities.length - a.requiredCapabilities.length ||
        a.start.localeCompare(b.start) ||
        a.id.localeCompare(b.id),
    );
  if (pending.length > 8)
    throw new DomainError(
      'LIMIT',
      'Recover up to eight commitments at once. Use individual offers for a larger day.',
    );
  // Bounded backtracking avoids greedy assignment failures. Rank by feasibility, then fair load.
  let visited = 0;
  let best: { taskId: string; candidateId: string; reason: string }[] = [];
  function search(index: number, working: Task[], chosen: typeof best) {
    if (++visited > 4096) return;
    if (index === pending.length) {
      if (chosen.length > best.length) best = [...chosen];
      return;
    }
    if (chosen.length + pending.length - index <= best.length) return;
    const t = pending[index];
    const assessment = assess(c, t, working);
    for (const id of assessment.eligibleCandidateIds) {
      const next = working.map((x) =>
        x.id === t.id
          ? {
              ...x,
              status: 'accepted' as const,
              assigneeId: id,
              proposedAssigneeId: null,
            }
          : x,
      );
      search(index + 1, next, [
        ...chosen,
        {
          taskId: t.id,
          candidateId: id,
          reason: `${member(c, id).name} is available for the whole commitment, has the needed capabilities, and has no conflicting accepted commitment.`,
        },
      ]);
    }
    search(index + 1, working, chosen);
  }
  search(0, c.tasks, []);
  best.sort(
    (a, b) =>
      task(c, a.taskId).start.localeCompare(task(c, b.taskId).start) ||
      a.taskId.localeCompare(b.taskId),
  );
  return {
    searchLimited: visited > 4096,
    id: `plan-${c.version}`,
    basedOnVersion: c.version,
    createdAt: new Date().toISOString(),
    assignments: best,
    assessments: pending.map((t) => ({
      taskId: t.id,
      candidates: assess(c, t).candidates,
    })),
    unresolved: pending
      .filter((t) => !best.some((a) => a.taskId === t.id))
      .map((t) => t.id),
  };
}
export function applyTransition(
  c: Circle,
  t: Task,
  action: Parameters<typeof transitionCommitment>[1],
  actorId: string,
  now: string,
) {
  const result = transitionCommitment(t, action, {
    actorId,
    expectedVersion: t.version,
    now,
    eventId: crypto.randomUUID(),
  });
  if (!result.ok)
    throw new DomainError(
      result.error.code,
      result.error.message,
      result.error.code === 'FORBIDDEN' ? 403 : 409,
    );
  const next = { ...t, ...result.commitment };
  c.tasks = c.tasks.map((x) => (x.id === t.id ? next : x));
  c.events.push({
    id: result.event.id,
    at: now,
    actorId,
    action: action.type,
    taskId: t.id,
    detail: `${t.title}: ${t.status} → ${next.status}`,
    version: c.version + 1,
  });
  return next;
}
export function brief(c: Circle) {
  const unclaimed = c.tasks.filter(
    (t) =>
      t.status === 'open' || t.status === 'blocked' || t.status === 'offered',
  );
  const accepted = c.tasks.filter((t) => t.status === 'accepted');
  const waiting = accepted.filter((t) => !readiness(c, t).ready);
  return {
    version: c.contentVersion,
    recipient: c.recipient,
    summary: unclaimed.length
      ? `${unclaimed.length} commitment${unclaimed.length === 1 ? ' still needs' : 's still need'} someone to accept. ${waiting.length ? `${waiting.length} accepted commitment is waiting on an earlier task.` : ''}`
      : waiting.length
        ? `Every commitment has an accepted helper or is done. ${waiting.length} still depends on an earlier task being completed.`
        : 'Every commitment has an accepted helper or is done.',
    unclaimed: unclaimed.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      proposedTo: t.proposedAssigneeId
        ? member(c, t.proposedAssigneeId).name
        : null,
    })),
    accepted: accepted.map((t) => ({
      id: t.id,
      title: t.title,
      person: member(c, t.assigneeId!).name,
      start: t.start,
      ...readiness(c, t),
    })),
    notes: c.notes.slice(-8),
    changes: c.events.filter((e) => e.action !== 'acknowledge').slice(-10),
  };
}
