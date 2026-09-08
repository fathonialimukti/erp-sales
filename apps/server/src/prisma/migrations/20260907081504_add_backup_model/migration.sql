-- CreateEnum
CREATE TYPE "BackupSource" AS ENUM ('CREATED', 'UPLOADED');

-- CreateTable
CREATE TABLE "backups" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "table_counts" JSONB NOT NULL,
    "schema_version" TEXT NOT NULL,
    "source" "BackupSource" NOT NULL,
    "note" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "backups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "backups_filename_key" ON "backups"("filename");

-- CreateIndex
CREATE INDEX "backups_created_by_id_idx" ON "backups"("created_by_id");

-- AddForeignKey
ALTER TABLE "backups" ADD CONSTRAINT "backups_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
