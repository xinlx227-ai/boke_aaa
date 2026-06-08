ALTER TABLE `articles`
  ADD COLUMN `cover_image_url` VARCHAR(255) NULL,
  ADD COLUMN `cover_alt` VARCHAR(255) NULL,
  ADD COLUMN `cover_ratio` VARCHAR(20) NULL DEFAULT '16:9',
  ADD COLUMN `seo_title` VARCHAR(200) NULL,
  ADD COLUMN `seo_keywords` VARCHAR(255) NULL,
  ADD COLUMN `seo_description` VARCHAR(500) NULL,
  ADD COLUMN `allow_comments` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `is_pinned` BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX `articles_status_is_pinned_published_at_idx`
  ON `articles`(`status`, `is_pinned`, `published_at`);
