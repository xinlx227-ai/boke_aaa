-- Extend article status for user submission review flow.
ALTER TABLE `articles`
  MODIFY `status` ENUM('DRAFT', 'PENDING_REVIEW', 'REJECTED', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT';

ALTER TABLE `article_versions`
  MODIFY `status` ENUM('DRAFT', 'PENDING_REVIEW', 'REJECTED', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT';

ALTER TABLE `articles`
  ADD COLUMN `submitted_at` DATETIME(3) NULL,
  ADD COLUMN `reviewed_at` DATETIME(3) NULL,
  ADD COLUMN `reviewer_id` INTEGER NULL,
  ADD COLUMN `review_note` VARCHAR(500) NULL;

CREATE INDEX `articles_reviewer_id_idx` ON `articles`(`reviewer_id`);

ALTER TABLE `articles`
  ADD CONSTRAINT `articles_reviewer_id_fkey`
  FOREIGN KEY (`reviewer_id`) REFERENCES `users`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
