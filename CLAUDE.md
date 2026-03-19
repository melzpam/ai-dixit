# AI Dixit

AI-powered multiplayer card game inspired by Dixit/Imaginarium.
Players join rooms, a storyteller gives an association word, everyone generates AI art cards via prompts, then players guess which card the storyteller made.

## Stack
- **Backend:** Node.js + TypeScript + Socket.IO + Express
- **Frontend:** Next.js + React + Tailwind CSS
- **AI:** Google Vertex AI Imagen (image generation)
- **State:** In-memory (single process, v1)
- **Hosting:** Fly.io
- **Images:** JPEG base64 via WebSocket (no external storage for v1)
- **Tests:** Vitest (unit/integration) + Playwright (E2E)
- **Monorepo:** pnpm workspaces

## Architecture

```
ai-dixit/
├── packages/
│   ├── shared/                # Shared types + logic (imported by server & web)
│   │   └── src/
│   │       ├── events.ts      # Typed WebSocket event definitions
│   │       ├── types.ts       # GamePhase, PlayerState, Card, Vote
│   │       └── scoring.ts     # Dixit scoring rules (pure functions)
│   ├── server/                # Node.js + Socket.IO backend
│   │   └── src/
│   │       ├── server.ts      # Entry: Express + Socket.IO setup
│   │       ├── config.ts      # Env vars, constants, Vertex AI config
│   │       ├── GameManager.ts # Lobby: routes players to GameEngine instances
│   │       ├── GameEngine.ts  # Room + game state machine + player management
│   │       ├── ImageGenerator.ts  # Imagen API wrapper, retry, text-card fallback
│   │       ├── SocketHandler.ts   # WebSocket event routing, connection lifecycle
│   │       └── rateLimiter.ts     # Rate limiting + input sanitization
│   └── web/                   # Next.js frontend
│       └── src/
│           ├── app/           # Next.js app router pages
│           ├── components/    # React components
│           └── hooks/         # Custom hooks (useSocket, useGame, useTimer)
├── pnpm-workspace.yaml
└── package.json
```

## Game State Machine

```
WAITING (< 2 players)
    │ player_count >= 2
    ▼
ASSOCIATION (storyteller types word, 30s)
    │ submitted
    ▼
DRAWING (all generate AI cards, 60s)
    │ all_ready OR timer
    ▼
VOTING (guess storyteller's card, 15s)
    │ all_voted OR timer
    ▼
REVEAL (show who drew what + scores, 10s)
    │ next_storyteller
    └──▶ ASSOCIATION
```

## Dixit Scoring Rules
- **Some guess right:** Storyteller 3pts, correct guessers 3pts each
- **ALL guess right (too easy):** Storyteller 0pts, everyone else 2pts
- **NONE guess right (too hard):** Storyteller 0pts, everyone else 2pts
- **Bonus (always):** +1pt per vote your card received (non-storytellers)

## Key Design Decisions
- **Auth:** Nickname + session cookie (no OAuth for v1)
- **AI failure:** Text-only card showing player's prompt (after 2 retries)
- **Mid-game join:** Onboarding overlay, spectate current round, play next round
- **Storyteller disconnect:** Auto-pass to next player after 10s
- **Server restart:** Games are lost (acceptable for v1)
- **Cost control:** Hard daily cap $50/day on Vertex AI + alerting
- **Timers:** Server-authoritative only, never trust client
- **Images:** JPEG base64 at quality 80, 512x512 — sent via WebSocket
- **State:** In-memory only (no Redis for v1 — add when scaling to multi-instance)
- **Orchestration:** GameEngine owns both room state and game state (no separate RoomManager)
- **Concurrency:** p-limit(5) on Imagen API calls to stay within rate limits

## Development Rules
- `scoring.ts` lives in `packages/shared/` — pure functions, no side effects, shared by server and client
- All WebSocket events typed in `packages/shared/events.ts` — single source of truth
- All user input (nickname, association, prompt) sanitized in `rateLimiter.ts`
- ImageGenerator is a concrete class (no interface) — extract interface when adding 2nd provider
- Never trust client timers — server owns all deadlines
- Rate limit: 1 image generation per round per player, max 10 rounds/hr per IP
- Image gen rate limiting is game logic (in GameEngine), not middleware
- GameEngine: one class with strict internal regions (Room ops / Phase transitions / Timers / Scoring)
- Inline ASCII state machine diagram as code comment in GameEngine.ts header
- All timer tests use Vitest fake timers — no real setTimeout in tests
- ImageGenerator tests mock Vertex AI SDK — never hit real API
