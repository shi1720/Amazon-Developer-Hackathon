import { describe, expect, it } from 'vitest';
import { seedCircle } from '../lib/domain/seed';
import type { Snapshot } from '../lib/domain/types';
import {
  calendarDay,
  captureCircleReview,
  commitmentsForDay,
  dayLabel,
  defaultCommitmentWindow,
  reconcileSnapshot,
  isReviewCurrent,
  reviewedMutationVersion,
  shiftCalendarDay,
} from '../lib/ui-model';

function snapshot(): Snapshot {
  return {
    circle: seedCircle('ui-circle'),
    memberId: 'maya',
    kind: 'demo',
    signedIn: false,
  };
}

describe('UI session reconciliation', () => {
  it('does not overwrite a newly accepted handoff with a slower, older refresh', () => {
    const current = snapshot();
    current.circle.version = 4;
    current.circle.notes.push({
      id: 'saved',
      actorId: 'maya',
      text: 'Newly saved',
      at: new Date().toISOString(),
    });
    const stale = snapshot();
    stale.circle.version = 3;
    expect(reconcileSnapshot(current, stale)?.circle).toBe(current.circle);
  });
  it('removes private circle state when the session expires', () => {
    expect(
      reconcileSnapshot(snapshot(), { circle: null, signedIn: false }),
    ).toBeNull();
  });
  it('preserves a selected synthetic role only within the same demo circle', () => {
    const current = { ...snapshot(), memberId: 'jo' };
    expect(reconcileSnapshot(current, snapshot())?.memberId).toBe('jo');
    const another = snapshot();
    another.circle.id = 'other-demo';
    expect(reconcileSnapshot(current, another)?.memberId).toBe('maya');
  });
  it('uses the actual invited helper identity instead of carrying over a demo role', () => {
    const current = { ...snapshot(), memberId: 'maya' };
    const invited: Snapshot = { ...snapshot(), memberId: 'jo', kind: 'helper' };
    expect(reconcileSnapshot(current, invited)?.memberId).toBe('jo');
  });
  it('falls back to the valid demo coordinator after resetting an added helper role', () => {
    const current = { ...snapshot(), memberId: 'removed-helper' };
    expect(reconcileSnapshot(current, snapshot())?.memberId).toBe('maya');
  });
});

describe('a form keeps the circle revision that was reviewed', () => {
  it('rejects an availability draft after a background refresh records a new gap', () => {
    const opened = snapshot();
    const review = captureCircleReview(opened);
    const incoming = snapshot();
    incoming.circle.version++;
    incoming.circle.members[0].availability = [];
    const refreshed = reconcileSnapshot(opened, incoming)!;
    expect(isReviewCurrent(refreshed, review)).toBe(false);
    expect(() => reviewedMutationVersion(refreshed, review)).toThrow(
      'Your draft has not been saved',
    );
    expect(refreshed.circle.members[0].availability).toEqual([]);
  });

  it('uses the captured revision while it remains current', () => {
    const current = snapshot();
    current.circle.version = 12;
    const review = captureCircleReview(current);
    expect(reviewedMutationVersion(current, review)).toBe(12);
  });

  it('fails closed when a reviewed version is missing instead of using the latest one', () => {
    expect(() => reviewedMutationVersion(snapshot(), null)).toThrow(
      'Close this form',
    );
  });

  it('rejects a same-version draft after switching circles or actor identity', () => {
    const current = snapshot();
    const review = captureCircleReview(current);
    const otherCircle = snapshot();
    otherCircle.circle.id = 'other-circle';
    expect(() => reviewedMutationVersion(otherCircle, review)).toThrow();
    expect(() =>
      reviewedMutationVersion({ ...current, memberId: 'jo' }, review),
    ).toThrow();
    expect(() =>
      reviewedMutationVersion({ ...current, kind: 'helper' }, review),
    ).toThrow();
  });
});

