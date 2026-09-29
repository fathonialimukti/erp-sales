-- Generated with: prisma migrate diff --from-config-datasource --to-schema src/prisma/schema.prisma --script
-- (prisma migrate dev cannot run here: the DB role lacks CREATEDB, so the shadow
-- database fails with P3014.) The same diff also emitted
-- `DROP INDEX "knowledge_chunks_embedding_hnsw_idx"` — deliberately EXCLUDED here:
-- that index is created out-of-band by src/scripts/ensure-knowledge-vector-columns.ts
-- and is absent from schema.prisma, so it is drift to preserve, not to undo.

-- AlterTable
ALTER TABLE "crm_visit_logs" ADD COLUMN     "approval_history" JSONB;
