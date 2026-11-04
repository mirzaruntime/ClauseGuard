# ClauseGuard Frontend

The ClauseGuard frontend is a React and TypeScript single-page application built with Vite. It provides account access, contract upload and review, obligation management, dashboards, and reminders through the backend API.

AI-generated contract analysis is assistive extraction, not legal advice. Suggestions require human review before they are treated as confirmed obligations.

## Stack

React 19, TypeScript, Vite 8, React Router, Axios, Zustand, Tailwind CSS 4, Radix UI, Motion, Recharts, and Lucide.

## Setup

```bash
npm install
npm run dev
```

The Vite development server runs on port 5173 and proxies `/api` to `http://localhost:4000`, the backend's default address. Run the backend separately for API-backed functionality. To use a different API base URL, set `VITE_API_BASE_URL` in a local environment file such as `.env.local`.

Vite variables prefixed with `VITE_` are included in browser code. Do not put credentials or other secrets in frontend environment variables.

## Commands

```bash
npm run typecheck
npm run lint
npm run build
npm run preview
```

`npm run build` runs the TypeScript project build and then creates the Vite production bundle. This repository does not include frontend-specific automated test scripts.

## Structure

```text
src/
â”œâ”€â”€ api/          Axios client and API modules
â”œâ”€â”€ components/   Shared UI, layout, landing, and feature components
â”œâ”€â”€ hooks/        Data and UI hooks
â”œâ”€â”€ lib/          Formatting and client-side helpers
â”œâ”€â”€ pages/        Route page components
â”œâ”€â”€ routes/       Authentication route guards
â”œâ”€â”€ store/        Zustand state stores
â”œâ”€â”€ types/        API-facing TypeScript types
â”œâ”€â”€ App.tsx       Route table and application setup
â””â”€â”€ main.tsx      React entry point
```

## API behavior

The frontend calls the backend route groups under `/api`: authentication, users, contracts, obligations, reminders, and health. The API client adds a bearer token when present and normalizes API/network errors for the UI. Backend validation remains authoritative; client-side validation is for user experience.

AI-extracted obligations enter the workflow as `potential`. Users can review, confirm, reject, or edit suggestions. The backend controls state transitions such as marking confirmed obligations overdue. Reminder delivery and status are controlled by the backend scheduler.

## Limitations

- The frontend depends on a separately running and configured backend for authenticated and data-backed flows.
- Contract-scoped reminder views may require multiple reminder API requests because the backend reminder list is filtered by obligation, not contract.
- Long lists are paginated by the backend; the frontend does not virtualize list rows.
- No browser-level end-to-end verification is claimed here. Use a configured backend and test account to manually check the upload, review, and reminder flows in a local environment.

## Production deployment

The frontend can be deployed as a static Vite application.

- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm ci`
- Framework preset: Vite

Configure the following environment variable in your hosting provider:

`VITE_API_BASE_URL=https://YOUR-BACKEND-URL/api`

Replace the placeholder with the deployed backend API URL.

The repository includes `vercel.json` to support client-side routing on Vercel.

The frontend requires a separately deployed backend and configured production environment.
