ALTER TABLE `batches` ADD `withdrawn_at` text;--> statement-breakpoint
ALTER TABLE `batches` ADD `withdraw_reason` text;--> statement-breakpoint
ALTER TABLE `claims` ADD `pickup_deadline` text;--> statement-breakpoint
CREATE INDEX `claims_status_pickup_deadline_idx` ON `claims` (`status`,`pickup_deadline`);