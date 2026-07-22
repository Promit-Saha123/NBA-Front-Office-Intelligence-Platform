# Roster Lab frontend

Next.js 16 App Router client for the NBA Front Office Intelligence Platform.
See the [repository root README](../README.md#local-development) for the
full local setup (both services, environment variables, common failures).

Quick start (assumes the backend is already running — see the root README):

```bash
pnpm install
pnpm dev
```

Opens at http://localhost:3000, reading `NEXT_PUBLIC_API_URL` from
`.env.local` (copy `.env.example` if you haven't already) to call the
FastAPI backend directly — there is no Next.js proxy route
([decision 0008](../docs/decisions/0008-roster-lab-frontend-architecture.md) §6).

Commands: `pnpm dev` / `build` / `start` / `lint` / `typecheck` / `test` /
`test:codegen` / `generate:api` / `check:api-fresh` — see `package.json`'s
`scripts` or the root README's "Test and quality-check commands" section.
