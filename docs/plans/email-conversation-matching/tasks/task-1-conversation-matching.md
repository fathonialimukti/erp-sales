### Task 1: Conversation matching by (email, subject)

**Files:**
- Modify: `apps/server/src/lib/email-inbound.ts` (function `resolveConversationId`, approx lines 87-110)
- No test changes (user explicitly said "ignore testing for now")

**Interfaces:**
- Consumes: `EmailInboundPayload` (from `@repo/schemas/email-crm`), `prisma.emailConversation`
- Produces: same `resolveConversationId(payload, email, linkedCustomerId): Promise<string>` signature — no caller changes

**Frozen contract:**
- Resource: `email-crm`
- Module: `apps/server/src/lib/email-inbound.ts`
- Function to modify: `resolveConversationId`
- Reference: existing `parentMessageIdCandidates` header-threading path stays as PRIMARY path (unchanged)
- DB schema: `EmailConversation` has `email String`, `subject String?` (nullable), `status String` (default OPEN). Use `prisma.emailConversation.findFirst` with `where: { email, subject: <NullableString>, status: 'OPEN' }`, `orderBy: { lastMessageAt: 'desc' }`, `select: { id: true }`.
- Exact behavior change (the FALLBACK path only — reached only when no `In-Reply-To`/`References` header match was found):

```
IF payload.subject?.trim() is non-empty:
  look up most recent OPEN conversation with same (email, subject)
  found → reuse: update lastMessageAt, return id
  not found → create new conversation with that subject
ELSE (no subject):
  look up most recent OPEN conversation with same email AND subject IS NULL
  found → reuse: update lastMessageAt, return id
  not found → create new conversation with subject: null
```

**Implementation notes (frozen — do not reinterpret):**
- Keep the header-threading `candidates.length > 0` block above the new fallback — UNCHANGED. Only the `// Header threading: same sender without reply headers → NEW conversation` block (currently a direct `create`) gets replaced with the lookup-or-create logic.
- Use Prisma nullable comparison correctly with `exactOptionalPropertyTypes`:
  - For subjectless lookup: `where: { email, subject: null, status: 'OPEN' }`
  - For subjectful lookup: `where: { email, subject: payload.subject.trim(), status: 'OPEN' }`
- When creating: `subject: payload.subject?.trim() || null` (null when empty/undefined — do NOT store empty string).
- When reusing an existing conversation that has a subject and the inbound also has a subject, do NOT overwrite the subject (it's already the same key).
- All other logic in the file (`normalizeEmail`, `extractBody`, `processInboundEmail`, `dedupedByMessageId`, `shouldSkipInbound`) is UNCHANGED.
- After the change, run `bunx tsc --noEmit` from repo root (or `bun run check-types`) — must pass strict TypeScript.

**Steps:**
- [ ] Step 1: Read current `apps/server/src/lib/email-inbound.ts:87-110`
- [ ] Step 2: Replace the fallback `create` block with lookup-or-create per spec above
- [ ] Step 3: Run `bun run check-types` (or equivalent), confirm no type errors
- [ ] Step 4: Self-review for nullable subject handling and Prisma case-sensitivity (the existing `normalizeEmail` already lowercases; keep matching consistent)
