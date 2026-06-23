# Podcast Proposal Generator

A React/Vite app for creating personalized Agentic Engineering podcast proposal pages.

## What it does

- Upload a guest LinkedIn PDF and photo.
- Extract PDF text in the browser.
- Generate a personalized proposal through a backend DeepSeek route.
- Review and edit the generated proposal copy.
- Persist guests and proposal copy in Supabase.
- Protect the dashboard with a single private login.
- Track guests in a five-stage Kanban pipeline:
  - Reach Out
  - Contacted
  - In Process
  - Booked
  - Done
- Share a public proposal URL such as `/proposal/anuj-kumar`.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173/`.

For local API routes that match Vercel, run with Vercel dev instead:

```bash
vercel dev
```

## Setup

1. Run `supabase/schema.sql` in the Supabase SQL editor.
2. Add the variables from `.env.example` to Vercel.
3. Rotate the DeepSeek key and use the new value for `DEEPSEEK_API_KEY`.

The app dashboard at `/`, `/edit`, and `/pipeline` requires the configured admin login. Public proposal URLs such as `/proposal/anuj-kumar` remain view-only and do not require sign-in.

## SEO and Link Previews

The app sets route-aware titles, descriptions, canonical URLs, Open Graph tags, Twitter card tags, and JSON-LD in the browser. The Agentic Engineering logo is used as the favicon and default social preview image.
# invite_agentic_engineering
