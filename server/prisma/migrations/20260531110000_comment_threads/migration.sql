-- AlterTable
ALTER TABLE `comments`
  ADD COLUMN `reply_to_comment_id` INTEGER NULL;

-- CreateTable
CREATE TABLE `comment_likes` (
  `comment_id` INTEGER NOT NULL,
  `user_id` INTEGER NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `comment_likes_user_id_idx`(`user_id`),
  PRIMARY KEY (`comment_id`, `user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `comments_reply_to_comment_id_idx` ON `comments`(`reply_to_comment_id`);

-- AddForeignKey
ALTER TABLE `comments`
  ADD CONSTRAINT `comments_reply_to_comment_id_fkey`
  FOREIGN KEY (`reply_to_comment_id`) REFERENCES `comments`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comment_likes`
  ADD CONSTRAINT `comment_likes_comment_id_fkey`
  FOREIGN KEY (`comment_id`) REFERENCES `comments`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comment_likes`
  ADD CONSTRAINT `comment_likes_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
