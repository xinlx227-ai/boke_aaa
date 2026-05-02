-- AlterTable
ALTER TABLE `articles`
  ADD COLUMN `category_id` INTEGER NULL;

-- CreateTable
CREATE TABLE `categories` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(80) NOT NULL,
  `slug` VARCHAR(100) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  UNIQUE INDEX `categories_name_key`(`name`),
  UNIQUE INDEX `categories_slug_key`(`slug`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tags` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(80) NOT NULL,
  `slug` VARCHAR(100) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  UNIQUE INDEX `tags_name_key`(`name`),
  UNIQUE INDEX `tags_slug_key`(`slug`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `article_tags` (
  `article_id` INTEGER NOT NULL,
  `tag_id` INTEGER NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `article_tags_tag_id_idx`(`tag_id`),
  PRIMARY KEY (`article_id`, `tag_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `articles_category_id_idx` ON `articles`(`category_id`);

-- AddForeignKey
ALTER TABLE `articles`
  ADD CONSTRAINT `articles_category_id_fkey`
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `article_tags`
  ADD CONSTRAINT `article_tags_article_id_fkey`
  FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `article_tags`
  ADD CONSTRAINT `article_tags_tag_id_fkey`
  FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
