# 🧠 AETHERGLO AI EMAIL CRM — Aligned Implementation Plan

## Ringkasan Fitur
Fitur ini adalah modul **AI Customer Chat** khusus admin di dalam ERP yang sudah ada. Tujuannya bukan menerima email publik umum, tetapi menjadi jembatan komunikasi **employee ↔ customer** melalui percakapan terstruktur yang terhubung dengan data Customer/Outlet yang sudah ada di ERP. AI berperan sebagai assistant balasan, bukan sistem email worker terpisah.

---

## 🎯 TUJUAN
1. Menyediakan halaman **AI Chat khusus customer** di client ERP untuk admin/employee.
2. Menyimpan percakapan sebagai `emailConversation` + `emailMessage` di Prisma, terhubung ke `Customer`/`Outlet`.
3. Membantu admin menulis balasan dengan **AI generate** menggunakan AI SDK yang sudah ada di server.
4. Mendukung threading, assign ke customer/outlet, status, priority, sentiment, dan tags.
5. Tetap mematuhi pola ERP existing: tRPC router, Zod schema, activity logging, i18n, dan permission `email-crm@*`.

---

## 🏗️ ARSITEKTUR DI DALAM ERP
```text
Admin/Employee (client)
        ↓
Halaman Email CRM (Index / Detail / Form)
        ↓
tRPC: apps/server/src/routers/email-crm.ts
        ↓
Prisma: EmailConversation + EmailMessage
        ↓
AI SDK (server) untuk generate balasan
        ↓
Opsional: kirim via email provider (SMTP)
```

Catatan penting:
- Cloudflare / email worker akan diatur terpisah oleh user.
- Di codebase ini, fokusnya adalah **modul admin + AI chat**, bukan webhook publik.
- Jika nanti ada webhook inbound, bisa masuk ke router yang sama sebagai satu sumber truth percakapan.

---

## 📦 SKEMA PRISMA (BARU)
```prisma
model EmailConversation {
  id             String    @id @default(ulid())
  email          String    @unique
  subject        String?
  status         String    @default("OPEN")
  priority       String    @default("NORMAL")
  sentiment      String?
  tags           Json?
  lastMessageAt  DateTime?
  customerId     String?
  customer       Customer? @relation(fields: [customerId], references: [id], onDelete: SetNull, onUpdate: Cascade)
  outletId       String?
  outlet         Outlet?   @relation(fields: [outletId], references: [id], onDelete: SetNull, onUpdate: Cascade)
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  messages       EmailMessage[]
  @@map("email_conversations")
}

model EmailMessage {
  id            String    @id @default(ulid())
  direction     String    @default("INBOUND")
  body          String    @db.Text
  messageId     String?
  inReplyTo     String?
  references    String?
  createdAt     DateTime  @default(now())
  conversationId String
  conversation  EmailConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade, onUpdate: Cascade)
  @@map("email_messages")
}
```

Catatan:
- Gunakan `@default(ulid())` sesuai konvensi repo.
- Relasi opsional ke `Customer` dan `Outlet` untuk enrichment B2B.

---

## 📋 KOMPONEN TEKNIS
### 1. Schema `packages/schemas/src/email-crm.ts`
- `createEmailConversationSchema`
- `updateEmailConversationSchema`
- `emailConversationIdSchema`
- `createEmailMessageSchema`
- `emailMessageIdSchema`
- Ekspor ditambahkan ke `packages/schemas/src/index.ts`

### 2. Router `apps/server/src/routers/email-crm.ts`
- `list` — daftar percakapan dengan search, pagination, filter status/priority
- `detail` — detail percakapan + messages
- `create` — buat conversation manual
- `update` — update status, priority, sentiment, tags, linkage ke customer/outlet
- `delete` — hapus conversation
- `createMessage` — tambah pesan inbound/outbound
- `reply` — generate balasan AI + simpan outbound
- Permission: `email-crm@read`, `email-crm@create`, `email-crm@update`, `email-crm@delete`
- Activity logging di setiap mutation
- Gunakan helper yang sudah ada: `buildPaginationParams`, `buildPaginationMeta`, `buildTextSearchWhere`, `logActivity`, `buildCreateLogDetail`, `buildUpdateLogDetail`, `buildDeleteLogDetail`

### 3. Register Router di `apps/server/src/router.ts`
- Tambah `emailCrmRouter` ke `appRouter` dengan namespace `emailCrm`

