# AI Dixit — TODOS

## Phase 1: Core Game (current)

_No deferred items — Phase 1 scope is fully defined in the plan._

---

## Phase 1.5: Quick Wins (post-launch)

### P1 — Private Rooms with Share Codes
**What:** Option to create a private room with a 4-letter code (e.g., "FROG") that friends join directly.
**Why:** Public auto-matching is great for strangers, but friend groups want to play together. "Join my game: FROG" is the viral hook — every shared code is free word-of-mouth marketing.
**Effort:** S (~4 hours)
**Depends on:** Core room system working.

### P1 — Voice Input (Speech-to-Text)
**What:** Add AudioTranscriber using Google Cloud STT so players can dictate prompts instead of typing.
**Why:** Deferred from Phase 1 (eng review decision 2A) but part of the original vision. Some players (especially mobile) prefer voice over typing under time pressure.
**Effort:** M (~1 day: browser MediaRecorder + upload + Google STT API + error handling + text fallback)
**Depends on:** Core drawing phase working. Adds Google Cloud STT API dependency.

### P2 — Card Flip Animation
**What:** During reveal phase, cards are face-down on a virtual table and dramatically flip over one by one with a satisfying animation + subtle sound effect.
**Why:** The reveal is the emotional peak of every round — the moment of discovery. A flat "here are the cards" kills the magic. This transforms the experience from "web app" to "game."
**Effort:** S (~2-3 hours, CSS/Framer Motion)
**Depends on:** Reveal phase UI.

### P2 — "Card of the Round" Highlight
**What:** After scoring, highlight the card that received the most votes with a golden glow + "Most Convincing Card" badge.
**Why:** Social recognition drives engagement — players will try harder to create beautiful/clever cards.
**Effort:** S (~30 min)
**Depends on:** Scoring system.

---

## Phase 2: Engagement & Polish

### P1 — Redis + Socket.IO Redis Adapter (Horizontal Scaling)
**What:** Replace in-memory state with Redis. Add Socket.IO Redis adapter for multi-instance WebSocket support.
**Why:** v1 is single-process (eng review decision 4A). Any traffic growth beyond one Fly.io instance requires Redis for shared state and session persistence. Trigger: when single instance can't handle the load.
**Effort:** M (~1 day: Redis setup on Upstash, session store migration, Socket.IO adapter config)
**Depends on:** Traffic growth requiring >1 instance. ~$5/mo for Upstash.

### P2 — Art Style Selector
**What:** Before each round, storyteller picks an art style (watercolor, pixel art, oil painting, anime, etc.) that applies to ALL players' generations via prompt prefix.
**Why:** Adds variety and strategy — some associations work better in certain styles. Huge replayability boost.
**Effort:** S (~2-3 hours)
**Depends on:** Association phase UI.

### P2 — Prompt Remix / Regenerate
**What:** During the 60-sec drawing phase, player sees their first generation and can refine the prompt to regenerate (max 2 attempts per round).
**Why:** One-shot prompting often misses the mark. Letting players iterate makes the creative process more satisfying and produces better cards.
**Effort:** M (~6 hours including UI)
**Depends on:** Drawing phase UI, cost monitoring (doubles API cost per round).

### P2 — Emoji Reactions During Reveal
**What:** During the reveal phase, players can send floating emoji reactions (🔥😂😍👏) that appear over the cards in real-time for all players.
**Why:** The reveal is the social moment — reactions make it feel alive and multiplayer. Like Twitch emotes.
**Effort:** S-M (~2-3 hours, WebSocket broadcast + CSS animation)
**Depends on:** Reveal phase, WebSocket infrastructure.

### P2 — Fallback AI Provider (DALL-E 3)
**What:** ImageGenerator interface with Imagen primary + DALL-E 3 fallback. Auto-switches when Imagen returns errors.
**Why:** Single AI provider = single point of failure for the core game mechanic. When Vertex AI has an outage, the game is completely broken.
**Effort:** M (~1 day)
**Depends on:** ImageGenerator class (extract interface at this point).

### P2 — Inspiration Hint System
**What:** If after 15 seconds no player has submitted a prompt, show a subtle AI-generated "inspiration hint" — a vague visual motif related to the association word (abstract shapes/colors, not a full card).
**Why:** Blank-page paralysis is real. Some players freeze when they need to type a creative prompt under time pressure. A gentle nudge keeps the game flowing.
**Effort:** S (~1 hour)
**Depends on:** Drawing phase, extra Imagen API call budget.

---

## Phase 3: Platform & Growth

### P3 — Event Sourcing / Game Replay
**What:** Store every game event (association, card generated, vote, score) as an append-only log. Enable full game replays and spectator mode.
**Why:** Unlocks spectator mode, replays for fun/learning, better debugging, and rich analytics.
**Effort:** L
**Depends on:** PostgreSQL database (Phase 2 infra).

### P3 — Player Profiles + OAuth
**What:** Google/social OAuth login. Persistent profiles with stats, play history, favorite cards.
**Why:** Identity enables leaderboards, friend lists, and long-term engagement.
**Effort:** M-L
**Depends on:** PostgreSQL database.

### P3 — Card Gallery
**What:** Browse all generated cards across all games. Filter by association word, art style, most-voted.
**Why:** User-generated AI art is the unique asset. A gallery makes it discoverable and shareable.
**Effort:** M
**Depends on:** PostgreSQL, Cloud Storage persistence.

### P3 — Leaderboards
**What:** Global and weekly leaderboards. Top storytellers, most convincing cards, highest scores.
**Why:** Competition drives retention.
**Effort:** M
**Depends on:** Player profiles, PostgreSQL.

### P3 — Multiple Game Modes
**What:** Speed round (30s draw), team mode, themed rounds (all associations must be emotions/movies/etc.).
**Why:** Variety prevents staleness. Different modes appeal to different player types.
**Effort:** L
**Depends on:** Stable core game engine.
