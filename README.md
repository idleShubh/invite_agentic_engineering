# Podcast Proposal Generator

A first-pass React/Vite app for creating personalized Agentic Engineering podcast proposal pages.

## What it does

- Upload a guest LinkedIn PDF and photo.
- Extract PDF text in the browser.
- Generate a personalized proposal with the DeepSeek API.
- Review and edit the generated proposal copy.
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

## Notes

This MVP stores guests in browser `localStorage` so it is immediately usable without backend setup. The next production step is moving guests, files, and proposal content to Supabase, and moving the DeepSeek API call into a server-side route so the API key is never exposed in the browser.

## SEO and Link Previews

The app sets route-aware titles, descriptions, canonical URLs, Open Graph tags, Twitter card tags, and JSON-LD in the browser. The Agentic Engineering logo is used as the favicon and default social preview image.

For true personalized WhatsApp and LinkedIn previews on `/proposal/:slug`, the proposal content and guest image must be available to the server at request time. Social crawlers generally do not read browser `localStorage`, so they cannot see guest-specific local-only data. The production version should store proposals and uploaded guest photos in Supabase, then render proposal metadata server-side or through an edge function before the crawler receives the HTML.
# invite_agentic_engineering
