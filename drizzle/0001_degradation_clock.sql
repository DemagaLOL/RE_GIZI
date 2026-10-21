CREATE TABLE `batch_category_events` (
	`id` text PRIMARY KEY NOT NULL,
	`batch_id` text NOT NULL,
	`from_category` text NOT NULL,
	`to_category` text NOT NULL,
	`quantity_before` real NOT NULL,
	`unit_before` text NOT NULL,
	`quantity_after` real NOT NULL,
	`unit_after` text NOT NULL,
	`reason` text NOT NULL,
	`note` text,
	`occurred_at` text NOT NULL,
	FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `batch_category_events_batch_id_idx` ON `batch_category_events` (`batch_id`);--> statement-breakpoint
CREATE TABLE `sim_clock` (
	`id` integer PRIMARY KEY NOT NULL,
	`speed` real NOT NULL,
	`paused` integer NOT NULL,
	`real_anchor` integer NOT NULL,
	`sim_anchor` integer NOT NULL
);
--> statement-breakpoint
-- SQLite butuh default untuk kolom NOT NULL baru; nilainya langsung diisi dari batch asal.
ALTER TABLE `claims` ADD `category` text NOT NULL DEFAULT 'A';--> statement-breakpoint
ALTER TABLE `claims` ADD `unit` text NOT NULL DEFAULT 'porsi';--> statement-breakpoint
UPDATE `claims` SET
	`category` = (SELECT `category` FROM `batches` WHERE `batches`.`id` = `claims`.`batch_id`),
	`unit` = (SELECT `unit` FROM `batches` WHERE `batches`.`id` = `claims`.`batch_id`);