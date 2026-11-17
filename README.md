# CRM Accounts — Frontend

React + Vite SPA for the CRM Accounts app (invoicing, expenses, delivery orders, accounting/ledger, reports).

**Live preview:** https://anonymouscoder-047.github.io/crm-account-ui/

**Backend API:** https://crm-accounts-server-five.vercel.app/api

## Demo credentials

| Role    | Email                      | Password  |
| ------- | -------------------------- | --------- |
| Admin   | ahmed.mansoori@crm.com     | `Demo@123` |
| Manager | fatima.zaabi@crm.com       | `Demo@123` |
| User    | mohammed.shamsi@crm.com    | `Demo@123` |

## Tech stack

- React 19, TypeScript, Vite
- Tailwind CSS + Ant Design + Radix UI
- React Router, TanStack Query, Axios
- Recharts, jsPDF, pptxgenjs, xlsx

## Getting started

```bash
npm install
npm run dev      # dev server on http://localhost:3000 (proxies /api → localhost:5000)
npm run build    # production build → outputs to ./build (not dist)
npm run preview  # preview the production build locally
```

## Environment variables

Copy `env.sample` to `.env`:

| Variable            | Purpose                                                            |
| ------------------- | ------------------------------------------------------------------ |
| `VITE_API_BASE_URL` | Backend API base, e.g. `https://crm-accounts-server-five.vercel.app/api`. Defaults to `/api` (dev proxy). |
| `VITE_BASE_PATH`    | Base path when hosted under a subpath (GitHub Pages: `/<repo>/`).  |
| `VITE_API_PORT`     | Backend port for LAN/IP access fallback (default `5000`).          |

## Deployment

Deployed to **GitHub Pages** via `.github/workflows/deploy-frontend.yml` on every push to `master`:

- Builds with `VITE_BASE_PATH=/<repo-name>/` and `VITE_API_BASE_URL` (set in repo → Settings → Secrets and variables → Actions → **Variables**).
- Copies `index.html` → `404.html` so React Router client-side routes work on Pages.

The backend is an Express + MongoDB API deployed separately on Vercel.
