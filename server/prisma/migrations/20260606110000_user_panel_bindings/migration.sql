ALTER TABLE `users`
  ADD COLUMN `phone_number` VARCHAR(20) NULL,
  ADD COLUMN `wechat_bound` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `qq_bound` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `alipay_bound` BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX `users_phone_number_key` ON `users`(`phone_number`);