### 4. Client Pages
- **Index**: search, filter status/priority, tabel percakapan, aksi view/edit/delete
- **Detail**: header percakapan, thread messages, form balasan cepat dengan AI assist, aksi assign ke customer/outlet
- **Form**: edit metadata conversation (status, priority, tags, customer, outlet)
- Konsisten dengan template Customer/Outlet: `ModulePage`, `ModuleHero`, `ModuleTable`, `ModuleSearch`, `RowActions`, `ButtonGroup`, `Spinner`, `data-ai-context`

### 5. Routes di `apps/client/src/routes.tsx`
- Tambah route `email-crm` dengan children: index, create, `:id`, `:id/edit`

### 6. i18n
- Prefix: `emailCrm.*`
- Tambah ke `apps/client/src/locales/en.json` dan `id.json`

---

## 🔄 WORKFLOW IMPLEMENTASI
### Manual Chat di Admin Client
1. Admin buka halaman Email CRM.
2. Pilih atau buat `EmailConversation` untuk customer/outlet tertentu.
3. Lihat thread `EmailMessage` yang sudah ada.
4. Ketik balasan atau minta AI generate draft balasan.
5. Simpan sebagai `EmailMessage` outbound.
6. Opsional: kirim ke customer via provider email yang sudah disetup.

### AI Reply Flow
1. Admin klik “AI Suggest Reply”.
2. Client panggil `trpcClient.emailCrm.reply.mutate({ conversationId, body })`.
3. Server:
   - load conversation + recent messages
   - build prompt dari history
   - panggil AI SDK untuk generate balasan
   - simpan outbound message
4. Client menampilkan hasil AI untuk diedit/dikirim.

---

## 🛡️ FITUR KEAMANAN & FILTER
1. **Permission**: hanya user dengan `email-crm@read/create/update/delete` yang bisa akses.
2. **Rate Limiting**: batas penggunaan AI reply per user/sesi jika diperlukan.
3. **Spam Filter**: opsional, untuk menandai percakapan spammy.
4. **Auto-Skip**: tidak berlaku untuk modul admin ini, karena semua percakapan sudah terfilter oleh admin.
5. **Threading**: gunakan `messageId`, `inReplyTo`, `references` jika nanti terhubung dengan email provider.

---

## 📊 FITUR CRM
1. **Threading** berdasarkan `email` + `references`.
2. **Contact Enrichment**: relasi ke `Customer` / `Outlet`.
3. **Sentiment & Priority**: field opsional di conversation.
4. **Tags**: JSON array untuk kategori (sales, support, partnership, general).
5. **Dashboard**: bisa reuse halaman dashboard yang ada, atau tambah widget email summary nanti.

---

## 🎨 PRINSIP KODING
- Sesuai arsitektur ERP yang ada, bukan menambah stack baru.
- Type-safe dengan Zod + tRPC.
- Konsisten dengan modul Customer/Outlet/Region.
- Activity logging wajib.
- i18n wajib (`emailCrm.*`).
- `data-ai-context` di setiap page.
- Aplikasi tetap **admin-only**; semua route tetap di bawah `ProtectedRoute`.

---

## 🚀 DEPLOYMENT CHECKLIST
- [ ] Migrasi Prisma untuk `EmailConversation` dan `EmailMessage`
- [ ] Tambah router `email-crm.ts` dan register di `router.ts`
- [ ] Tambah schema di `packages/schemas/src/email-crm.ts`
- [ ] Tambah client pages dan routes
- [ ] Tambah i18n keys di `en.json` dan `id.json`
- [ ] Test create conversation → add message → AI suggest reply
- [ ] Integrasi email provider untuk kirim balasan ke customer (opsional, lanjutan)

---

## 📝 CATATAN DARI REVIEW CODEBASE
- Repo ini adalah ERP monorepo **Express + tRPC + Prisma + React**, bukan Vercel/Cloudflare-native.
- AI SDK sudah terpasang di server (`ai`, `@ai-sdk/openai`), jadi fitur ini bisa memakai `generateText` / `streamText` yang sama.
- Client sudah punya pola AI chat di `ai-admin`, tapi modul ini lebih cocok sebagai **CRM thread** daripada chat general.
- Permission string harus pakai format `resource@action`, jadi gunakan `email-crm@read`, bukan `email_crm_read`.
- Semua ID di schema pakai `ulid()`, bukan `cuid()`.
- Setiap mutation harus log activity.
- Jangan ubah arsitektur global; implementasi harus menempel pada pola existing.
- Aplikasi ini khusus **admin**, jadi semua route tetap di bawah `ProtectedRoute`.

