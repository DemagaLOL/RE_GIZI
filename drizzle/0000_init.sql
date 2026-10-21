CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text NOT NULL,
	`profile_id` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_email_unique` ON `accounts` (`email`);--> statement-breakpoint
CREATE TABLE `batches` (
	`id` text PRIMARY KEY NOT NULL,
	`sppg_id` text NOT NULL,
	`menu` text NOT NULL,
	`category` text NOT NULL,
	`unit` text NOT NULL,
	`quantity` real NOT NULL,
	`remaining_quantity` real NOT NULL,
	`cooked_at` text NOT NULL,
	`safe_until` text NOT NULL,
	`status` text NOT NULL,
	`notes` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`sppg_id`) REFERENCES `sppg`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `batches_status_safe_until_idx` ON `batches` (`status`,`safe_until`);--> statement-breakpoint
CREATE INDEX `batches_sppg_id_idx` ON `batches` (`sppg_id`);--> statement-breakpoint
CREATE TABLE `claims` (
	`id` text PRIMARY KEY NOT NULL,
	`batch_id` text NOT NULL,
	`recipient_id` text NOT NULL,
	`quantity` real NOT NULL,
	`status` text NOT NULL,
	`pickup_code` text NOT NULL,
	`claimed_at` text NOT NULL,
	`picked_up_at` text,
	FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recipient_id`) REFERENCES `recipients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `claims_pickup_code_unique` ON `claims` (`pickup_code`);--> statement-breakpoint
CREATE INDEX `claims_batch_id_idx` ON `claims` (`batch_id`);--> statement-breakpoint
CREATE INDEX `claims_recipient_id_idx` ON `claims` (`recipient_id`);--> statement-breakpoint
CREATE TABLE `login_throttle` (
	`email` text PRIMARY KEY NOT NULL,
	`failures` integer NOT NULL,
	`locked_until` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `recipients` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`district` text NOT NULL,
	`regency` text NOT NULL,
	`lat` real NOT NULL,
	`lng` real NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_expires_at_idx` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `sppg` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`operator` text NOT NULL,
	`address` text NOT NULL,
	`district` text NOT NULL,
	`regency` text NOT NULL,
	`lat` real NOT NULL,
	`lng` real NOT NULL,
	`daily_capacity` integer NOT NULL
);
