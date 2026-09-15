CREATE TABLE `circles` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_identity` text,
	`version` integer DEFAULT 0 NOT NULL,
	`data` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_circles_owner` ON `circles` (`owner_identity`);--> statement-breakpoint
CREATE TABLE `invitations` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`circle_id` text NOT NULL,
	`member_id` text NOT NULL,
	`expires_at` text NOT NULL,
	`redeemed_at` text,
	FOREIGN KEY (`circle_id`) REFERENCES `circles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_invitations_circle` ON `invitations` (`circle_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`circle_id` text NOT NULL,
	`member_id` text NOT NULL,
	`kind` text NOT NULL,
	`expires_at` text NOT NULL,
	FOREIGN KEY (`circle_id`) REFERENCES `circles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_sessions_circle` ON `sessions` (`circle_id`);--> statement-breakpoint
CREATE INDEX `idx_sessions_expiry` ON `sessions` (`expires_at`);