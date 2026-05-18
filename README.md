# SpellTable

A lightweight browser-based webcam card game platform for playing Magic: The Gathering with friends — no accounts, no card recognition, just share a link and play.

## Running locally

```bash
npm install
npm run dev
```

Vite runs on `http://localhost:5173`, signaling server on `http://localhost:3001`.

## How to play

1. Open the app and enter your name
2. Click **Create Room** — your URL changes to include a room ID
3. Copy and share that URL with your friends
4. Everyone enters their name and joins
5. Webcams connect automatically peer-to-peer

## Features

- **Webcam streaming** — low-latency peer-to-peer video via WebRTC, no server relay
- **Card search** — resizable right sidebar powered by the Scryfall API; search any Magic card by name
- **Card pins** — drag a card from the sidebar onto the board; hover the chip to read its details; grab the `⠿` handle to reposition it
- **Deck loading** — paste an Archidekt URL to load your deck; card search scopes to lobby decks instantly with no API calls; auto-sets your commander
- **Life tracking** — click your life total to edit it directly; use +1 / -1 / +5 / -5 buttons; syncs to all players in real time
- **Commander damage** — track damage from each opponent's commander separately; highlights at 21 (elimination threshold)
- **Shareable rooms** — room lives in the URL; no sign-up required

## Deploying

Set `NODE_ENV=production`, build with `npm run build`, and start with `node server/index.js`. The server serves the built frontend as static files.

Recommended hosts: Railway (easiest), Fly.io, or any VPS with Node.
