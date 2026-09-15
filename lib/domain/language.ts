import type { Circle } from './types';
// Credential-free simulation: a bounded intent grammar, never presented as an LLM.
// Production Alexa supplies its own language understanding over the same tools.
export type Intent =
  | {
      kind: 'unavailable';
      memberId: string;
      from: string;
      to: string;
      reason: string;
    }
  | { kind: 'brief' | 'recovery' }
  | { kind: 'note'; text: string }
  | { kind: 'help'; message: string };
export function interpret(
  text: string,
  c: Circle,
  actorId: string,
  now = new Date(),
): Intent {
  const normalized = text
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .trim();
  if (
    /\b(medication|medicine|dosage|dose|chest pain|emergency|suicide|stroke)\b/.test(
      normalized,
    )
  )
    return {
      kind: 'help',
      message:
        'KindHandoff coordinates everyday support. It cannot assess symptoms, give medical advice, or provide emergency help. Contact an appropriate local professional or emergency service for urgent concerns.',
    };
  if (/\b(ignore|system prompt|override|bypass)\b/.test(normalized))
    return {
      kind: 'help',
      message:
        'I can help with practical commitments, availability, notes, and handoff briefs.',
    };
  if (
    /\b(brief|next helper|what.*know|summary|what.*happen)\b/.test(normalized)
  )
    return { kind: 'brief' };
  if (
    /\b(plan b|find.*help|recover|replacement|who can|cover.*day|repair.*plan)\b/.test(
      normalized,
    )
  )
    return { kind: 'recovery' };
  if (/^(note|remember|add a note)[: ,]/.test(normalized)) {
    const note = text.replace(/^(note|remember|add a note)[: ,]+/i, '').trim();
    return note
      ? { kind: 'note', text: note }
      : {
          kind: 'help',
          message:
            'Start with “Note:” followed by what the next helper should know.',
        };
  }
  if (
    /\b(can't|cannot|unavailable|fell through|cancel|won't|unable|not available)\b/.test(
      normalized,
    )
  ) {
    if (/\b(tomorrow|yesterday|next week)\b/.test(normalized))
      return {
        kind: 'help',
        message:
          'Choose the exact date and time with Report a change. The free simulator only interprets “today” or “this afternoon”.',
      };
    const named = c.members.filter((m) =>
      new RegExp(
        `\\b${m.name.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`,
      ).test(normalized),
    );
    if (named.length > 1)
      return {
        kind: 'help',
        message:
          'More than one helper is mentioned. Use Report a change to choose exactly who is unavailable.',
      };
    const memberId = named[0]?.id ?? actorId;
    if (
      !/(^|\s)(i|i'm|i am|me|my)(?=\s|[,.:!?]|$)/.test(normalized) &&
      !named.length
    )
      return {
        kind: 'help',
        message:
          'Please identify the helper and time interval using Report a change.',
      };
    const actor = c.members.find((m) => m.id === memberId)!;
    const dayFormat = new Intl.DateTimeFormat('en-CA', {
      timeZone: c.timeZone,
    });
    const today = dayFormat.format(now);
    const tasks = c.tasks.filter(
      (t) =>
        t.assigneeId === memberId &&
        t.status === 'accepted' &&
        dayFormat.format(new Date(t.start)) === today &&
        (!normalized.includes('afternoon') ||
          Number(
            new Intl.DateTimeFormat('en-GB', {
              hour: '2-digit',
              hourCycle: 'h23',
              timeZone: c.timeZone,
            }).format(new Date(t.start)),
          ) >= 12),
    );
    if (!tasks.length)
      return {
        kind: 'help',
        message: `${actor.name} has no accepted commitments to cancel. You can edit availability in Your circle.`,
      };
    const localDates = new Set(
      tasks.map((t) =>
        new Intl.DateTimeFormat('en-CA', { timeZone: c.timeZone }).format(
          new Date(t.start),
        ),
      ),
    );
    if (localDates.size > 1)
      return {
        kind: 'help',
        message:
          'These commitments span more than one day. Use Report a change to specify the exact interval.',
      };
    const start = tasks.map((t) => t.start).sort()[0];
    const end = tasks
      .map((t) => t.end)
      .sort()
      .at(-1)!;
    return {
      kind: 'unavailable',
      memberId,
      from: start,
      to: end,
      reason: text,
    };
  }
  return {
    kind: 'help',
    message:
      'Try “I can’t make it this afternoon”, “Who can help?”, “What should the next helper know?”, or “Note: the blue bag is by the door”. For other changes, use the commitment and circle controls.',
  };
}
