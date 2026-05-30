-- AlterTable
ALTER TABLE `articles`
  ADD COLUMN `published_at` DATETIME(3) NULL;

-- Backfill existing published articles so current content keeps a stable publish order.
UPDATE `articles`
SET `published_at` = `updated_at`
WHERE `status` = 'PUBLISHED' AND `published_at` IS NULL;

-- CreateIndex
CREATE INDEX `articles_status_published_at_idx` ON `articles`(`status`, `published_at`);
