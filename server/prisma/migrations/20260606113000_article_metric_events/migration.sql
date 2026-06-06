-- CreateTable
CREATE TABLE `article_metric_events` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `article_id` INTEGER NOT NULL,
  `user_id` INTEGER NOT NULL,
  `actor_user_id` INTEGER NULL,
  `metric` VARCHAR(20) NOT NULL,
  `delta` INTEGER NOT NULL,
  `occurred_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `article_metric_events_user_id_metric_occurred_at_idx`(`user_id`, `metric`, `occurred_at`),
  INDEX `article_metric_events_article_id_metric_occurred_at_idx`(`article_id`, `metric`, `occurred_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
