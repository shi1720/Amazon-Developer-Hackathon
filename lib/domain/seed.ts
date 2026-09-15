import type { Circle, Member, Task } from './types';
export function seedCircle(
  id: string,
  demo = true,
  recipient = 'Arun',
  ownerName = 'Maya',
  timeZone = 'Asia/Kolkata',
): Circle {
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
  }).format(new Date());
  const t = (h: string) => `${date}T${h}:00.000Z`;
  // The illustrative day uses IST, stored as UTC. Live commitments use explicit instants.
  const members: Member[] = demo
    ? [
        {
          id: 'maya',
          name: 'Maya',
          role: 'owner',
          color: 'av-blue',
          relation: 'Daughter · Coordinator',
          canAccept: true,
          capabilities: ['home_access', 'driving', 'company'],
          availability: [{ start: t('03:30'), end: t('14:30') }],
        },
        {
          id: 'dev',
          name: 'Dev',
          role: 'helper',
          color: 'av-lilac',
          relation: 'Son',
          canAccept: true,
          capabilities: ['driving', 'company'],
          availability: [{ start: t('09:15'), end: t('12:30') }],
        },
        {
          id: 'jo',
          name: 'Jo',
          role: 'helper',
          color: 'av-peach',
          relation: 'Neighbour',
          canAccept: true,
          capabilities: ['home_access', 'company'],
          availability: [{ start: t('08:30'), end: t('09:30') }],
        },
      ]
    : [
        {
          id: 'owner',
          name: ownerName,
          role: 'owner',
          color: 'av-blue',
          relation: 'Coordinator',
          canAccept: true,
          capabilities: ['home_access', 'driving', 'company'],
          availability: [],
        },
      ];
  const base = {
    ownerId: members[0].id,
    version: 0,
    proposedAssigneeId: null,
    requiredCapabilities: [],
    dependsOn: [],
  };
  const tasks: Task[] = demo
    ? [
        {
          ...base,
          id: 'lunch',
          title: 'Lunch & a little company',
          details: 'Soup is in the fridge. Sit down together.',
          start: t('07:00'),
          end: t('07:30'),
          requiredCapabilities: ['company'],
          status: 'done',
          assigneeId: 'jo',
          source: 'Jo confirmed lunch in this illustrative scenario.',
        },
        {
          ...base,
          id: 'bag',
          title: 'Pack the library bag',
          details: 'Library card, reading glasses, and the blue bag.',
          start: t('09:00'),
          end: t('09:15'),
          requiredCapabilities: ['home_access'],
          status: 'accepted',
          assigneeId: 'maya',
          source: 'Maya accepted this illustrative commitment.',
        },
        {
          ...base,
          id: 'ride',
          title: 'A lift to the library',
          details: `${recipient}’s book club. Back home by 4 pm.`,
          start: t('09:30'),
          end: t('10:30'),
          requiredCapabilities: ['driving'],
          dependsOn: ['bag'],
          status: 'accepted',
          assigneeId: 'maya',
          source: 'Maya accepted this illustrative commitment.',
        },
      ]
    : [];
  return {
    id,
    version: 0,
    contentVersion: 0,
    name: `${recipient}’s circle`,
    recipient,
    timeZone: demo ? 'Asia/Kolkata' : timeZone,
    demo,
    members,
    tasks,
    events: [],
    notes: demo
      ? [
          {
            id: 'welcome',
            actorId: 'jo',
            text: 'The blue bag is by the front door. Arun is looking forward to book club.',
            at: t('07:35'),
          },
        ]
      : [],
    plan: null,
    receipts: [],
    acknowledgments: [],
  };
}