---

**Siap lanjut implementasi?** Kirim instruksi apakah mau:
1. Full scaffold end-to-end, atau
2. Tahap awal: schema + router + index page saja.

## IDENTITAS
Kamu adalah **AetherGlo AI Email Agent** — sebuah sistem CRM berbasis email yang sepenuhnya otomatis, dibangun dengan Vercel AI SDK, Cloudflare Email Worker, dan database. Tugasmu adalah memproses email masuk, memahami konteks percakapan, dan membalas dengan cerdas, personal, dan profesional.

---

## 🎯 TUJUAN UTAMA
Setiap email yang masuk ke `info@aetherglo.com` harus:
1. **Diterima** oleh Cloudflare Email Worker
2. **Diproses** oleh AI untuk memahami maksud pengirim
3. **Dibalas** dengan respons yang relevan, helpful, dan berbentuk percakapan manusiawi
4. **Disimpan** ke database CRM untuk tracking dan continuity
5. **Dikirim kembali** ke pengirim dengan threading yang benar

---

## 🏗️ ARSITEKTUR SISTEM

```
Email Masuk (info@aetherglo.com)
    ↓
Cloudflare Email Worker (worker.js)
    ↓ POST JSON
Vercel API Route (/api/email-chat)
    ↓
Vercel AI SDK (streamText/generateText)
    ↓
AI LLM
    ↓
Database (Prisma + PostgreSQL/Supabase)
    ↓
Resend/Brevo SMTP (Kirim Balasan)
    ↓
Email Balasan ke Pengirim
```

---

## 📋 KOMPONEN TEKNIS

### 1. Cloudflare Email Worker (`worker.js`)
```javascript
export default {
  async email(message, env, ctx) {
    const from = message.from;
    const to = message.to;
    const subject = message.headers.get('subject') || '';
    let text = '';
    if (message.text) text = await message.text();

    await fetch('https://crm.aetherglo.com/api/email-chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Email-Webhook-Secret': env.WEBHOOK_SECRET,
      },
      body: JSON.stringify({
        from, to, subject, text,
        messageId: message.headers.get('message-id'),
        date: message.headers.get('date'),
      }),
    });
  }
};
```

### 2. API Route Vercel (`app/api/email-chat/route.ts`)
- Terima POST dari Worker
- Verifikasi `X-Email-Webhook-Secret`
- Simpan inbound message ke DB
- Panggil AI SDK untuk generate balasan
- Simpan outbound message ke DB
- Kirim balasan via Resend/Brevo

### 3. Database Schema (Prisma)
```prisma
model Conversation {
  id        String   @id @default(cuid())
  email     String
  subject   String
  message   String   @db.Text
  direction Direction // INBOUND | OUTBOUND
  messageId String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum Direction {
  INBOUND
  OUTBOUND
}
```

### 4. AI System Prompt
```
Kamu adalah AetherGlo AI Assistant — customer service dan sales representative 
untuk AetherGlo (perusahaan teknologi/kreatif — sesuaikan dengan bisnis user).

ATURAN:
- Balas dengan bahasa yang SAMA dengan email pengirim
- Gunakan tone: profesional tapi ramah, tidak kaku
- Jika pertanyaan teknis, berikan jawaban detail tapi mudah dipahami
- Jika pertanyaan sales/pricing, arahkan ke halaman yang relevan
- Jika tidak tahu jawaban, jujur dan tawarkan untuk menghubungi tim manusia
- SELALU sertakan signature: "AetherGlo AI Team | info@aetherglo.com"
- Maksimal 3 paragraf per balasan (kecuali jika diminta detail)
- Gunakan emoji secara sparing dan profesional (✨, 🚀, dll)

KONTEKS PERCAKAPAN:
{conversation_history}

EMAIL BARU:
From: {from}
Subject: {subject}
Body: {text}

BALASAN:
```

---

## 🔄 WORKFLOW LENGKAP

### Step 1: Receive
- Worker menerima email dari Cloudflare MX
- Extract metadata: from, to, subject, text, messageId, date
- POST ke Vercel API dengan secret header

### Step 2: Verify
- API verifikasi `X-Email-Webhook-Secret`
- Reject jika tidak valid (return 401)

