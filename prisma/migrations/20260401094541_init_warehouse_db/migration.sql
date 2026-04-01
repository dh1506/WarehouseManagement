/*
  Warnings:

  - You are about to drop the column `has_expiry` on the `products` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `products` DROP COLUMN `has_expiry`,
    ADD COLUMN `expiry_date` DATETIME(3) NULL,
    ADD COLUMN `production_date` DATETIME(3) NULL,
    ADD COLUMN `warehouse_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `warehouse_id` INTEGER NULL;

-- CreateTable
CREATE TABLE `warehouses` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `warehouses_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `warehouse_locations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `warehouse_id` INTEGER NOT NULL,
    `location_code` VARCHAR(100) NOT NULL,
    `zone_code` VARCHAR(50) NULL,
    `aisle_code` VARCHAR(50) NULL,
    `rack_code` VARCHAR(50) NULL,
    `level_code` VARCHAR(50) NULL,
    `bin_code` VARCHAR(50) NULL,
    `full_path` VARCHAR(255) NOT NULL,
    `location_status` ENUM('AVAILABLE', 'PARTIAL', 'FULL', 'MAINTENANCE') NOT NULL DEFAULT 'AVAILABLE',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `max_weight` DECIMAL(15, 3) NULL,
    `max_volume` DECIMAL(15, 3) NULL,
    `current_weight` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `current_volume` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `occupancy_percent` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `storage_condition` ENUM('AMBIENT', 'CHILLED', 'FROZEN', 'DRY') NOT NULL DEFAULT 'AMBIENT',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `warehouse_locations_location_code_key`(`location_code`),
    INDEX `warehouse_locations_warehouse_id_fkey`(`warehouse_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `products_warehouse_id_fkey` ON `products`(`warehouse_id`);

-- CreateIndex
CREATE INDEX `users_warehouse_id_fkey` ON `users`(`warehouse_id`);

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_warehouse_id_fkey` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_warehouse_id_fkey` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `warehouse_locations` ADD CONSTRAINT `warehouse_locations_warehouse_id_fkey` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
