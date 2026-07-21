# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

This is a **frontend FSD template** (`frontend-fsd-template`) — a starter for single-page apps at Uchi (uchi.ru). It is a *template*, not a real product: it ships an example "battle page" app whose only purpose is to demonstrate the architecture. New projects fork this repo and run `pnpm init-template` to replace `[TODO]` placeholders with real values.

Stack: **React 19, Zustand, @tanstack/react-query, Tailwind CSS v4, TypeScript, Vite, React Router v7, CSS Modules**. Node 24.18 (see `.nvmrc`). Package manager is **pnpm**; dependencies are pinned to exact versions via `save-exact=true` in `.npmrc` — install with `pnpm add <pkg>` (no extra flag needed).

Build/lint/dev config is **not defined inline** — it comes from the shared `@uchi/content-0-4-*` config packages:
- `vite.config.ts` extends `@uchi/content-0-4-vite-config`
- `tsconfig.json` extends `@uchi/content-0-4-typescript-config/base`
- `eslint.config.js` extends `@uchi/content-0-4-eslint-config`
- `prettier` uses `@uchi/content-0-4-prettier-config`

When changing build/alias/proxy behavior, check the upstream config package before assuming something is configurable here. The default path alias is `src` → `src/*` (configured across `tsconfig*.json` and the upstream vite config).

## Commands

```bash
pnpm install              # install deps
pnpm dev                  # local dev server (Vite)
pnpm build                # type-check (tsc -b) + production build
pnpm preview              # preview the production build
pnpm lint                 # eslint .
pnpm init-template        # interactive scaffolding: replaces [TODO] placeholders across repo
```

There is no test runner configured in this template.

## Architecture — Feature-Sliced Design (FSD)

The codebase follows **Feature-Sliced Design**. `src/` is divided into layers, each with a strict dependency rule: **a layer may only import from layers below it**, never above. Order (top → bottom): `app` → `pages` → `widgets` → `features` → `entities` → `shared`.

```
src/
├── app/        # entry point + global concerns: providers, router, global styles
├── pages/      # route-level screens (e.g. example-battle-page)
├── widgets/    # large self-contained UI blocks reused across pages
├── features/   # reusable user-facing interactions (e.g. example-shop)
├── entities/   # business domain models (e.g. example-character)
└── shared/     # cross-cutting: api, model, context — no business logic
```

Each layer's `README.md` documents its intended contents in Russian — read them when deciding where new code belongs. Key conventions from those docs:
- **Pages** compose widgets/features/entities; a page holds its own page-level model.
- **Widgets** are for blocks reused across pages OR large independent blocks on a page. A block used on only one page that dominates that page belongs *on the page*, not in widgets.
- **Features** should only be promoted to features if they are reused — don't over-feature.
- **Entities** are slices that must not know about each other; cross-entity references go through `@x`-notation (public API), not direct imports.

### Internal structure of a slice

Each slice (e.g. `entities/example-character`) follows a segment pattern:
- `model/` — MobX store class(es) (the business state)
- `ui/` — React components, each in its own folder with `index.tsx` + optional `types.ts` + `*.module.css`
- `index.ts` — **public API barrel**. Other layers import *only* from the slice root, never from internal paths.

### State management pattern (Zustand + TanStack Query)

State is split by its nature:

- **Server state** (data fetched from the API) → **TanStack Query**. Queries are abstracted into custom hooks that live at the API boundary (`shared/api`, e.g. `useUserQuery`). Query keys use a factory (`userKeys`). Do **not** mirror query data into Zustand stores — consume the hook result directly (no `useEffect` syncing).
- **Client state** (UI / domain) → **Zustand**. Stores are created via `create*Store()` factory functions (so per-instance stores are possible, e.g. one per `Character` on a page) using the `subscribeWithSelector` middleware, with state and actions kept in separate interfaces. Components read them with individual selectors via `useStore(store, (s) => s.field)` to minimize re-renders. See `entities/example-character/model` and `pages/example-battle-page/model/battle-page`.

App-global providers live in `shared/context` — `QueryProvider` wraps the app in a `QueryClientProvider` (created once via `useState`). This is the established pattern for global concerns; follow it when adding new providers.

### App bootstrap flow

`src/main.tsx` → renders `src/app/index.tsx` (`App`). `App` wraps everything in `QueryProvider` (sets up the TanStack Query `QueryClient`), then `BrowserRouter` with `basename={Environment.basePath}`. Routes are declared inline in `app/index.tsx`. Global styles live in `app/styles/app.css` (imports Tailwind and defines `@theme` tokens).

### Environment & config access

`shared/model/environment` exposes a static `Environment` class that reads `import.meta.env` and **throws at runtime** if a required var is missing. Access env via `Environment.basePath` etc. — do not read `import.meta.env` directly in feature/page code. Env vars are Vite-prefixed (`VITE_*`) and templated with Shaman placeholders in `.env.production` (e.g. `<%SHAMAN_ENVIRONMENT-stage%>`).

`shared/api` is the API boundary. Currently `Api` returns mocks (`shared/api/mocks`) and is consumed by the `useUserQuery` TanStack Query hook; real HTTP + Vite dev proxy config (`VITE_PROXY_PATH_*` → `server.proxy`) is set up via the upstream vite config — add `VITE_PROXY_PATH_<NAME>=<path>` vars in `.env.development` to register a proxy route.

## Template scaffolding (`pnpm init-template`)

`scripts/init-template.js` is an interactive inquirer script that replaces `[TODO]` placeholders across the repo (package.json, `.shaman/*.yml`, `.env.*`, `.gitlab-ci.yml`, `index.html`, `.gitlab/CODEOWNERS`, README). It matches placeholders left-to-right against supplied values. When editing template files, **preserve the `[TODO]` markers** — removing them breaks scaffolding. The same applies to `.shaman/*.yml` Shaman template syntax (`<%...%>`, `${{ ... }}`).

## CI / deploy

`.gitlab-ci.yml` includes `uchiru/ci/shared` (build-and-push) and a custom `audit` job (stage `checks`) that runs `pnpm audit --prod --audit-level=high` — the upstream `content-0-4-configs` audit template is yarn@1-based and is not used. `BASE_PATH` is a required CI variable (currently `[TODO]`). The Dockerfile is a two-stage build (`node:24.18.0-alpine` → `${BASE_IMAGE}`) that authenticates to an internal Verdaccio registry via a build secret (`npm_token`), installs pnpm globally via `npm install -g` (corepack is not used — it can't reach `registry.npmjs.org` from CI nor use the `https_proxy` that npm honors), and runs `pnpm build`. Public packages come from `registry.npmjs.org` through the build's `https_proxy`; `@uchi/*`/`@front`/`@uchi-schema` come from Verdaccio. The `pnpm-lock.yaml` must be committed for `--frozen-lockfile`. Shaman (`.shaman/*.yml`) describes the deployed app service and its routing/auth rules for the uchi.ru platform.
