ALTER TABLE `nominees`
  ADD COLUMN `slug` VARCHAR(191) NULL,
  ADD COLUMN `location` VARCHAR(191) NULL,
  ADD COLUMN `is_approved` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `is_featured` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `is_verified` BOOLEAN NOT NULL DEFAULT false;

UPDATE `nominees` SET `slug` = CONCAT('creator-', `id`) WHERE `slug` IS NULL;
ALTER TABLE `nominees` MODIFY COLUMN `slug` VARCHAR(191) NOT NULL;
CREATE UNIQUE INDEX `nominees_slug_key` ON `nominees` (`slug`);
CREATE INDEX `nominees_is_active_is_approved_is_featured_idx` ON `nominees` (`is_active`, `is_approved`, `is_featured`);

ALTER TABLE `event_settings`
  ADD COLUMN `vote_price` INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN `unlimited_votes` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `voting_starts_at` DATETIME(3) NULL,
  ADD COLUMN `voting_ends_at` DATETIME(3) NULL,
  ADD COLUMN `public_vote_counts` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `public_leaderboard` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `leaderboard_after_close` BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE `announcements` (
  `id` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `message` TEXT NOT NULL,
  `kind` ENUM('general', 'voting_open', 'closing_soon', 'voting_closed') NOT NULL DEFAULT 'general',
  `is_published` BOOLEAN NOT NULL DEFAULT false,
  `starts_at` DATETIME(3) NULL,
  `ends_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `announcements_is_published_starts_at_ends_at_idx` (`is_published`, `starts_at`, `ends_at`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `sponsors` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `tier` ENUM('title', 'gold', 'silver', 'supporting') NOT NULL DEFAULT 'supporting',
  `logo_url` VARCHAR(1000) NOT NULL,
  `description` TEXT NULL,
  `website_url` VARCHAR(1000) NULL,
  `order_index` INTEGER NOT NULL DEFAULT 0,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `sponsors_is_active_tier_order_index_idx` (`is_active`, `tier`, `order_index`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `news_articles` (
  `id` VARCHAR(191) NOT NULL,
  `slug` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `excerpt` TEXT NULL,
  `body` LONGTEXT NOT NULL,
  `image_url` VARCHAR(1000) NULL,
  `is_published` BOOLEAN NOT NULL DEFAULT false,
  `published_at` DATETIME(3) NULL,
  `author_id` VARCHAR(191) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `news_articles_slug_key` (`slug`),
  INDEX `news_articles_is_published_published_at_idx` (`is_published`, `published_at`),
  CONSTRAINT `news_articles_author_id_fkey` FOREIGN KEY (`author_id`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `award_results` (
  `id` VARCHAR(191) NOT NULL,
  `category_id` VARCHAR(191) NOT NULL,
  `nominee_id` VARCHAR(191) NOT NULL,
  `award_year` INTEGER NOT NULL DEFAULT 2026,
  `is_published` BOOLEAN NOT NULL DEFAULT false,
  `published_at` DATETIME(3) NULL,
  `certificate_url` VARCHAR(1000) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `award_results_category_id_award_year_key` (`category_id`, `award_year`),
  INDEX `award_results_is_published_award_year_idx` (`is_published`, `award_year`),
  CONSTRAINT `award_results_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `award_results_nominee_id_fkey` FOREIGN KEY (`nominee_id`) REFERENCES `nominees` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `audit_logs` (
  `id` VARCHAR(191) NOT NULL,
  `admin_user_id` VARCHAR(191) NULL,
  `action` VARCHAR(100) NOT NULL,
  `entity_type` VARCHAR(100) NOT NULL,
  `entity_id` VARCHAR(191) NULL,
  `details` JSON NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `audit_logs_entity_type_entity_id_created_at_idx` (`entity_type`, `entity_id`, `created_at`),
  INDEX `audit_logs_admin_user_id_created_at_idx` (`admin_user_id`, `created_at`),
  CONSTRAINT `audit_logs_admin_user_id_fkey` FOREIGN KEY (`admin_user_id`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
