# Student Super App

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
GPA Calculator, Notification Center, Global Search, Profile, Settings, Auth.

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


## Foydali buyruqlar

| Buyruq              | Tavsif                              |
| ------------------- | ----------------------------------- |
| `npm run dev`       | Dev server                          |
| `npm run build`     | Production build                    |
| `npm run lint`      | ESLint                              |
| `npm run typecheck` | TypeScript tekshiruvi               |
| `npm run db:push`   | Prisma sxemani bazaga qo'llash      |
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
