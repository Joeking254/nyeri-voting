CREATE TABLE `categories` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `image_url` TEXT NULL,
  `order_index` INTEGER NOT NULL DEFAULT 0,
  `total_votes` BIGINT NOT NULL DEFAULT 0,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `voting_open` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `categories_name_key` (`name`),
  CONSTRAINT `categories_total_votes_nonnegative` CHECK (`total_votes` >= 0)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `nominees` (
  `id` VARCHAR(191) NOT NULL,
  `category_id` VARCHAR(191) NOT NULL,
  `full_name` VARCHAR(191) NOT NULL,
  `stage_name` VARCHAR(191) NULL,
  `bio` TEXT NULL,
  `photo_url` TEXT NULL,
  `social_handles` JSON NOT NULL DEFAULT (JSON_OBJECT()),
  `total_votes` BIGINT NOT NULL DEFAULT 0,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY (`id`),
  INDEX `nominees_category_id_idx` (`category_id`),
  INDEX `nominees_category_id_is_active_idx` (`category_id`, `is_active`),
  CONSTRAINT `nominees_total_votes_nonnegative` CHECK (`total_votes` >= 0),
  CONSTRAINT `nominees_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `admin_users` (
  `id` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `password_hash` VARCHAR(191) NOT NULL,
  `role` ENUM('super_admin', 'moderator') NOT NULL DEFAULT 'moderator',
  PRIMARY KEY (`id`),
  UNIQUE INDEX `admin_users_email_key` (`email`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `event_settings` (
  `id` VARCHAR(191) NOT NULL DEFAULT 'global',
  `voting_open` BOOLEAN NOT NULL DEFAULT true,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `event_settings_singleton` CHECK (`id` = 'global')
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
INSERT INTO `event_settings` (`id`, `voting_open`, `updated_at`) VALUES ('global', true, CURRENT_TIMESTAMP(3));

CREATE TABLE `vote_transactions` (
  `id` VARCHAR(191) NOT NULL,
  `checkout_request_id` VARCHAR(191) NULL,
  `merchant_request_id` VARCHAR(191) NULL,
  `phone_number` VARCHAR(12) NOT NULL,
  `nominee_id` VARCHAR(191) NOT NULL,
  `category_id` VARCHAR(191) NOT NULL,
  `number_of_votes` INTEGER NOT NULL,
  `amount_paid` INTEGER NOT NULL,
  `status` ENUM('PENDING', 'SUCCESS', 'FAILED') NOT NULL DEFAULT 'PENDING',
  `mpesa_receipt_number` VARCHAR(191) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `vote_transactions_checkout_request_id_key` (`checkout_request_id`),
  UNIQUE INDEX `vote_transactions_mpesa_receipt_number_key` (`mpesa_receipt_number`),
  INDEX `vote_transactions_status_idx` (`status`),
  INDEX `vote_transactions_status_created_at_idx` (`status`, `created_at`),
  INDEX `vote_transactions_nominee_id_status_idx` (`nominee_id`, `status`),
  CONSTRAINT `vote_transactions_positive_count` CHECK (`number_of_votes` > 0),
  CONSTRAINT `vote_transactions_amount_matches_count` CHECK (`amount_paid` = `number_of_votes` * 10),
  CONSTRAINT `vote_transactions_phone_format` CHECK (`phone_number` REGEXP '^2547[0-9]{8}$'),
  CONSTRAINT `vote_transactions_nominee_id_fkey` FOREIGN KEY (`nominee_id`) REFERENCES `nominees` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `vote_transactions_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `vote_adjustments` (
  `id` VARCHAR(191) NOT NULL,
  `nominee_id` VARCHAR(191) NOT NULL,
  `category_id` VARCHAR(191) NOT NULL,
  `admin_user_id` VARCHAR(191) NOT NULL,
  `delta` INTEGER NOT NULL,
  `reason` VARCHAR(500) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `vote_adjustments_nominee_id_created_at_idx` (`nominee_id`, `created_at`),
  CONSTRAINT `vote_adjustments_nonzero_delta` CHECK (`delta` <> 0),
  CONSTRAINT `vote_adjustments_nominee_id_fkey` FOREIGN KEY (`nominee_id`) REFERENCES `nominees` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `vote_adjustments_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `vote_adjustments_admin_user_id_fkey` FOREIGN KEY (`admin_user_id`) REFERENCES `admin_users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
