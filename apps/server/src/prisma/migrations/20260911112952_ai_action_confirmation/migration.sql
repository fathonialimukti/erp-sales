-- CreateTable
CREATE TABLE "ai_action_confirmations" (
    "id" TEXT NOT NULL,
    "widget_id" TEXT NOT NULL,
    "sql_text" TEXT NOT NULL,
    "read_only" BOOLEAN NOT NULL,
    "backup_ack" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "chat_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "result" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_action_confirmations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_action_confirmations_chat_id_idx" ON "ai_action_confirmations"("chat_id");

-- CreateIndex
CREATE INDEX "ai_action_confirmations_created_by_idx" ON "ai_action_confirmations"("created_by");

