-- CreateEnum
CREATE TYPE "SettingScope" AS ENUM ('APP', 'USER');

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "scope" "SettingScope" NOT NULL,
    "user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "settings_scope_idx" ON "settings"("scope");

-- CreateIndex
CREATE INDEX "settings_user_id_idx" ON "settings"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "settings_key_user_id_key" ON "settings"("key", "user_id");

