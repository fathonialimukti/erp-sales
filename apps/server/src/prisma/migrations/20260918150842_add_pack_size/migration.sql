-- AlterTable
ALTER TABLE "crm_sales_order_items" ADD COLUMN     "pack_size" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "skus" ADD COLUMN     "pack_size" INTEGER NOT NULL DEFAULT 1;
