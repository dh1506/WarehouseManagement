-- CreateTable
CREATE TABLE `inventories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `product_id` INTEGER NOT NULL,
    `warehouse_location_id` INTEGER NOT NULL,
    `quantity` DECIMAL(15, 3) NOT NULL DEFAULT 0.000,
    `reserved_quantity` DECIMAL(15, 3) NOT NULL DEFAULT 0.000,
    `available_quantity` DECIMAL(15, 3) NOT NULL DEFAULT 0.000,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `inventories_product_id_idx`(`product_id`),
    INDEX `inventories_warehouse_location_id_idx`(`warehouse_location_id`),
    UNIQUE INDEX `inventories_product_id_warehouse_location_id_key`(`product_id`, `warehouse_location_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `inventories` ADD CONSTRAINT `inventories_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventories` ADD CONSTRAINT `inventories_warehouse_location_id_fkey` FOREIGN KEY (`warehouse_location_id`) REFERENCES `warehouse_locations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
