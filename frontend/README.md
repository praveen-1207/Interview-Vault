# InterviewVault frontend

The React + TypeScript single-page application, built with Vite.

## Local development

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

By default, the Vite development server proxies `/api` requests to
`http://localhost:8000`. Start the FastAPI backend separately; setup instructions
are in the repository [README](../README.md).

## Vercel deployment

Import the repository into Vercel and set **Root Directory** to `frontend`.
Vercel detects Vite; use `npm run build` as the build command and `dist` as the
output directory. Add this project environment variable, pointing to your
deployed API:

```text
VITE_API_URL=https://your-api.example.com/api/v1
```

The `vercel.json` rewrite supports direct navigation and refreshes on client-side
routes. Deploy the FastAPI backend separately and configure its `ALLOWED_ORIGINS`
to include the Vercel production URL.

## Checks

```powershell
npm run lint
npm run build
```
