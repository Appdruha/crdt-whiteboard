import { canAcceptChildren, type DemoItemRecord } from "@crdt-demo/shared";
import { rectsIntersect } from "./rects";

export function getParentId(item: DemoItemRecord) {
  return item.parentId;
}

export function getWorldPosition(
  item: DemoItemRecord,
  itemsById: Map<string, DemoItemRecord> | { get(id: string): DemoItemRecord | undefined }
) {
  if (!item.parentId) {
    return {
      x: item.x,
      y: item.y
    };
  }

  const parent = itemsById.get(item.parentId);

  if (!parent || !canAcceptChildren(parent)) {
    return {
      x: item.x,
      y: item.y
    };
  }

  return {
    x: parent.x + item.x,
    y: parent.y + item.y
  };
}

export function getWorldRect(
  item: DemoItemRecord,
  itemsById: Map<string, DemoItemRecord> | { get(id: string): DemoItemRecord | undefined }
) {
  const worldPosition = getWorldPosition(item, itemsById);

  return {
    x: worldPosition.x,
    y: worldPosition.y,
    width: item.width,
    height: item.height
  };
}

export function findIntersectingContainer(
  worldX: number,
  worldY: number,
  width: number,
  height: number,
  itemId: string | undefined,
  orderedIds: string[],
  itemsById: Map<string, DemoItemRecord> | { get(id: string): DemoItemRecord | undefined }
) {
  for (const id of orderedIds) {
    const candidate = itemsById.get(id);

    if (!candidate || !canAcceptChildren(candidate) || candidate.id === itemId) {
      continue;
    }

    if (
      rectsIntersect(
        candidate.x,
        candidate.y,
        candidate.width,
        candidate.height,
        worldX,
        worldY,
        width,
        height
      )
    ) {
      return candidate;
    }
  }

  return null;
}

export function normalizeChildPlacement<T extends DemoItemRecord>(
  item: T,
  worldX: number,
  worldY: number,
  orderedIds: string[],
  itemsById: Map<string, DemoItemRecord> | { get(id: string): DemoItemRecord | undefined }
): T {
  if (canAcceptChildren(item)) {
    return {
      ...item,
      x: worldX,
      y: worldY
    };
  }

  const targetContainer = findIntersectingContainer(
    worldX,
    worldY,
    item.width,
    item.height,
    item.id,
    orderedIds,
    itemsById
  );

  if (!targetContainer) {
    return {
      ...item,
      x: worldX,
      y: worldY,
      parentId: null
    };
  }

  return {
    ...item,
    x: worldX - targetContainer.x,
    y: worldY - targetContainer.y,
    parentId: targetContainer.id
  };
}
