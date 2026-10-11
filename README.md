# Student App

Studentlar uchun o'qish, vaqt, vazifa, imtihon, xarajat va shaxsiy rivojlanishni
boshqarish platformasi. Bir platformada barcha kerakli vositalar.

## Texnologiyalar

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript**
- **Tailwind CSS v4** + Radix UI primitivlari asosidagi komponentlar
- **Prisma 6** + **PostgreSQL**
- **jose** (JWT session) + **bcryptjs** (parol hashlash) — custom autentifikatsiya
- **TanStack Query**, **react-hook-form** + **Zod**, **Recharts**, **Framer Motion**, **next-themes**, **sonner**

## Modullar

Dashboard, Smart Schedule, Homework, Smart Todo, Deadline, Notes, Focus (Pomodoro),
Study Analytics, Goals, Materials, Exam Planner, Smart Calendar, Budget,
GPA Calculator, Davomat (attendance), Notification Center, Global Search,
Profile, Settings, Auth.

## O'rnatish

1. Kutubxonalarni o'rnatish:

   ```bash
   npm install
   ```

2. `.env` faylini yaratish (`.env.example` dan nusxa oling) va `DATABASE_URL` ni to'ldirish:

   ```bash
   cp .env.example .env
   ```

   PostgreSQL manzili misoli:

   ```
   DATABASE_URL="postgresql://postgres:password@localhost:5432/studentapp?schema=public"
   ```

   > **Docker o'rnatilmagan bo'lsa**, bepul bulutli PostgreSQL (masalan,
   > [Neon](https://neon.tech) yoki [Supabase](https://supabase.com)) dan foydalaning va
   > ulanish satrini `DATABASE_URL` ga qo'ying.

3. `SESSION_SECRET` ni o'zgartiring (`.env`):

   ```bash
   openssl rand -base64 32
   ```

4. Sxemani bazaga qo'llash va demo ma'lumotlarni yuklash:

   ```bash
   npm run db:push
   npm run db:seed
   ```

5. Serverni ishga tushirish:

   ```bash
   npm run dev
   ```

   Ochish: [http://localhost:3000](http://localhost:3000)

## Demo login

```
Email:  demo@student.app
Parol:  demo1234
```

## Google orqali kirish (OAuth)

Google bilan kirish uchun Google Cloud'da OAuth kalitlarini oling:

1. [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials) ga kiring.
2. **OAuth consent screen** ni sozlang (External). Scope'larga `email`, `profile`, `openid` qo'shing.
   Testing rejimida bo'lsangiz, **Test users** ga o'z Gmail manzilingizni qo'shing.
3. **Create credentials → OAuth client ID → Web application**.
   - **Authorized JavaScript origins:** `http://localhost:3000`
   - **Authorized redirect URIs:** `http://localhost:3000/api/auth/google/callback`
4. Olingan **Client ID** va **Client Secret** ni `.env` ga yozing:

   ```
   GOOGLE_CLIENT_ID="....apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="...."
   ```

5. Dev serverni **qayta ishga tushiring** (env o'zgarishi restart talab qiladi).

Shundan so'ng login/register sahifalaridagi **"Google bilan kirish"** tugmasi ishlaydi.
Google hisobi birinchi marta kirganda avtomatik `User` + `StudentProfile` yaratiladi.

> Ishlab chiqarishda `GOOGLE_CLIENT_ID`/`SECRET` ni production domen uchun alohida
> yarating va redirect URI'ni `https://<domen>/api/auth/google/callback` qilib qo'shing.


## PWA yangilanish va push bildirishnomalar

Ilova yorliq (PWA) sifatida o'rnatilganda yangilanishlar avtomatik tekshiriladi:

- `public/sw.js` — statik fayllar keshi va internet uzilganda xavfsiz
  `/offline.html` sahifasi. Shaxsiy sahifalar va API javoblari keshlanmaydi.
- Sahifa ochilganda va har 60 sekundda `/api/version` tekshiriladi. Yangi versiya
  chiqsa, **"Yangi versiya mavjud — Yangilash"** tugmasi chiqadi.
- Versiya `next.config.ts` da build paytida (Vercel'da commit SHA) aniqlanadi.

### Push bildirishnomalar

1. VAPID kalitlarini yarating:

   ```bash
   npx web-push generate-vapid-keys
   ```

2. Kalitlarni `.env` (va Vercel Environment Variables) ga qo'shing:

   ```
   NEXT_PUBLIC_VAPID_PUBLIC_KEY="..."
   VAPID_PRIVATE_KEY="..."
   VAPID_SUBJECT="mailto:admin@example.com"
   ```

3. Foydalanuvchi **Sozlamalar → Bildirishnomalar → "Yangilanish bildirishnomalari"**
   ni yoqadi (brauzer ruxsati so'raladi).

4. Har bir production deploy'da (`npm run build` → `postbuild`) barcha obunachilarga
   "Yangi versiya mavjud" push yuboriladi. Preview deploy'larda yuborilmaydi.

   > Vercel'dagi **Build Command** `npm run build` bo'lishi kerak (`vercel.json` da
   > belgilangan), shunda `postbuild` ishlaydi. Lokal test uchun: `NOTIFY_ON_BUILD=1`.

### Ruxsat so'rovi

Ilovaga kirganda (login qilingan sahifalarda) `NotificationPrompt` komponenti
bildirishnomaga ruxsat so'raydi. "Keyinroq" bosilsa, 3 kundan keyin yana so'raladi.

### Kunlik eslatma (Vercel Cron)

`vercel.json` da sozlangan cron har kuni `GET /api/cron/daily` ni chaqiradi:

- Bildirishnomalarni yoqqan foydalanuvchilarga kuniga bir marta eslatma yaratadi.
- Push obuna bo'lgan va bildirishnomalarni yoqqanlarga yuboradi.
- Muddati o'tgan so'rov limiti yozuvlarini tozalaydi.
- Xabarlar ro'yxati: `src/features/notifications/daily-messages.ts`.

Cron'ni himoyalash uchun `.env` va Vercel'ga `CRON_SECRET` qo'shing:

```
CRON_SECRET="<random>"
```


## AI rasm generatsiyasi

AI yordamchi rasm so'rovlarini avtomatik aniqlab, rasm generatsiya qiladi.
Ikki provayder qo'llab-quvvatlanadi:

1. **Gemini** (`gemini-2.5-flash-image`, `gemini-3.1-flash-image`, ...) — eng aniq
   natija, lekin **billing talab qiladi** (bepul kvota = 0).
2. **Pollinations** (`sana`) — bepul, lekin anonim rejimda sekin (15 sek/so'rov) va
   suv belgisi bo'ladi.

`AI_IMAGE_PROVIDER="auto"` (standart) bo'lsa, avval Gemini sinaladi, ishlamasa
Pollinations'ga o'tadi. So'rov avval Gemini matn modeli orqali batafsil ingliz
tilidagi promptga aylantiriladi (aniqlikni oshiradi).

Muhit o'zgaruvchilari: `AI_IMAGE_PROVIDER`, `POLLINATIONS_TOKEN`,
`POLLINATIONS_MODEL`, `GEMINI_IMAGE_PROMPT_MODEL`, `AI_IMAGE_DISABLED`.
Har ikki provayder rasmlari bazada saqlanadi va faqat egasiga
`/api/ai/image/[id]` orqali beriladi. Provayder tokenlari brauzerga berilmaydi.

## Xavfsizlik yangilanishini qo'llash

Mavjud bazani ishlatayotgan bo'lsangiz, yangi kodni ishga tushirishdan oldin:

```bash
npm run db:security-upgrade
npm run db:generate
```

`prisma/security-upgrade.sql` mavjud ma'lumotlarni saqlagan holda
`User.sessionVersion` ustuni va umumiy `RequestRateLimit` jadvalini qo'shadi.
Yangi, bo'sh bazada `npm run db:push` joriy sxemani to'liq yaratadi.
Eski formatdagi sessiyalar qabul qilinmaydi; foydalanuvchilar qayta kiradi.
Parol tiklanganda shu hisobning barcha avvalgi sessiyalari bekor qilinadi.

Login, ro'yxatdan o'tish va parol tiklash urinishlari PostgreSQL orqali
barcha server nusxalari uchun birgalikda cheklanadi. AI so'rovlari bir
foydalanuvchiga daqiqasiga 10, 24 soatlik oynada 120; rasm so'rovlari
shu oynada 5 ta bilan cheklangan. Vercel'da ishonchli IP header avtomatik
ishlatiladi. Boshqa reverse proxy'da `TRUST_PROXY=1` faqat proxy mijoz
yuborgan `x-forwarded-for` qiymatini almashtirsa yoqiladi.

### Parolni email orqali tiklash

`.env` va production muhitiga quyidagilarni kiriting:

```dotenv
APP_URL="https://sizning-domeningiz.uz"
RESEND_API_KEY="<server-api-key>"
EMAIL_FROM="Student App <noreply@sizning-domeningiz.uz>"
```

Yuboruvchi domen [Resend'da tasdiqlangan](https://resend.com/docs/api-reference/emails/send-email)
bo'lishi kerak. Lokal muhitda `APP_URL=http://localhost:3000` mumkin.
Konfiguratsiya bo'lmasa, tiklash funksiyasi havolani qaytarmaydi va
xizmat mavjud emasligini tushunarli ko'rsatadi. Mavjud va mavjud bo'lmagan
hisoblar uchun yuborish javobi bir xil; token faqat emailga yuboriladi.
Production'da `SESSION_SECRET` kamida 32 bayt bo'lishi kerak.

Resend hisobini https://resend.com/signup orqali oching. Dashboard'dagi
`Domains` bo'limiga o'zingizga tegishli domenni qo'shing va ko'rsatilgan
DNS yozuvlarini domen provayderingizda tasdiqlang. `API Keys` bo'limida
email yuborish uchun kalit yarating; uni faqat `.env` yoki hostingning
server environment variables sozlamasiga kiriting. `EMAIL_FROM` shu
tasdiqlangan domendagi manzil bo'lishi kerak. Production'da `APP_URL`
saytning haqiqiy HTTPS manziliga almashtiriladi. So'ng serverni qayta
ishga tushiring va o'zingizning test hisobingizga tiklash xatini yuborib,
emaildagi havola orqali parolni yangilang. Maxfiy kalitni chat, Git yoki
brauzerning public environment variables qismiga joylamang.

### Interfeys va tekshiruvlar

Hozir interfeys o'zbek tilini qo'llaydi. Tarjima ulanmagan til tanlovlari
olib tashlangan. Asosiy ro'yxatlar serverda filtrlanadi va 24 tadan
sahifalarga ajratiladi; statistikalar to'liq ma'lumotlar agregatidan olinadi.
Offline sahifa shaxsiy ma'lumotlarni ko'rsatmaydi; offline tahrirlash yo'q.

```bash
npm run lint
npm run typecheck
npm test
```

Regressiya testlari tarmoq/email/haqiqiy bazaga yozmasdan, haqiqiy modul
kodini boshqariladigan request va database mock'lari bilan tekshiradi.
Production build'ni push yubormasdan tekshirish:

```bash
node node_modules/next/dist/bin/next build
```


## Talabalar uchun yangi vositalar

- `/learn` — qo'lda yoki AI bilan kartochka yaratish, tahrirlash, test, natijalar
  tarixi va vaqt oralig'ida takrorlash. Eslatmadagi “Test va kartochka yaratish”
  havolasi konspektni tanlaydi. Xato test javoblari takrorlashga qaytadi.
  Noto'g'ri variantlari bo'lmagan kartochka testda aniq javob matni bilan tekshiriladi.
- `/study-plans` — mavjud imtihon uchun mavzu va vaqt asosida kunlik reja.
  Bajarilgan mashg'ulotlar imtihon tayyorgarlik foizini yangilaydi. Qayta
  taqsimlash bajarilgan ishni saqlaydi; vaqt yetmasa sig'magan daqiqalar ko'rsatiladi.
  Yangi reja bilan almashtirish esa bajarilish tarixini qaytadan boshlaydi.
- `/groups` — savollarni fan/mavzu bilan belgilash va guruhlar bo'ylab qidirish.
  `/groups/questions/[id]` — sahifalangan javoblar. Savol muallifi yoki guruh
  egasi bitta foydali javobni belgilaydi; faqat guruh a'zolari ko'rishi va yozishi mumkin.
- `/opportunities` — stipendiya, grant va amaliyot katalogi: kurs (profil kursi
  standart tanlanadi), yo'nalish, til, tur va muddat bo'yicha filtrlar, saqlanganlar.
  Haqiqiy e'lonlar rasmiy HTTPS manbasi bilan qo'lda ulashiladi. `User.role=ADMIN`
  bo'lgan administrator manbani tekshirib tasdiqlaydi; tahrir tasdiqni bekor qiladi.
  Avtomatik tashqi e'lon yig'ish yo'q, katalog jamoa va administrator orqali yuritiladi.
- `/schedule/import` — 3 MB gacha PNG/JPEG/WebP, PDF, TXT yoki CSV.
  CSV uchun AI shart emas; rasm/PDF/matn uchun `GEMINI_API_KEY` kerak.
  Ajratilgan qatorlar tahrirlanib tasdiqlangandan keyingina saqlanadi.
  Takroriy darslar o'tkazib yuboriladi, vaqtlar to'qnashsa saqlash rad etiladi.
  Namuna: `public/schedule-template.csv`. Yuklangan fayl bazada saqlanmaydi;
  rasm/PDF/matn tahlil uchun Gemini xizmatiga yuboriladi.

AI javoblari serverda Zod bilan tekshiriladi, foydalanuvchi saqlashdan oldin
tahrirlay oladi. Yangi AI vositalari uchun limit: daqiqasiga 5, sutkasiga 30 so'rov.
Kunlik `/api/cron/study` (`CRON_SECRET` bilan) takrorlash, bugungi tayyorgarlik
va saqlangan e'lonning 3 kun ichidagi muddati haqida bildirishnoma yaratadi.
Bildirishnoma sozlamalari hisobga olinadi; takroriy cron bir xil eslatmani qayta yubormaydi.
Vercel jadvali: har kuni 09:15 Asia/Tashkent. Lokal muhitda cron o'zi ishlamaydi.

Mavjud bazada yangi kodni birinchi ishga tushirishdan oldin bir marta:

```bash
npm run db:student-tools-upgrade
npm run db:generate
```

Yangilanish faqat yangi jadvallar va `GroupPost.subject/topic` ustunlarini qo'shadi,
transaction ichida bajariladi. Yangi bo'sh bazada `npm run db:push` kifoya.
Dev server Prisma DLL faylini band qilgan bo'lsa, serverni to'xtatib
`npm run db:generate` bajarib, keyin serverni qayta ishga tushiring.

Haqiqiy baza bilan alohida tekshiruv:

```bash
node --import tsx scripts/check-student-tools.mjs --run
```

Bu buyruq vaqtinchalik sinov hisobi orqali beshta funksiyani tekshiradi va
sinov hisobini ma'lumotlari bilan tozalaydi. Oddiy `npm test` bazaga yozmaydi.

## Davomat, biriktirmalar va semestrlar

### Davomat (`/attendance`)

Darslarga haqiqiy qatnashishni yuritadi: fan, sana va holat (`Bor`, `Kelmadi`,
`Kechikdi`, `Sababli`). Har bir yozuv uchun foiz, qolgan darslar va holatlar
bo'yicha statistika hisoblanadi. Bir kunda bir xil dars uchun takroriy yozuv
qo'shilmaydi — mavjudi yangilanadi. Dashboard'dagi “Davomat” kartasi shu
yozuvlardan hisoblanadi (yozuv bo'lmasa `—`), uy vazifalari bajarilishi esa
alohida karta sifatida ko'rsatiladi.

### Deadline eslatmalari

`Task`, `Homework` va `Exam` muddatlari uchun **24 soat** va **1 soat** oldin
bildirishnoma va push yuboriladi. Bajarilgan vazifalar chiqarib tashlanadi,
har bir oyna faqat bir marta ishlaydi (takroriy yuborish bloklanadi) va yetkazish
`ToolReminder` orqali atomik nazorat qilinadi.

- `/api/cron/reminders` — har soatda (`vercel.json`) 1/24 soat oynalarini tekshiradi.
- `/api/cron/study` — kunlik vazifa; shuningdek deadline eslatmalarini ham chaqiradi.
- `CRON_SECRET` bilan himoyalangan. Soatlik cron uchun hosting jadvalida
  (`vercel.json` `crons`) kamida soatlik rejim kerak.

### Fayl biriktirish

Material, eslatma va uy vazifasiga PDF, DOCX yoki rasm (JPEG/PNG/GIF/WebP,
8 MB gacha) biriktiriladi. Fayl turi va hajmi **baytlar bo'yicha** tekshiriladi
(declared MIME'ga ishonilmaydi); fayllar bazada (`Attachment.data`) saqlanadi va
faqat egasiga `/api/attachments/[id]` orqali beriladi (`Content-Disposition`,
`nosniff`, `private, no-store`). Bir elementga ko'pi bilan 20 ta fayl.
Tahrirlash oynasida (mavjud yozuv uchun) biriktirmalar boshqariladi.

### Semestrlar va akademik tarix

`Semester` modeli va `Grade.semesterId` orqali baholar semestrlarga bog'lanadi.
`/gpa` sahifasida semestrni tanlab, faqat o'sha semestr GPA/kreditini ko'rish,
semestr qo'shish va o'chirish mumkin. Semestr o'chirilganda baholar saqlanadi
(`semesterId` — `NULL`).

### Migratsiyalar va CI

Sxema o'zgarishlari `prisma/migrations`da versiyalanadi:

```bash
npx prisma migrate deploy   # mavjud bazaga qo'llash
npx prisma generate
```

`db:push` o'rniga yangi muhitlarda `migrate deploy` afzal. GitHub Actions
(`.github/workflows/ci.yml`) har push/PR'da `prisma validate`, lint, typecheck va
testlarni ishga tushiradi.

## Foydali buyruqlar

| Buyruq              | Tavsif                              |
| ------------------- | ----------------------------------- |
| `npm run dev`       | Dev server                          |
| `npm run build`     | Production build                    |
| `npm run lint`      | ESLint                              |
| `npm run typecheck` | TypeScript tekshiruvi               |
| `npm run db:push`   | Prisma sxemani bazaga qo'llash      |
| `npx prisma migrate deploy` | Versiyalangan migratsiyalarni qo'llash |
| `npm run db:seed`   | Demo ma'lumotlar                    |
| `npm run db:studio` | Prisma Studio                       |

## Arxitektura

```
src/
├─ app/
│  ├─ (auth)/        # login, register, forgot/reset password
│  └─ (app)/         # himoyalangan sahifalar (dashboard, schedule, ...)
├─ features/<name>/  # har bir modul: schema.ts, actions.ts, queries.ts, components/
├─ components/       # ui/ (primitivlar), layout/, shared/
├─ lib/              # prisma, auth (session, dal, actions), utils, format, constants
└─ proxy.ts          # optimistic auth guard (Next.js 16 middleware→proxy)
```
