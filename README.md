# bhvrd

**B**un · **H**ono · **V**ite · **R**eact · **D**rizzle

Scaffold a production-ready full-stack monorepo in seconds.

## Quick Start

```bash
bunx bhvrd create myapp
cd myapp
```

Or scaffold in the current directory:

```bash
mkdir myapp && cd myapp
bunx bhvrd create .
```

## What You Get

```
myapp/
├── server/          Hono API + Drizzle ORM + PostgreSQL + Redis
├── client/          Vite + React (port 5174)
├── admin/           Vite + React (port 5173)
└── shared/          Zod validations + shared types
```

All packages are linked via Bun workspaces with `@myapp/shared` as the shared dependency.

## Stack

| Layer      | Technology                                               |
| ---------- | -------------------------------------------------------- |
| Runtime    | [Bun](https://bun.sh)                                    |
| Server     | [Hono](https://hono.dev)                                 |
| Frontend   | [Vite 8](https://vite.dev) + [React 19.2](https://react.dev) |
| Styling    | [Tailwind CSS v4](https://tailwindcss.com)                |
| Database   | [Drizzle ORM](https://orm.drizzle.team) + PostgreSQL     |
| Cache      | [Redis](https://redis.io) via ioredis                    |
| Validation | [Zod 4](https://zod.dev)                                  |

## After Scaffolding

```bash
# Set up environment
cp server/.env.example server/.env

# Start development
bun run dev:server     # API on :3000
bun run dev:client     # Client on :5174
bun run dev:admin      # Admin on :5173

# Database
cd server
bunx drizzle-kit generate
bunx drizzle-kit migrate
bunx drizzle-kit studio
```

## Import Aliases

Internal imports use `@/` — no need to reference the package name inside its own code:

```ts
// server/src/routes/users.ts
import { db } from "@/db";
import { redis } from "@/lib/redis";

// client/src/pages/Home.tsx
import { Header } from "@/components/Header";
import "@assets/index.css";
```

Cross-package imports use the scoped package name:

```ts
// server or client
import { z } from "@myapp/shared/validations";
import type { User } from "@myapp/shared/types";
```

## License

MIT
