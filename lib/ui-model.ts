import type { SessionResponse } from './api-client';
import type { Circle, Snapshot, Task } from './domain/types';

export type CircleReview = {
  circleId: string;
  version: number;
  memberId: string;
  kind: Snapshot['kind'];
};
export const staleReviewMessage =
  'The circle changed while this form was open. Your draft has not been saved. Close this form and reopen it to review the latest details.';

export function captureCircleReview(snapshot: Snapshot): CircleReview {
  return {
    circleId: snapshot.circle.id,
    version: snapshot.circle.version,
    memberId: snapshot.memberId,
    kind: snapshot.kind,
  };
}

export function isReviewCurrent(
  snapshot: Snapshot,
  review: CircleReview | null,
): boolean {
  return (
    review !== null &&
    snapshot.circle.id === review.circleId &&
    snapshot.circle.version === review.version &&
    snapshot.memberId === review.memberId &&
    snapshot.kind === review.kind
  );
}

/** A polled snapshot must never silently rebase an older form's write. */
export function reviewedMutationVersion(
  snapshot: Snapshot,
  review: CircleReview | null,
): number {
  if (!isReviewCurrent(snapshot, review)) throw new Error(staleReviewMessage);
  return review!.version;
}

/** A slow background read must not roll back a newer confirmed server write. */
export function reconcileSnapshot(
  current: Snapshot | null,
  incoming: SessionResponse,
): Snapshot | null {
  if (!incoming.circle) return null;
  const sameCircle = current?.circle.id === incoming.circle.id;
  const circle =
    sameCircle && current.circle.version > incoming.circle.version
      ? current.circle
      : incoming.circle;
  const memberId =
    sameCircle &&
    current.kind === 'demo' &&
    incoming.kind === 'demo' &&
    circle.members.some((member) => member.id === current.memberId)
      ? current.memberId
      : incoming.memberId;
  return { ...incoming, circle, memberId };
}

export function calendarDay(
  instant: string | number,
  timeZone: string,
): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(instant));
  const part = (name: string) =>
    parts.find((value) => value.type === name)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function shiftCalendarDay(day: string, offset: number): string {
  const date = new Date(`${day}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

export function dayLabel(day: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${day}T12:00:00.000Z`));
}

export function commitmentsForDay(
  tasks: readonly Task[],
  day: string,
  timeZone: string,
): Task[] {
  return tasks
    .filter(
      (task) =>
        calendarDay(task.start, timeZone) <= day &&
        calendarDay(Date.parse(task.end) - 1, timeZone) >= day,
    )
    .sort(
      (left, right) =>
        left.start.localeCompare(right.start) ||
        left.id.localeCompare(right.id),
    );
}

/** Start at 09:00 in the circle's zone, including when the viewer is elsewhere. */
function morningInZone(day: string, timeZone: string): number {
  const target = Date.parse(`${day}T09:00:00.000Z`);
  let instant = target;
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  for (let attempt = 0; attempt < 3; attempt++) {
    const parts = formatter.formatToParts(new Date(instant));
    const part = (name: string) =>
      parts.find((value) => value.type === name)!.value;
    const represented = Date.parse(
      `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}:${part('second')}.000Z`,
    );
    instant += target - represented;
  }
  return instant;
}

export function defaultCommitmentWindow(
  circle: Circle,
  day: string,
): { start: string; end: string } {
  const next = commitmentsForDay(circle.tasks, day, circle.timeZone).find(
    (task) =>
      task.status !== 'done' &&
      calendarDay(task.start, circle.timeZone) === day,
  );
  if (next) return { start: next.start, end: next.end };
  const morning = morningInZone(day, circle.timeZone);
  return {
    start: new Date(morning).toISOString(),
    end: new Date(morning + 3600000).toISOString(),
  };
}
