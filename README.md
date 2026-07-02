# Nextjs Boilerplate

Nextjs Boilerplate is a Next.js web application foundation with user accounts. The app currently includes authentication flows, a example page, user profile management, display preferences, basic login, and Google OAuth support.

## Code Overview

- `app/` contains Next.js App Router pages and route handlers, including login, signup, example page, profile, and auth/profile API routes.
- `components/` contains reusable UI components such as authentication forms, sidebar, language switcher, and base UI components.
- `lib/` contains application helpers for auth, sessions, API responses, Prisma client, i18n, and theme settings.
- `prisma/` contains the database schema, migrations, and Prisma configuration.
- `public/` contains static application assets.

## Tech Stack

- Next.js 16 with App Router
- React 19
- TypeScript
- Tailwind CSS 4
- shadcn/base-ui style components
- Prisma 7
- PostgreSQL
- JWT/session auth with `jose`
- Password hashing with `bcryptjs`
- Google OAuth
- Bun as the package manager

## Requirements

- Node.js 20.9 or newer
- Bun
- A running PostgreSQL database

## Installation

1. Install dependencies:

   ```bash
   bun install
   ```

2. Copy the environment file:

   ```bash
   cp .env.example .env
   ```

   On Windows PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

3. Fill in the `.env` values for your local environment:

   ```env
   APP_URL="http://localhost:3000"
   DATABASE_URL="postgresql://user:password@localhost:5432/your-db-name?schema=public"
   JWT_SECRET="change-this-to-a-long-random-secret"
   ACCESS_TOKEN_EXPIRES_IN="1h"
   REFRESH_TOKEN_EXPIRES_IN="30d"
   GOOGLE_CLIENT_ID="your-google-oauth-client-id"
   GOOGLE_CLIENT_SECRET="your-google-oauth-client-secret"
   ```

4. Generate the Prisma Client:

   ```bash
   bun run prisma:generate
   ```

5. Run database migrations:

   ```bash
   bun run prisma:migrate
   ```

## Running the App

For development:

```bash
bun run dev
```

Open the app at:

```text
http://localhost:3000
```

To create a production build:

```bash
bun run build
```

To run the production build:

```bash
bun run start
```

## Other Commands

```bash
bun run lint
bun run prisma:studio
```

- `bun run lint` runs ESLint.
- `bun run prisma:studio` opens Prisma Studio to view and manage database records.
