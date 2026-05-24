# Engine Architecture

## Goal

`engine` is an independent whiteboard runtime.

It should:
- own CRDT state
- own Pixi rendering
- own pointer interaction
- own realtime sync

It should not:
- contain React/UI concerns
- contain server persistence concerns
- accumulate unrelated logic inside `WhiteboardEngine`

## Layer Map

```text
engine/src/
  core/
    WhiteboardEngine.ts
    constants.ts
    types.ts

  creation/
    getDefaultCreateBounds.ts

  document/
    WhiteboardDocument.ts
    ItemMutationService.ts

  interaction/
    PointerInteractionController.ts

  rendering/
    PixiSceneController.ts
    ImageAssetStore.ts
    itemRenderers.ts
    viewFactory.ts
    types.ts

  selection/
    SelectionController.ts

  spatial/
    itemCoordinates.ts
    rects.ts

  sync/
    YjsSocketSync.ts

  utils/
    base64.ts
```

## Responsibilities

### `core/`

Only orchestration.

`WhiteboardEngine` wires modules together and exposes the public API:
- `createItem`
- `moveItem`
- `deleteItem`
- `selectItem`
- `setCamera`
- `applyRemoteUpdate`

Rule:
- no domain-heavy logic
- no Pixi asset logic
- no Yjs mutation rules
- no layout heuristics

### `creation/`

Creation-time placement rules.

Examples:
- default width/height
- spawn position for a new item
- placement near selected container

Rule:
- if logic answers "where should a new item appear?", it goes here

### `document/`

CRDT document ownership.

`WhiteboardDocument`:
- owns `Y.Doc`
- owns `zOrder`
- owns `itemsById`
- wraps Yjs transactions
- imports/exports snapshots

`ItemMutationService`:
- applies domain mutations to document state
- create / move / delete / reparent
- updates editable item fields

Rule:
- if logic changes board state, it belongs here
- `WhiteboardDocument` should stay thin
- mutation rules go to services, not directly into the document wrapper

### `interaction/`

Pointer-driven behavior.

Examples:
- drag item
- pan camera
- pointer state machine

Rule:
- if logic depends on pointer down/move/up sequencing, it goes here

### `rendering/`

Pixi runtime and scene projection.

`PixiSceneController`:
- owns Pixi app/stage
- maps items to views
- performs visibility/culling-aware render pass

`ImageAssetStore`:
- loads and caches textures

`itemRenderers`:
- type-specific drawing functions

`viewFactory`:
- stable Pixi container lifecycle

Rule:
- if logic is about how state becomes pixels, it goes here
- rendering should consume item data, not mutate document state

### `selection/`

Selected item state.

Examples:
- current selected id
- selection clear after delete
- selection change notifications

Rule:
- selection should not live in `WhiteboardEngine` fields directly

### `spatial/`

Pure geometry helpers.

Examples:
- world/local coordinates
- parent-relative positioning
- intersection tests
- AABB helpers

Rule:
- keep functions pure
- no side effects
- no Pixi/Yjs lifecycle code

### `sync/`

Network synchronization.

Examples:
- websocket connect/reconnect
- outbound throttling
- merged Yjs update sending
- initial state reload

Rule:
- sync should transport updates
- sync should not know rendering details

### `utils/`

Small generic helpers with no domain ownership.

Rule:
- do not hide real domain logic here

## Dependency Direction

Preferred direction:

```text
core -> creation/document/interaction/rendering/selection/sync/spatial
document -> spatial
interaction -> core types only
rendering -> spatial
sync -> utils/core types
selection -> document-facing getters only
```

Avoid:

```text
rendering -> document mutations
sync -> Pixi
interaction -> Yjs
selection -> Pixi
```

## Rules For New Code

When adding code, ask:

1. Does it change CRDT state?
   Put it in `document/`.

2. Does it decide where new items appear?
   Put it in `creation/`.

3. Does it respond to pointer gestures?
   Put it in `interaction/`.

4. Does it draw or manage Pixi objects?
   Put it in `rendering/`.

5. Does it manage selected item state?
   Put it in `selection/`.

6. Does it send/receive remote updates?
   Put it in `sync/`.

7. Is it pure geometry/math?
   Put it in `spatial/`.

If a function seems to belong to two places, prefer:
- state mutation -> `document/`
- visualization -> `rendering/`
- coordination only -> `core/`

## Extension Examples

### Add a new item type

Touch:
- `shared/src/types/itemDefinitions.ts`
- `engine/src/rendering/itemRenderers.ts`

Maybe touch:
- `creation/` if spawn rules differ
- `document/` if new editable fields need mutation helpers

Do not touch:
- `PointerInteractionController` unless interaction semantics change

### Add resize handles

Touch:
- `interaction/`
- maybe `rendering/` for handle visuals
- `document/` for resize mutations

Do not put resize math directly into `WhiteboardEngine`.

### Add zoom

Touch:
- `interaction/`
- `rendering/`
- maybe `core/` public API

Do not mix zoom math into document mutations.

## Smells

Refactor if you see:
- `WhiteboardEngine` growing large again
- rendering code mutating Yjs state
- document code touching Pixi objects
- pointer handlers containing business rules for item creation
- utility files becoming a dumping ground
- new feature requiring edits across unrelated layers for no good reason

## Current Principle

`WhiteboardEngine` should remain a coordinator, not a bucket.
