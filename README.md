# CRDT Whiteboard Demo

Demo whiteboard/CRDT system built with:
- `PixiJS` for rendering
- `Yjs` for CRDT state
- `React` for UI
- `Express + WebSocket` for backend sync
- `Redis + Postgres + MinIO` for buffering, persistence, and assets

## Packages

### `engine`

Independent whiteboard runtime.

Responsible for:
- CRDT document state
- item create / move / delete
- parent/child attachment
- Pixi rendering
- camera and pointer interaction
- realtime Yjs sync

### `server`

Backend for realtime and persistence.

Responsible for:
- WebSocket connections
- relaying Yjs updates
- buffering events in Redis
- saving event chunks and snapshots to Postgres
- image upload and asset serving through MinIO

### `client`

Thin React UI.

Responsible for:
- toolbar and inspector
- mounting the engine
- calling public engine methods
- editor-side UI state

## Run

Start everything with one command:

```bash
npm run docker:up
```

After startup:
- client: `http://localhost:5173`
- server: `http://localhost:3001`
- MinIO console: `http://localhost:9001`

Stop:

```bash
npm run docker:down
```
