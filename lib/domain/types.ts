import type {
  Commitment,
  Candidate,
  CandidateAssessment,
} from '../../packages/handoff-guard/src/index';
export type Member = { -readonly [K in keyof Candidate]: Candidate[K] } & {
  name: string;
  role: 'owner' | 'helper';
  color: string;
  relation: string;
};
export type Task = Commitment & {
  title: string;
  details: string;
  start: string;
  end: string;
  requiredCapabilities: string[];
  dependsOn: string[];
  source: string;
};
export type Event = {
  id: string;
  at: string;
  actorId: string;
  action: string;
  detail: string;
  taskId?: string;
  version: number;
};
export type Note = { id: string; actorId: string; text: string; at: string };
export type Plan = {
  searchLimited?: boolean;
  id: string;
  basedOnVersion: number;
  createdAt: string;
  assignments: { taskId: string; candidateId: string; reason: string }[];
  assessments: { taskId: string; candidates: readonly CandidateAssessment[] }[];
  unresolved: string[];
};
export type Circle = {
  id: string;
  version: number;
  contentVersion: number;
  name: string;
  recipient: string;
  timeZone: string;
  demo: boolean;
  members: Member[];
  tasks: Task[];
  events: Event[];
  notes: Note[];
  plan: Plan | null;
  receipts: {
    requestId: string;
    fingerprint: string;
    actorId: string;
    message: string;
  }[];
  acknowledgments: { memberId: string; version: number; at: string }[];
};
export type Principal = {
  circleId: string;
  memberId: string;
  kind: 'owner' | 'helper' | 'demo' | 'mcp';
  identity?: string;
};
export type Snapshot = {
  circle: Circle;
  memberId: string;
  kind: Principal['kind'];
  signedIn: boolean;
};
export class DomainError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}
