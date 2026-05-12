# Kirta Platform — Frontend

React + TypeScript SPA for the Kirta security analysis platform (SAST / DAST / SCA).

## Tech stack

- Vite + React 18 + TypeScript (strict)
- Tailwind CSS + shadcn/ui (Radix primitives) + lucide-react icons
- React Router v6 for navigation
- TanStack Query for async data
- Zustand for auth and theme state (localStorage persisted)
- react-syntax-highlighter (Prism, Python) for the source code modal

## Getting started

```bash
npm install
npm run dev
```

Mock auth (dev-only): any non-empty `username/password` pair is accepted.

## Architecture

The codebase strictly separates presentation from data access:

```
src/
  app/             App shell, router, providers
  pages/           Page components (composition only)
  features/       Feature modules (auth, scans, reports, sca, theme)
  components/
    ui/            Reusable UI primitives (no business logic, no API calls)
    layout/        Layout primitives (TopNav, AppLayout, UserBlock, ScanButton)
  repositories/   Repository / API access layer (mocks today, swap to HTTP later)
    mocks/         Fixture data
  types/           DTO + domain types (1:1 with backend Go structs)
  hooks/           Reusable hooks
  utils/           Helper functions
```

UI components never call `fetch`/`axios` directly. All backend access goes through the
repository layer; pages and feature hooks consume those repositories. The mock
repositories are drop-in replaceable with HTTP implementations once the backend
endpoints are ready.

## Scripts

- `npm run dev` — local dev server
- `npm run build` — type-check + production build
- `npm run preview` — preview the production build
- `npm run lint` — ESLint
- `npm run format` — Prettier
