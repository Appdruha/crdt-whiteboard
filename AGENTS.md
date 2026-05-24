# AGENTS.md

## Read This First

If you are an agent working in this repository, read documents in this order:

1. `AGENTS.md`
2. `ROADMAP.md`
3. package-specific architecture docs when working inside that package

Current package-specific docs:
- engine: `engine/ARCHITECTURE.md`

## Project Goal

This repository is a demo CRDT whiteboard system with:
- `client` - React UI
- `engine` - independent PixiJS + Yjs runtime
- `server` - Express + WebSocket backend
- `shared` - common types and protocol

The focus is the engine architecture, synchronization, rendering, and persistence flow. This is a demo, not a production-hardened app.

## Core Rules

- Keep the engine independent from React/UI.
- UI should call engine methods, not manipulate canvas state directly.
- Prefer adding new behavior to the correct layer instead of growing coordinator files.
- Avoid putting unrelated logic back into `WhiteboardEngine`.
- Prefer declarative registries over `if (item.type === "...")`.
- Any new item type should be added through shared definitions first.

## Source Of Truth By Area

### Shared item model

Use:
- `shared/src/types/items.ts`
- `shared/src/types/itemDefinitions.ts`

This is the source of truth for:
- item types
- item capabilities
- item creation defaults
- toolbar labels
- inspector field schema

### Engine architecture

Use:
- `engine/ARCHITECTURE.md`

Do not add engine logic before checking that file.

### Product decisions

Use:
- `ROADMAP.md`

This contains the agreed demo scope and key behavior decisions.

## Where To Put Code

### `client/`

Use for:
- React composition
- hooks for session/editor UI state
- inspector/toolbar components

Do not put:
- Pixi logic
- CRDT mutation rules
- canvas hit testing

### `engine/`

Use for:
- CRDT document logic
- item mutations
- selection
- pointer interaction
- rendering
- camera
- realtime sync

Before editing engine code, read:
- `engine/ARCHITECTURE.md`

### `server/`

Use for:
- websocket handling
- Redis buffering
- Postgres chunk/snapshot persistence
- MinIO upload and asset serving

### `shared/`

Use for:
- item types
- item definitions
- protocol messages
- data contracts shared across client/server/engine

## Item System Rules

- New item types must be introduced through `shared/src/types/itemDefinitions.ts`.
- Do not hardcode item behavior in UI components.
- Do not add `if (item.type === "...")` branches in engine coordinators.
- Prefer registry-based rendering and schema-driven UI.
- Container behavior should be capability-driven, not type-special-cased.

## Engine Rules

- `core/` is orchestration only.
- `document/` owns CRDT state and mutations.
- `rendering/` turns state into Pixi views.
- `interaction/` owns pointer gesture behavior.
- `selection/` owns selected item state.
- `sync/` owns websocket/reconnect/throttle/update transport.
- `creation/` owns spawn/default placement rules.
- `spatial/` owns pure geometry helpers.

If you are touching engine code, keep dependency direction aligned with:
- `engine/ARCHITECTURE.md`

## Verification

Before finishing meaningful code changes, run what is relevant:

```bash
npm --workspace @crdt-demo/shared run build
npm --workspace @crdt-demo/engine run build
npm run typecheck:client
```

If server code changed, also run:

```bash
npm --workspace server run build
```

## Current Important Decisions

- single `demo-room`
- no auth/encryption
- camera supports `pan`, not `zoom`
- children are not clipped by frame bounds
- if an item intersects a container frame, it becomes attached
- attached children move with the parent
- images are stored through MinIO
- sync is based on Yjs binary updates

## Anti-Patterns

Avoid:
- growing a single large engine file again
- mixing React state concerns into engine runtime
- putting Pixi behavior into document logic
- putting Yjs mutation logic into rendering code
- bypassing shared item definitions
- adding new features by patching multiple unrelated files without a clear layer owner

## If Unsure

When unsure where code belongs:
- check `engine/ARCHITECTURE.md` for engine work
- check `shared/src/types/itemDefinitions.ts` for item behavior/schema
- prefer a small new module over expanding a coordinator file