### Step 3: Store Inbound
- Simpan ke database sebagai `direction: INBOUND`
- Cari conversation history berdasarkan `email` (from address)

### Step 4: AI Process
- Ambil 10 message terakhir dari conversation history
- Format sebagai messages array untuk AI SDK
- Generate balasan dengan `streamText` atau `generateText`
- System prompt berisi identitas + rules + history

### Step 5: Store Outbound
- Simpan balasan AI ke database sebagai `direction: OUTBOUND`

### Step 6: Send Reply
- Kirim via Resend/Brevo dengan:
  - `from: 'info@aetherglo.com'`
  - `to: original_sender`
  - `subject: 'Re: {original_subject}'`
  - `headers['In-Reply-To']: original_messageId`
  - `headers['References']: original_messageId`

### Step 7: Return 200
- API return JSON `{ success: true, messageId: '...' }`

---

## 🛡️ FITUR KEAMANAN

1. **Webhook Secret**: Setiap request dari Worker harus bawa header `X-Email-Webhook-Secret`
2. **Rate Limiting**: Max 5 email/menit per pengirim (cek DB sebelum proses)
3. **Spam Filter**: Jika subject mengandung kata spam/terlalu banyak link, flag dan jangan auto-reply
4. **Blacklist**: Daftar email yang tidak boleh diproses (competitors, spam bots)
5. **Attachment Handling**: Jika ada attachment, extract info dan sertakan dalam balasan ("Kami menerima file Anda...")

---

## 📊 FITUR CRM

1. **Conversation Threading**: Semua email dari email yang sama digroup berdasarkan `email` field
2. **Contact Enrichment**: Simpan metadata contact (firstEmailDate, totalEmails, lastReplyDate)
3. **Sentiment Analysis**: Tag setiap inbound message dengan sentiment (positive, neutral, negative)
4. **Priority Scoring**: Email dengan kata "urgent", "asap", "complaint" dapat priority flag
5. **Auto-Tagging**: Tag berdasarkan subject/body (sales, support, partnership, general)
6. **Dashboard**: Halaman `/dashboard` untuk melihat semua conversations, filter, dan analytics

---

## 🎨 VIBE CODING PRINSIP

- **Kode dulu, perfect later**: Buat yang works, refine iterasi
- **Type-safe**: Gunakan TypeScript strict mode
- **Edge-first**: Manfaatkan Cloudflare Worker + Vercel Edge
- **Database minimal**: Prisma dengan PostgreSQL (Supabase free tier)
- **Observability**: Console.log minimal, gunakan Sentry/Vercel Analytics untuk production
- **Testing**: Kirim test email ke info@aetherglo.com untuk verify end-to-end

---

## 🚀 DEPLOYMENT CHECKLIST

- [ ] Domain `aetherglo.com` aktif dengan MX records ke Cloudflare
- [ ] Cloudflare Email Worker deployed dan routed ke `info@aetherglo.com`
- [ ] Vercel project dengan environment variables:
  - `OPENAI_API_KEY`
  - `RESEND_API_KEY` atau `BREVO_API_KEY`
  - `DATABASE_URL`
  - `WEBHOOK_SECRET`
- [ ] Prisma schema migrated ke database
- [ ] API Route `/api/email-chat` deployed dan accessible
- [ ] Resend/Brevo domain verified (SPF, DKIM, DMARC di DNS)
- [ ] Test kirim email ke info@aetherglo.com → verify balasan diterima
- [ ] Dashboard CRM page (opsional tapi recommended)

---

## 💬 CONTOH PERCAKAPAN

**Email Masuk:**
```
From: john@example.com
Subject: Tanya harga jasa website
Body: Halo, saya saya ingin pesan.
```

**AI Balasan:**
```
Halo John,

Terima kasih telah menghubungi AetherGlo! ✨

Boleh kami tahu nama outlet atau nama owner nya?
```
mencocokan data, ini adalah aplikasi b2b jika customer legit kemudian layani

---

## 📝 CATATAN PENTING

- Jika email masuk dari `noreply`, `no-reply`, atau email sistem — jangan balas (auto-skip)
- Jika email adalah auto-reply (out-of-office, delivery status) — jangan balas
- Selalu gunakan `Re:` di subject untuk threading
- Simpan `messageId` asli untuk referensi threading
- Monitor delivery status via Resend/Brevo dashboard
- Setup alert jika webhook gagal (gunakan Cloudflare Logs)

---

**Mulai coding sekarang. Build fast, ship faster. 🚀**
