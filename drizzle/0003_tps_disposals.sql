CREATE TABLE `disposals` (
	`id` text PRIMARY KEY NOT NULL,
	`batch_id` text NOT NULL,
	`tps_id` text NOT NULL,
	`quantity` real NOT NULL,
	`collected_at` text NOT NULL,
	`note` text,
	FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tps_id`) REFERENCES `tps`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `disposals_batch_id_unique` ON `disposals` (`batch_id`);--> statement-breakpoint
CREATE INDEX `disposals_tps_id_idx` ON `disposals` (`tps_id`);--> statement-breakpoint
CREATE TABLE `tps` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`operator` text NOT NULL,
	`address` text NOT NULL,
	`district` text NOT NULL,
	`regency` text NOT NULL,
	`lat` real NOT NULL,
	`lng` real NOT NULL
);
