# AGENTS.md

## Project
CommerceOS: TypeScript/Express API for POS inventory, sales, customers, users, and refunds. Prisma + PostgreSQL, Socket.IO for realtime.

## Stack
- Node.js, TypeScript (`strict`), Express 5, npm
- Prisma 7 (PostgreSQL adapter), schema split across `prisma/*.prisma`
- Zod, Socket.IO, Redis, Cloudinary, JWT, Nodemailer

## Commands
- Dev: `npm run dev`
- Build: `npm run build`
- Typecheck: `npm run typecheck` (`tsc --noEmit`)
- Prisma generate (after any schema change): `npx prisma generate`
- Migrate (dev): `npm run db:migrate` (needs `DATABASE_URL`)
- Lint / test: not configured yet. Do not claim they passed.

## Architecture
- App setup in `src/app.ts`; routes registered in `src/app/routes/index.ts` under `/api/v1`.
- Feature modules: `src/app/modules/<feature>/<feature>.{routes,controller,service,schema}.ts`
- Flow: route (validate) -> controller (HTTP shape only) -> service (business rules + DB).
- Shared code (middleware, errors, config, utils): `src/app/`. Socket transport: `src/socket/`.
- Only services touch Prisma. Import the client and types only from `src/app/generated/prisma`.
- A module never imports another module's internals. Cross-module calls go through the other module's service.

## Conventions
- Validate request bodies with the feature's Zod schema via `validate()` (`src/app/middleware/validate.ts`).
- Controllers are wrapped in `catchAsync`. Expected failures: `throw new AppError(message, statusCode)`.
- Responses use `sendResponse`: `{ success, message, data }` (+ `meta` when paginated). Do not change this shape.
- URL paths are lowercase, e.g. `/api/v1/products`.
- Multi-step writes use a Prisma transaction.
- Every stock change writes a `StockMovement` record and keeps the existing realtime broadcast.

## Adding a new feature/module
1. Copy the structure of the closest existing module (e.g. `product`). Keep the same file names.
2. Add its Prisma model in the matching `prisma/*.prisma` file, then migrate and run `npx prisma generate`.
3. Register the router in `src/app/routes/index.ts`.
4. Realtime needed? Add the handler inside the module and register it in `src/socket/`.
5. Update `API_ENDPOINTS.md` (and `SOCKET_INSTRUCTIONS.md` if events changed).
6. Run `npm run build` and `npm run typecheck`.

## Never do
- Read, print, commit, or overwrite `.env`, or copy any secret. Use placeholders.
- Hand-edit `src/app/generated/prisma`. Change the schema and regenerate.
- Modify migrations that are already applied.
- Run `db:reset`, destructive DB commands, or migrations on any database without explicit approval.
- Add dependencies without asking.

## Before finishing
Run `npm run build` and `npm run typecheck`. Report anything you could not verify.

## Nested AGENTS.md
Agents read the closest `AGENTS.md`. Add one inside a module folder only when that module has risky or non-obvious rules (e.g. money, auth, realtime). Keep each under 20 lines and do not repeat root rules.

## Docs (read only when relevant)
- `API_ENDPOINTS.md`
- `SOCKET_INSTRUCTIONS.md`
- `REALTIME_STOCK_INSTRUCTIONS.md`
- `prisma/` schema and migration history

## Maintaining this file
- Add one line only after the agent repeats the same mistake twice.
- Update it in the same PR as any change to commands, structure, or conventions.
- Remove lines that are obvious from the code or no longer true. Keep this file under ~120 lines.