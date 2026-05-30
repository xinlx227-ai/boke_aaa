-- CreateTable
CREATE TABLE `article_stats` (
  `article_id` INTEGER NOT NULL,
  `view_count` INTEGER NOT NULL DEFAULT 0,
  `like_count` INTEGER NOT NULL DEFAULT 0,
  `favorite_count` INTEGER NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  PRIMARY KEY (`article_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `article_views` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `article_id` INTEGER NOT NULL,
  `user_id` INTEGER NULL,
  `visitor_id` VARCHAR(100) NULL,
  `viewed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `article_views_article_id_viewed_at_idx`(`article_id`, `viewed_at`),
  INDEX `article_views_article_id_user_id_viewed_at_idx`(`article_id`, `user_id`, `viewed_at`),
  INDEX `article_views_article_id_visitor_id_viewed_at_idx`(`article_id`, `visitor_id`, `viewed_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `article_likes` (
  `article_id` INTEGER NOT NULL,
  `user_id` INTEGER NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `article_likes_user_id_idx`(`user_id`),
  PRIMARY KEY (`article_id`, `user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `article_favorites` (
  `article_id` INTEGER NOT NULL,
  `user_id` INTEGER NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `article_favorites_user_id_idx`(`user_id`),
  PRIMARY KEY (`article_id`, `user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `site_visits` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `page_type` VARCHAR(20) NOT NULL,
  `article_id` INTEGER NULL,
  `user_id` INTEGER NULL,
  `visitor_id` VARCHAR(100) NULL,
  `visited_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `site_visits_visited_at_idx`(`visited_at`),
  INDEX `site_visits_page_type_visited_at_idx`(`page_type`, `visited_at`),
  INDEX `site_visits_page_type_article_id_user_id_visited_at_idx`(`page_type`, `article_id`, `user_id`, `visited_at`),
  INDEX `site_visits_page_type_article_id_visitor_id_visited_at_idx`(`page_type`, `article_id`, `visitor_id`, `visited_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `article_stats`
  ADD CONSTRAINT `article_stats_article_id_fkey`
  FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `article_views`
  ADD CONSTRAINT `article_views_article_id_fkey`
  FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `article_views`
  ADD CONSTRAINT `article_views_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `article_likes`
  ADD CONSTRAINT `article_likes_article_id_fkey`
  FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `article_likes`
  ADD CONSTRAINT `article_likes_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `article_favorites`
  ADD CONSTRAINT `article_favorites_article_id_fkey`
  FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `article_favorites`
  ADD CONSTRAINT `article_favorites_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `site_visits`
  ADD CONSTRAINT `site_visits_article_id_fkey`
  FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `site_visits`
  ADD CONSTRAINT `site_visits_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