describe('a day in the family circle', () => {
  it('keeps an overnight commitment visible on both days without copying its old start into a new form', () => {
    const circle = seedCircle('overnight');
    const overnight = {
      ...circle.tasks[1],
      start: '2026-09-15T18:00:00.000Z',
      end: '2026-09-15T19:00:00.000Z',
    };
    circle.tasks = [overnight];
    expect(
      commitmentsForDay(circle.tasks, '2026-09-15', 'Asia/Kolkata'),
    ).toEqual([overnight]);
    expect(
      commitmentsForDay(circle.tasks, '2026-09-16', 'Asia/Kolkata'),
    ).toEqual([overnight]);
    expect(defaultCommitmentWindow(circle, '2026-09-16')).toEqual({
      start: '2026-09-16T03:30:00.000Z',
      end: '2026-09-16T04:30:00.000Z',
    });
  });

  it('excludes a commitment from the next day when it ends exactly at local midnight', () => {
    const circle = seedCircle('midnight');
    circle.tasks = [
      {
        ...circle.tasks[1],
        start: '2026-09-15T18:00:00.000Z',
        end: '2026-09-15T18:30:00.000Z',
      },
    ];
    expect(
      commitmentsForDay(circle.tasks, '2026-09-15', 'Asia/Kolkata'),
    ).toHaveLength(1);
    expect(
      commitmentsForDay(circle.tasks, '2026-09-16', 'Asia/Kolkata'),
    ).toHaveLength(0);
  });

  it('uses actual local calendar dates across a 23-hour daylight-saving day', () => {
    const circle = seedCircle('dst');
    circle.tasks = [
      {
        ...circle.tasks[1],
        start: '2026-03-08T04:30:00.000Z',
        end: '2026-03-09T04:00:00.000Z',
      },
    ];
    expect(
      commitmentsForDay(circle.tasks, '2026-03-07', 'America/New_York'),
    ).toHaveLength(1);
    expect(
      commitmentsForDay(circle.tasks, '2026-03-08', 'America/New_York'),
    ).toHaveLength(1);
    expect(
      commitmentsForDay(circle.tasks, '2026-03-09', 'America/New_York'),
    ).toHaveLength(0);
  });
  it('groups by the circle time zone, even across a UTC midnight', () => {
    expect(calendarDay('2026-09-15T00:30:00.000Z', 'America/Los_Angeles')).toBe(
      '2026-09-14',
    );
    expect(calendarDay('2026-09-15T00:30:00.000Z', 'Asia/Kolkata')).toBe(
      '2026-09-15',
    );
  });
  it('navigates calendar dates correctly across a leap day and year boundary', () => {
    expect(shiftCalendarDay('2028-02-28', 1)).toBe('2028-02-29');
    expect(shiftCalendarDay('2028-03-01', -1)).toBe('2028-02-29');
    expect(shiftCalendarDay('2026-12-31', 1)).toBe('2027-01-01');
  });
  it('shows only the selected day in chronological order', () => {
    const circle = seedCircle('test');
    const template = circle.tasks[1];
    const tasks = [
      { ...template, id: 'evening', start: '2026-09-15T12:30:00.000Z' },
      { ...template, id: 'tomorrow', start: '2026-09-16T03:30:00.000Z' },
      { ...template, id: 'morning', start: '2026-09-15T03:30:00.000Z' },
    ];
    expect(
      commitmentsForDay(tasks, '2026-09-15', circle.timeZone).map(
        (task) => task.id,
      ),
    ).toEqual(['morning', 'evening']);
  });
  it('does not label an empty date with a different day’s commitments', () => {
    const circle = seedCircle('test');
    expect(
      commitmentsForDay(circle.tasks, '2001-01-01', circle.timeZone),
    ).toEqual([]);
    expect(dayLabel('2026-09-15')).toBe('Tuesday, September 15, 2026');
  });
  it('preserves the demo’s exact first pending commitment when opening a new form', () => {
    const circle = seedCircle('test');
    const bag = circle.tasks.find((task) => task.id === 'bag')!;
    expect(
      defaultCommitmentWindow(circle, calendarDay(bag.start, circle.timeZone)),
    ).toEqual({ start: bag.start, end: bag.end });
  });
  it('uses a selected empty day in the circle time zone for new commitments', () => {
    const circle = seedCircle('test');
    circle.tasks = [];
    expect(defaultCommitmentWindow(circle, '2026-09-20')).toEqual({
      start: '2026-09-20T03:30:00.000Z',
      end: '2026-09-20T04:30:00.000Z',
    });
  });
  it('keeps 09:00 local time across a daylight-saving transition', () => {
    const circle = seedCircle('test');
    circle.tasks = [];
    circle.timeZone = 'America/New_York';
    expect(defaultCommitmentWindow(circle, '2026-03-07').start).toBe(
      '2026-03-07T14:00:00.000Z',
    );
    expect(defaultCommitmentWindow(circle, '2026-03-08').start).toBe(
      '2026-03-08T13:00:00.000Z',
    );
  });
});
