-- CreateTable
CREATE TABLE `audit_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `module` VARCHAR(100) NOT NULL,
    `entity_type` VARCHAR(100) NOT NULL,
    `entity_id` INTEGER NOT NULL,
    `action` ENUM('CREATE', 'UPDATE', 'DELETE') NOT NULL,
    `old_data` JSON NULL,
    `new_data` JSON NULL,
    `reference_code` VARCHAR(255) NULL,
    `note` TEXT NULL,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_module_idx`(`module`),
    INDEX `audit_logs_entity_type_entity_id_idx`(`entity_type`, `entity_id`),
    INDEX `audit_logs_created_by_idx`(`created_by`),
    INDEX `audit_logs_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(191) NOT NULL,
    `full_name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `avatar_url` VARCHAR(191) NULL,
    `role_id` INTEGER NOT NULL,
    `user_status` ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `warehouse_id` INTEGER NULL,

    UNIQUE INDEX `users_username_key`(`username`),
    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_phone_key`(`phone`),
    INDEX `users_role_id_fkey`(`role_id`),
    INDEX `users_warehouse_id_fkey`(`warehouse_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `roles_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permissions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `module` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `permissions_name_key`(`name`),
    UNIQUE INDEX `permissions_module_action_key`(`module`, `action`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role_permissions` (
    `role_id` INTEGER NOT NULL,
    `permission_id` INTEGER NOT NULL,
    `assigned_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `role_permissions_permission_id_fkey`(`permission_id`),
    PRIMARY KEY (`role_id`, `permission_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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

-- CreateTable
CREATE TABLE `product_lots` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `lot_no` VARCHAR(191) NOT NULL,
    `product_id` INTEGER NOT NULL,
    `inventories_id` INTEGER NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'EXPIRED') NOT NULL DEFAULT 'ACTIVE',
    `production_date` DATETIME(3) NULL,
    `expired_date` DATETIME(3) NULL,
    `received_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `product_lots_lot_no_key`(`lot_no`),
    INDEX `product_lots_product_id_idx`(`product_id`),
    INDEX `product_lots_inventories_id_idx`(`inventories_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory_transactions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `warehouse_location_id` INTEGER NOT NULL,
    `product_id` INTEGER NOT NULL,
    `lot_id` INTEGER NULL,
    `product_uom_id` INTEGER NOT NULL,
    `transaction_type` ENUM('IN', 'OUT', 'TRANSFER', 'ADJUSTMENT', 'POS_SALE', 'POS_RETURN') NOT NULL,
    `quantity` DECIMAL(15, 3) NOT NULL,
    `base_quantity` DECIMAL(15, 3) NOT NULL,
    `balance_after` DECIMAL(15, 3) NOT NULL,
    `reference_type` VARCHAR(191) NULL,
    `reference_id` VARCHAR(191) NULL,
    `reference_line_id` VARCHAR(191) NULL,
    `note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by` INTEGER NULL,
    `transaction_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `inventory_transactions_warehouse_location_id_idx`(`warehouse_location_id`),
    INDEX `inventory_transactions_product_id_idx`(`product_id`),
    INDEX `inventory_transactions_lot_id_idx`(`lot_id`),
    INDEX `inventory_transactions_created_by_idx`(`created_by`),
    INDEX `inventory_transactions_product_uom_id_fkey`(`product_uom_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory_closings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `closing_date` DATETIME(3) NOT NULL,
    `closed_by` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `inventory_closings_closing_date_key`(`closing_date`),
    INDEX `inventory_closings_closed_by_idx`(`closed_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `parent_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `product_categories_code_key`(`code`),
    INDEX `product_categories_parent_id_fkey`(`parent_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `brands` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `brands_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `units_of_measure` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `uom_type` ENUM('WEIGHT', 'VOLUME', 'LENGTH', 'QUANTITY', 'PACK') NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `units_of_measure_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `products` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `product_type` ENUM('GOODS', 'MATERIAL', 'CONSUMABLE') NOT NULL DEFAULT 'GOODS',
    `product_status` ENUM('ACTIVE', 'INACTIVE', 'DISCONTINUED') NOT NULL DEFAULT 'ACTIVE',
    `base_uom_id` INTEGER NOT NULL,
    `has_batch` BOOLEAN NOT NULL DEFAULT false,
    `min_stock` DECIMAL(15, 3) NULL,
    `max_stock` DECIMAL(15, 3) NULL,
    `safe_stock` DECIMAL(15, 3) NULL,
    `storage_conditions` VARCHAR(191) NULL,
    `image_url` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `expiry_date` DATETIME(3) NULL,
    `production_date` DATETIME(3) NULL,

    UNIQUE INDEX `products_code_key`(`code`),
    INDEX `products_base_uom_id_fkey`(`base_uom_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_category_map` (
    `product_id` INTEGER NOT NULL,
    `category_id` INTEGER NOT NULL,
    `assigned_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `product_category_map_category_id_fkey`(`category_id`),
    PRIMARY KEY (`product_id`, `category_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_uoms` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `product_id` INTEGER NOT NULL,
    `uom_id` INTEGER NOT NULL,
    `conversion_factor` DECIMAL(15, 6) NOT NULL,
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `product_uoms_uom_id_fkey`(`uom_id`),
    UNIQUE INDEX `product_uoms_product_id_uom_id_key`(`product_id`, `uom_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `brands_products` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `brand_id` INTEGER NOT NULL,
    `product_id` INTEGER NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `brands_products_brand_id_idx`(`brand_id`),
    INDEX `brands_products_product_id_idx`(`product_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sales_import_batches` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `batch_code` VARCHAR(255) NOT NULL,
    `source` VARCHAR(50) NOT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    `total_records` INTEGER NOT NULL DEFAULT 0,
    `success_records` INTEGER NOT NULL DEFAULT 0,
    `error_records` INTEGER NOT NULL DEFAULT 0,
    `error_log` JSON NULL,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `sales_import_batches_batch_code_key`(`batch_code`),
    INDEX `sales_import_batches_created_by_idx`(`created_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sales_transactions` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `batch_id` INTEGER NOT NULL,
    `warehouse_location_id` INTEGER NOT NULL,
    `transaction_code` VARCHAR(255) NOT NULL,
    `transaction_type` VARCHAR(50) NOT NULL,
    `transaction_date` DATETIME(3) NOT NULL,
    `product_id` INTEGER NOT NULL,
    `quantity` DECIMAL(15, 3) NOT NULL,
    `unit_price` DECIMAL(15, 2) NOT NULL,
    `promo_discount_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `net_amount` DECIMAL(15, 2) NOT NULL,
    `is_valid` BOOLEAN NOT NULL DEFAULT true,
    `is_inventory_updated` BOOLEAN NOT NULL DEFAULT false,
    `validation_note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `sales_transactions_batch_id_idx`(`batch_id`),
    INDEX `sales_transactions_warehouse_location_id_idx`(`warehouse_location_id`),
    INDEX `sales_transactions_product_id_idx`(`product_id`),
    UNIQUE INDEX `sales_transactions_transaction_code_transaction_type_product_key`(`transaction_code`, `transaction_type`, `product_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sales_daily_summaries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `summary_date` DATE NOT NULL,
    `warehouse_location_id` INTEGER NOT NULL,
    `product_id` INTEGER NOT NULL,
    `total_sales_qty` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `total_returned_qty` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `net_sales_qty` DECIMAL(15, 3) NOT NULL DEFAULT 0,
    `total_promo_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `total_revenue` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `last_updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `sales_daily_summaries_warehouse_location_id_idx`(`warehouse_location_id`),
    INDEX `sales_daily_summaries_product_id_idx`(`product_id`),
    UNIQUE INDEX `sales_daily_summaries_summary_date_warehouse_location_id_pro_key`(`summary_date`, `warehouse_location_id`, `product_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_counts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `stock_count_code` VARCHAR(191) NOT NULL,
    `type` ENUM('PERIODIC', 'AD_HOC') NOT NULL DEFAULT 'PERIODIC',
    `scope_type` ENUM('FULL', 'ZONE', 'PRODUCT', 'LOT') NOT NULL DEFAULT 'FULL',
    `description` TEXT NULL,
    `status` ENUM('DRAFT', 'COUNTING', 'COMPLETED', 'APPROVED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `created_by` INTEGER NOT NULL,
    `approved_by` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `stock_counts_stock_count_code_key`(`stock_count_code`),
    INDEX `stock_counts_created_by_idx`(`created_by`),
    INDEX `stock_counts_approved_by_idx`(`approved_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_count_details` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `stock_count_id` INTEGER NOT NULL,
    `warehouse_location_id` INTEGER NOT NULL,
    `product_id` INTEGER NOT NULL,
    `lot_id` INTEGER NULL,
    `system_quantity` DECIMAL(15, 3) NOT NULL,
    `counted_quantity` DECIMAL(15, 3) NULL,
    `variance_quantity` DECIMAL(15, 3) NULL,
    `unit_price` DECIMAL(15, 2) NULL,
    `variance_reason` TEXT NULL,
    `is_confirmed` BOOLEAN NOT NULL DEFAULT false,
    `counted_by` INTEGER NULL,
    `counted_at` DATETIME(3) NULL,

    INDEX `stock_count_details_stock_count_id_idx`(`stock_count_id`),
    INDEX `stock_count_details_warehouse_location_id_idx`(`warehouse_location_id`),
    INDEX `stock_count_details_product_id_idx`(`product_id`),
    INDEX `stock_count_details_lot_id_idx`(`lot_id`),
    INDEX `stock_count_details_counted_by_idx`(`counted_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_count_adjustments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `stock_count_id` INTEGER NOT NULL,
    `stock_count_detail_id` INTEGER NOT NULL,
    `warehouse_location_id` INTEGER NOT NULL,
    `product_id` INTEGER NOT NULL,
    `lot_id` INTEGER NULL,
    `adjustment_type` ENUM('INCREASE', 'DECREASE') NOT NULL,
    `adjustment_quantity` DECIMAL(15, 3) NOT NULL,
    `note` TEXT NULL,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `stock_count_adjustments_stock_count_id_idx`(`stock_count_id`),
    INDEX `stock_count_adjustments_stock_count_detail_id_idx`(`stock_count_detail_id`),
    INDEX `stock_count_adjustments_created_by_idx`(`created_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `disposal_reasons` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `disposal_reasons_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_disposals` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `disposal_code` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `status` ENUM('DRAFT', 'PENDING', 'APPROVED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `created_by` INTEGER NOT NULL,
    `approved_by` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `stock_disposals_disposal_code_key`(`disposal_code`),
    INDEX `stock_disposals_created_by_idx`(`created_by`),
    INDEX `stock_disposals_approved_by_idx`(`approved_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_disposal_history` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `stock_disposal_id` INTEGER NOT NULL,
    `status` ENUM('DRAFT', 'PENDING', 'APPROVED', 'COMPLETED', 'CANCELLED') NOT NULL,
    `note` TEXT NULL,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `stock_disposal_history_stock_disposal_id_idx`(`stock_disposal_id`),
    INDEX `stock_disposal_history_created_by_idx`(`created_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_disposal_details` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `stock_disposal_id` INTEGER NOT NULL,
    `warehouse_location_id` INTEGER NOT NULL,
    `product_id` INTEGER NOT NULL,
    `lot_id` INTEGER NULL,
    `reason_id` INTEGER NOT NULL,
    `quantity` DECIMAL(15, 3) NOT NULL,
    `unit_price` DECIMAL(15, 2) NULL,
    `reason_note` TEXT NULL,

    INDEX `stock_disposal_details_stock_disposal_id_idx`(`stock_disposal_id`),
    INDEX `stock_disposal_details_warehouse_location_id_idx`(`warehouse_location_id`),
    INDEX `stock_disposal_details_product_id_idx`(`product_id`),
    INDEX `stock_disposal_details_lot_id_idx`(`lot_id`),
    INDEX `stock_disposal_details_reason_id_idx`(`reason_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_ins` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `warehouse_location_id` INTEGER NOT NULL,
    `stock_in_code` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `status` ENUM('DRAFT', 'PENDING', 'IN_PROGRESS', 'DISCREPANCY', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `created_by` INTEGER NOT NULL,
    `approved_by` INTEGER NULL,
    `supplier_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `stock_ins_stock_in_code_key`(`stock_in_code`),
    INDEX `stock_ins_warehouse_location_id_idx`(`warehouse_location_id`),
    INDEX `stock_ins_created_by_idx`(`created_by`),
    INDEX `stock_ins_approved_by_idx`(`approved_by`),
    INDEX `stock_ins_supplier_id_idx`(`supplier_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_in_details` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `stock_in_id` INTEGER NOT NULL,
    `product_id` INTEGER NOT NULL,
    `expected_quantity` DECIMAL(15, 3) NOT NULL DEFAULT 0.000,
    `received_quantity` DECIMAL(15, 3) NOT NULL DEFAULT 0.000,
    `unit_price` DECIMAL(15, 2) NULL,

    INDEX `stock_in_details_stock_in_id_idx`(`stock_in_id`),
    INDEX `stock_in_details_product_id_idx`(`product_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_in_detail_lots` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `stock_in_detail_id` INTEGER NOT NULL,
    `product_lot_id` INTEGER NOT NULL,
    `quantity` DECIMAL(15, 3) NOT NULL,

    INDEX `stock_in_detail_lots_stock_in_detail_id_idx`(`stock_in_detail_id`),
    INDEX `stock_in_detail_lots_product_lot_id_idx`(`product_lot_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_in_discrepancies` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `stock_in_id` INTEGER NOT NULL,
    `reported_by` INTEGER NOT NULL,
    `resolved_by` INTEGER NULL,
    `expected_qty` DECIMAL(15, 3) NOT NULL,
    `actual_qty` DECIMAL(15, 3) NOT NULL,
    `reason` TEXT NOT NULL,
    `action_taken` TEXT NULL,
    `status` ENUM('PENDING', 'RESOLVED') NOT NULL DEFAULT 'PENDING',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `stock_in_discrepancies_stock_in_id_idx`(`stock_in_id`),
    INDEX `stock_in_discrepancies_reported_by_fkey`(`reported_by`),
    INDEX `stock_in_discrepancies_resolved_by_fkey`(`resolved_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_outs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `warehouse_location_id` INTEGER NOT NULL,
    `stock_out_code` VARCHAR(191) NOT NULL,
    `type` ENUM('SALES', 'RETURN_TO_SUPPLIER') NOT NULL DEFAULT 'SALES',
    `reference_number` VARCHAR(191) NULL,
    `supplier_id` INTEGER NULL,
    `description` TEXT NULL,
    `status` ENUM('DRAFT', 'PENDING', 'APPROVED', 'PICKING', 'DISCREPANCY', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `created_by` INTEGER NOT NULL,
    `approved_by` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `stock_outs_stock_out_code_key`(`stock_out_code`),
    INDEX `stock_outs_warehouse_location_id_idx`(`warehouse_location_id`),
    INDEX `stock_outs_created_by_idx`(`created_by`),
    INDEX `stock_outs_approved_by_idx`(`approved_by`),
    INDEX `stock_outs_supplier_id_idx`(`supplier_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_out_details` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `stock_out_id` INTEGER NOT NULL,
    `product_id` INTEGER NOT NULL,
    `quantity` DECIMAL(15, 3) NOT NULL,
    `unit_price` DECIMAL(15, 2) NULL,

    INDEX `stock_out_details_stock_out_id_idx`(`stock_out_id`),
    INDEX `stock_out_details_product_id_idx`(`product_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_out_detail_lots` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `stock_out_detail_id` INTEGER NOT NULL,
    `product_lot_id` INTEGER NOT NULL,
    `quantity` DECIMAL(15, 3) NOT NULL,

    INDEX `stock_out_detail_lots_stock_out_detail_id_idx`(`stock_out_detail_id`),
    INDEX `stock_out_detail_lots_product_lot_id_idx`(`product_lot_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_out_discrepancies` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `stock_out_id` INTEGER NOT NULL,
    `reported_by` INTEGER NOT NULL,
    `resolved_by` INTEGER NULL,
    `expected_qty` DECIMAL(15, 3) NOT NULL,
    `actual_qty` DECIMAL(15, 3) NOT NULL,
    `reason` TEXT NOT NULL,
    `action_taken` TEXT NULL,
    `status` ENUM('PENDING', 'RESOLVED') NOT NULL DEFAULT 'PENDING',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `stock_out_discrepancies_stock_out_id_idx`(`stock_out_id`),
    INDEX `stock_out_discrepancies_reported_by_fkey`(`reported_by`),
    INDEX `stock_out_discrepancies_resolved_by_fkey`(`resolved_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `suppliers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `contact_person` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `address` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `suppliers_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_suppliers` (
    `product_id` INTEGER NOT NULL,
    `supplier_id` INTEGER NOT NULL,
    `supplier_sku` VARCHAR(191) NULL,
    `purchase_price` DECIMAL(15, 2) NOT NULL,
    `is_primary` BOOLEAN NOT NULL DEFAULT false,

    INDEX `product_suppliers_supplier_id_fkey`(`supplier_id`),
    PRIMARY KEY (`product_id`, `supplier_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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
    `rack_code` VARCHAR(50) NULL,
    `level_code` VARCHAR(50) NULL,
    `bin_code` VARCHAR(50) NULL,
    `full_path` VARCHAR(255) NOT NULL,
    `location_status` ENUM('AVAILABLE', 'PARTIAL', 'FULL', 'MAINTENANCE') NOT NULL DEFAULT 'AVAILABLE',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `max_weight` DECIMAL(15, 3) NULL,
    `max_volume` DECIMAL(15, 3) NULL,
    `current_weight` DECIMAL(15, 3) NOT NULL DEFAULT 0.000,
    `current_volume` DECIMAL(15, 3) NOT NULL DEFAULT 0.000,
    `occupancy_percent` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `storage_condition` ENUM('AMBIENT', 'CHILLED', 'FROZEN', 'DRY') NOT NULL DEFAULT 'AMBIENT',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `warehouse_locations_location_code_key`(`location_code`),
    INDEX `warehouse_locations_warehouse_id_fkey`(`warehouse_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `location_allowed_categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `location_id` INTEGER NOT NULL,
    `category_id` INTEGER NOT NULL,
    `is_allowed` BOOLEAN NOT NULL DEFAULT true,
    `rule_source` ENUM('DIRECT', 'INHERITED', 'OVERRIDE') NOT NULL DEFAULT 'DIRECT',
    `inherit_from_parent` BOOLEAN NOT NULL DEFAULT true,
    `priority` INTEGER NOT NULL DEFAULT 0,
    `effective_from` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `effective_to` DATETIME(3) NULL,
    `note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `location_allowed_categories_category_id_fkey`(`category_id`),
    UNIQUE INDEX `location_allowed_categories_location_id_category_id_key`(`location_id`, `category_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_warehouses` (
    `product_id` INTEGER NOT NULL,
    `warehouse_id` INTEGER NOT NULL,
    `assigned_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `product_warehouses_warehouse_id_idx`(`warehouse_id`),
    PRIMARY KEY (`product_id`, `warehouse_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_warehouse_id_fkey` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_permission_id_fkey` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventories` ADD CONSTRAINT `inventories_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventories` ADD CONSTRAINT `inventories_warehouse_location_id_fkey` FOREIGN KEY (`warehouse_location_id`) REFERENCES `warehouse_locations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_lots` ADD CONSTRAINT `product_lots_inventories_id_fkey` FOREIGN KEY (`inventories_id`) REFERENCES `inventories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_lots` ADD CONSTRAINT `product_lots_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_transactions` ADD CONSTRAINT `inventory_transactions_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_transactions` ADD CONSTRAINT `inventory_transactions_lot_id_fkey` FOREIGN KEY (`lot_id`) REFERENCES `product_lots`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_transactions` ADD CONSTRAINT `inventory_transactions_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_transactions` ADD CONSTRAINT `inventory_transactions_product_uom_id_fkey` FOREIGN KEY (`product_uom_id`) REFERENCES `product_uoms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_transactions` ADD CONSTRAINT `inventory_transactions_warehouse_location_id_fkey` FOREIGN KEY (`warehouse_location_id`) REFERENCES `warehouse_locations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_closings` ADD CONSTRAINT `inventory_closings_closed_by_fkey` FOREIGN KEY (`closed_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_categories` ADD CONSTRAINT `product_categories_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `product_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_base_uom_id_fkey` FOREIGN KEY (`base_uom_id`) REFERENCES `units_of_measure`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_category_map` ADD CONSTRAINT `product_category_map_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `product_categories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_category_map` ADD CONSTRAINT `product_category_map_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_uoms` ADD CONSTRAINT `product_uoms_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_uoms` ADD CONSTRAINT `product_uoms_uom_id_fkey` FOREIGN KEY (`uom_id`) REFERENCES `units_of_measure`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brands_products` ADD CONSTRAINT `brands_products_brand_id_fkey` FOREIGN KEY (`brand_id`) REFERENCES `brands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brands_products` ADD CONSTRAINT `brands_products_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales_import_batches` ADD CONSTRAINT `sales_import_batches_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales_transactions` ADD CONSTRAINT `sales_transactions_batch_id_fkey` FOREIGN KEY (`batch_id`) REFERENCES `sales_import_batches`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales_transactions` ADD CONSTRAINT `sales_transactions_warehouse_location_id_fkey` FOREIGN KEY (`warehouse_location_id`) REFERENCES `warehouse_locations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales_transactions` ADD CONSTRAINT `sales_transactions_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales_daily_summaries` ADD CONSTRAINT `sales_daily_summaries_warehouse_location_id_fkey` FOREIGN KEY (`warehouse_location_id`) REFERENCES `warehouse_locations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales_daily_summaries` ADD CONSTRAINT `sales_daily_summaries_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_counts` ADD CONSTRAINT `stock_counts_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_counts` ADD CONSTRAINT `stock_counts_approved_by_fkey` FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_count_details` ADD CONSTRAINT `stock_count_details_stock_count_id_fkey` FOREIGN KEY (`stock_count_id`) REFERENCES `stock_counts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_count_details` ADD CONSTRAINT `stock_count_details_warehouse_location_id_fkey` FOREIGN KEY (`warehouse_location_id`) REFERENCES `warehouse_locations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_count_details` ADD CONSTRAINT `stock_count_details_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_count_details` ADD CONSTRAINT `stock_count_details_lot_id_fkey` FOREIGN KEY (`lot_id`) REFERENCES `product_lots`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_count_details` ADD CONSTRAINT `stock_count_details_counted_by_fkey` FOREIGN KEY (`counted_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_count_adjustments` ADD CONSTRAINT `stock_count_adjustments_stock_count_id_fkey` FOREIGN KEY (`stock_count_id`) REFERENCES `stock_counts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_count_adjustments` ADD CONSTRAINT `stock_count_adjustments_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_count_adjustments` ADD CONSTRAINT `stock_count_adjustments_warehouse_location_id_fkey` FOREIGN KEY (`warehouse_location_id`) REFERENCES `warehouse_locations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_count_adjustments` ADD CONSTRAINT `stock_count_adjustments_lot_id_fkey` FOREIGN KEY (`lot_id`) REFERENCES `product_lots`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_count_adjustments` ADD CONSTRAINT `stock_count_adjustments_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_disposals` ADD CONSTRAINT `stock_disposals_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_disposals` ADD CONSTRAINT `stock_disposals_approved_by_fkey` FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_disposal_history` ADD CONSTRAINT `stock_disposal_history_stock_disposal_id_fkey` FOREIGN KEY (`stock_disposal_id`) REFERENCES `stock_disposals`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_disposal_history` ADD CONSTRAINT `stock_disposal_history_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_disposal_details` ADD CONSTRAINT `stock_disposal_details_stock_disposal_id_fkey` FOREIGN KEY (`stock_disposal_id`) REFERENCES `stock_disposals`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_disposal_details` ADD CONSTRAINT `stock_disposal_details_warehouse_location_id_fkey` FOREIGN KEY (`warehouse_location_id`) REFERENCES `warehouse_locations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_disposal_details` ADD CONSTRAINT `stock_disposal_details_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_disposal_details` ADD CONSTRAINT `stock_disposal_details_lot_id_fkey` FOREIGN KEY (`lot_id`) REFERENCES `product_lots`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_disposal_details` ADD CONSTRAINT `stock_disposal_details_reason_id_fkey` FOREIGN KEY (`reason_id`) REFERENCES `disposal_reasons`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_ins` ADD CONSTRAINT `stock_ins_approved_by_fkey` FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_ins` ADD CONSTRAINT `stock_ins_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_ins` ADD CONSTRAINT `stock_ins_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_ins` ADD CONSTRAINT `stock_ins_warehouse_location_id_fkey` FOREIGN KEY (`warehouse_location_id`) REFERENCES `warehouse_locations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_in_details` ADD CONSTRAINT `stock_in_details_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_in_details` ADD CONSTRAINT `stock_in_details_stock_in_id_fkey` FOREIGN KEY (`stock_in_id`) REFERENCES `stock_ins`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_in_detail_lots` ADD CONSTRAINT `stock_in_detail_lots_product_lot_id_fkey` FOREIGN KEY (`product_lot_id`) REFERENCES `product_lots`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_in_detail_lots` ADD CONSTRAINT `stock_in_detail_lots_stock_in_detail_id_fkey` FOREIGN KEY (`stock_in_detail_id`) REFERENCES `stock_in_details`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_in_discrepancies` ADD CONSTRAINT `stock_in_discrepancies_reported_by_fkey` FOREIGN KEY (`reported_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_in_discrepancies` ADD CONSTRAINT `stock_in_discrepancies_resolved_by_fkey` FOREIGN KEY (`resolved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_in_discrepancies` ADD CONSTRAINT `stock_in_discrepancies_stock_in_id_fkey` FOREIGN KEY (`stock_in_id`) REFERENCES `stock_ins`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_outs` ADD CONSTRAINT `stock_outs_approved_by_fkey` FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_outs` ADD CONSTRAINT `stock_outs_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_outs` ADD CONSTRAINT `stock_outs_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_outs` ADD CONSTRAINT `stock_outs_warehouse_location_id_fkey` FOREIGN KEY (`warehouse_location_id`) REFERENCES `warehouse_locations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_out_details` ADD CONSTRAINT `stock_out_details_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_out_details` ADD CONSTRAINT `stock_out_details_stock_out_id_fkey` FOREIGN KEY (`stock_out_id`) REFERENCES `stock_outs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_out_detail_lots` ADD CONSTRAINT `stock_out_detail_lots_product_lot_id_fkey` FOREIGN KEY (`product_lot_id`) REFERENCES `product_lots`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_out_detail_lots` ADD CONSTRAINT `stock_out_detail_lots_stock_out_detail_id_fkey` FOREIGN KEY (`stock_out_detail_id`) REFERENCES `stock_out_details`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_out_discrepancies` ADD CONSTRAINT `stock_out_discrepancies_reported_by_fkey` FOREIGN KEY (`reported_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_out_discrepancies` ADD CONSTRAINT `stock_out_discrepancies_resolved_by_fkey` FOREIGN KEY (`resolved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_out_discrepancies` ADD CONSTRAINT `stock_out_discrepancies_stock_out_id_fkey` FOREIGN KEY (`stock_out_id`) REFERENCES `stock_outs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_suppliers` ADD CONSTRAINT `product_suppliers_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_suppliers` ADD CONSTRAINT `product_suppliers_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `warehouse_locations` ADD CONSTRAINT `warehouse_locations_warehouse_id_fkey` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `location_allowed_categories` ADD CONSTRAINT `location_allowed_categories_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `product_categories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `location_allowed_categories` ADD CONSTRAINT `location_allowed_categories_location_id_fkey` FOREIGN KEY (`location_id`) REFERENCES `warehouse_locations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_warehouses` ADD CONSTRAINT `product_warehouses_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_warehouses` ADD CONSTRAINT `product_warehouses_warehouse_id_fkey` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
