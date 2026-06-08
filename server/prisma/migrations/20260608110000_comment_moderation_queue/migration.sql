ALTER TABLE `comments`
  ADD COLUMN `moderation_status` VARCHAR(20) NULL,
  ADD COLUMN `moderation_reason` VARCHAR(255) NULL,
  ADD COLUMN `moderation_keywords` VARCHAR(255) NULL,
  ADD COLUMN `moderated_at` DATETIME(3) NULL,
  ADD COLUMN `moderator_id` INT NULL;

CREATE INDEX `comments_moderation_status_created_at_idx`
  ON `comments`(`moderation_status`, `created_at`);

CREATE INDEX `comments_moderator_id_idx`
  ON `comments`(`moderator_id`);

ALTER TABLE `comments`
  ADD CONSTRAINT `comments_moderator_id_fkey`
  FOREIGN KEY (`moderator_id`) REFERENCES `users`(`id`)
  ON DELETE SET NULL
  ON UPDATE CASCADE;
