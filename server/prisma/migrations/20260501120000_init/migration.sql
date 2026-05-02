-- CreateTable
CREATE TABLE `users` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(50) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('ADMIN', 'USER') NOT NULL DEFAULT 'USER',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  UNIQUE INDEX `users_username_key`(`username`),
  UNIQUE INDEX `users_email_key`(`email`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `articles` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `author_id` INTEGER NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `slug` VARCHAR(220) NOT NULL,
  `content_markdown` LONGTEXT NOT NULL,
  `content_html` LONGTEXT NOT NULL,
  `chapter_order` INTEGER NOT NULL DEFAULT 0,
  `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  UNIQUE INDEX `articles_slug_key`(`slug`),
  INDEX `articles_author_id_idx`(`author_id`),
  INDEX `articles_status_chapter_order_idx`(`status`, `chapter_order`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `article_images` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `article_id` INTEGER NOT NULL,
  `image_url` VARCHAR(255) NOT NULL,
  `alt_text` VARCHAR(255) NULL,
  `sort_order` INTEGER NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  INDEX `article_images_article_id_sort_order_idx`(`article_id`, `sort_order`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `comments` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `article_id` INTEGER NOT NULL,
  `user_id` INTEGER NOT NULL,
  `parent_id` INTEGER NULL,
  `content` TEXT NOT NULL,
  `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'APPROVED',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  INDEX `comments_article_id_status_created_at_idx`(`article_id`, `status`, `created_at`),
  INDEX `comments_parent_id_idx`(`parent_id`),
  INDEX `comments_user_id_idx`(`user_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_sessions` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `user_id` INTEGER NOT NULL,
  `device_id` VARCHAR(191) NOT NULL,
  `ip_address` VARCHAR(45) NULL,
  `user_agent` VARCHAR(500) NULL,
  `token_hash` VARCHAR(255) NOT NULL,
  `last_active_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  UNIQUE INDEX `user_sessions_token_hash_key`(`token_hash`),
  INDEX `user_sessions_user_id_device_id_idx`(`user_id`, `device_id`),
  INDEX `user_sessions_user_id_is_active_last_active_at_idx`(`user_id`, `is_active`, `last_active_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `article_versions` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `article_id` INTEGER NOT NULL,
  `editor_id` INTEGER NULL,
  `version_number` INTEGER NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `slug` VARCHAR(220) NOT NULL,
  `content_markdown` LONGTEXT NOT NULL,
  `content_html` LONGTEXT NOT NULL,
  `chapter_order` INTEGER NOT NULL DEFAULT 0,
  `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  UNIQUE INDEX `article_versions_article_id_version_number_key`(`article_id`, `version_number`),
  INDEX `article_versions_editor_id_idx`(`editor_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `articles`
  ADD CONSTRAINT `articles_author_id_fkey`
  FOREIGN KEY (`author_id`) REFERENCES `users`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `article_images`
  ADD CONSTRAINT `article_images_article_id_fkey`
  FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comments`
  ADD CONSTRAINT `comments_article_id_fkey`
  FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comments`
  ADD CONSTRAINT `comments_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comments`
  ADD CONSTRAINT `comments_parent_id_fkey`
  FOREIGN KEY (`parent_id`) REFERENCES `comments`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_sessions`
  ADD CONSTRAINT `user_sessions_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `article_versions`
  ADD CONSTRAINT `article_versions_article_id_fkey`
  FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `article_versions`
  ADD CONSTRAINT `article_versions_editor_id_fkey`
  FOREIGN KEY (`editor_id`) REFERENCES `users`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
