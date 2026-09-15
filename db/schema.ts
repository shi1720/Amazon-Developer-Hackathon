import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
export const circles = sqliteTable(
  'circles',
  {
    id: text('id').primaryKey(),
    ownerIdentity: text('owner_identity'),
    version: integer('version').notNull().default(0),
    data: text('data').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [uniqueIndex('idx_circles_owner').on(t.ownerIdentity)],
);
export const sessions = sqliteTable(
  'sessions',
  {
    tokenHash: text('token_hash').primaryKey(),
    circleId: text('circle_id')
      .notNull()
      .references(() => circles.id, { onDelete: 'cascade' }),
    memberId: text('member_id').notNull(),
    kind: text('kind').notNull(),
    expiresAt: text('expires_at').notNull(),
  },
  (t) => [
    index('idx_sessions_circle').on(t.circleId),
    index('idx_sessions_expiry').on(t.expiresAt),
  ],
);
export const invitations = sqliteTable(
  'invitations',
  {
    tokenHash: text('token_hash').primaryKey(),
    circleId: text('circle_id')
      .notNull()
      .references(() => circles.id, { onDelete: 'cascade' }),
    memberId: text('member_id').notNull(),
    expiresAt: text('expires_at').notNull(),
    redeemedAt: text('redeemed_at'),
  },
  (t) => [index('idx_invitations_circle').on(t.circleId)],
);
export const rateLimits = sqliteTable(
  'rate_limits',
  {
    bucket: text('bucket').primaryKey(),
    count: integer('count').notNull(),
    expiresAt: text('expires_at').notNull(),
  },
  (t) => [index('idx_rate_limits_expiry').on(t.expiresAt)],
);
