# SpellTable Clone

A lightweight browser-based webcam card game platform for playing Magic: The Gathering with friends online — no automatic card recognition required.

## Goal

Build a simple, self-hosted alternative to SpellTable where:

- Players connect via a shared URL and stream webcams to each other in real time
- A resizable right-side panel lets players search for Magic card details manually
- Cards found in the search panel can be dragged to the left play area for quick hover-to-read reference
- No computer vision or automatic card detection — everything is manual and lightweight

## Core Features

- **Webcam streaming** — multiple players connect to a shared room URL and see each other's cameras
- **Card search panel** — resizable/collapsible right sidebar with a search bar that pulls card details (name, image, oracle text) from an API
- **Drag-to-reference** — drag a card from the search panel onto the play area; hover it to read its details
- **Life tracking** — each player has a life total tracker (default 40 for Commander)
- **Commander damage tracking** — track damage dealt from each opponent's commander separately per player
- **Minimal setup** — shareable URL, no accounts required
