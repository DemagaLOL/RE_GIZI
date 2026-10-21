ALTER TABLE `claims` ADD `cancel_reason` text;--> statement-breakpoint
-- Sebelum kolom ini ada, klaim hanya bisa batal karena batch turun kategori.
UPDATE `claims` SET `cancel_reason` = 'degraded' WHERE `status` = 'cancelled';
