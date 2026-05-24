import * as Y from "yjs";
import {
  canAcceptChildren,
  createDemoItem,
  supportsBackgroundImage,
  supportsFill,
  supportsText,
  type CreateItemInput,
  type DemoItem,
  type DemoItemRecord
} from "@crdt-demo/shared";
import { getParentId, normalizeChildPlacement } from "../spatial/itemCoordinates";

interface MutationContext {
  zOrder: Y.Array<string>;
  itemsById: Y.Map<DemoItem>;
}

export class ItemMutationService {
  constructor(private readonly context: MutationContext) {}

  createItem(input: CreateItemInput): DemoItemRecord {
    const item = createDemoItem(input);
    const normalizedItem = normalizeChildPlacement(
      item,
      item.x,
      item.y,
      this.getReverseOrderedIds(),
      this.context.itemsById
    );

    this.context.itemsById.set(normalizedItem.id, normalizedItem);
    this.syncParentRelationship(normalizedItem.id, null, getParentId(normalizedItem));
    this.context.zOrder.push([normalizedItem.id]);

    return normalizedItem;
  }

  moveItem(id: string, nextX: number, nextY: number): boolean {
    const item = this.context.itemsById.get(id);

    if (!item) {
      return false;
    }

    if (canAcceptChildren(item)) {
      this.context.itemsById.set(id, {
        ...item,
        x: nextX,
        y: nextY
      });

      return true;
    }

    const movedItem = normalizeChildPlacement(
      item,
      nextX,
      nextY,
      this.getReverseOrderedIds(),
      this.context.itemsById
    );

    this.context.itemsById.set(id, movedItem);
    this.syncParentRelationship(id, item.parentId, movedItem.parentId ?? null);

    return true;
  }

  deleteItem(id: string): string[] {
    const item = this.context.itemsById.get(id);

    if (!item) {
      return [];
    }

    const idsToDelete = this.collectIdsForDeletion(item);
    const currentOrder = this.context.zOrder
      .toArray()
      .filter((itemId: string) => !idsToDelete.includes(itemId));
    this.context.zOrder.delete(0, this.context.zOrder.length);
    this.context.zOrder.push(currentOrder);

    for (const deleteId of idsToDelete) {
      const candidate = this.context.itemsById.get(deleteId);

      if (candidate?.parentId) {
        this.syncParentRelationship(deleteId, candidate.parentId, null);
      }

      this.context.itemsById.delete(deleteId);
    }

    return idsToDelete;
  }

  updateItemFill(id: string, fill: string): boolean {
    const item = this.context.itemsById.get(id);

    if (!item || !supportsFill(item)) {
      return false;
    }

    this.context.itemsById.set(id, {
      ...item,
      fill
    });

    return true;
  }

  updateItemBackgroundImage(id: string, backgroundImage: string | null): boolean {
    const item = this.context.itemsById.get(id);

    if (!item || !supportsBackgroundImage(item)) {
      return false;
    }

    this.context.itemsById.set(id, {
      ...item,
      backgroundImage
    });

    return true;
  }

  updateItemText(id: string, text: string): boolean {
    const item = this.context.itemsById.get(id);

    if (!item || !supportsText(item) || item.text === text) {
      return false;
    }

    this.context.itemsById.set(id, {
      ...item,
      text
    });

    return true;
  }

  private getReverseOrderedIds() {
    return this.context.zOrder.toArray().slice().reverse();
  }

  private syncParentRelationship(
    itemId: string,
    previousParentId: string | null,
    nextParentId: string | null
  ) {
    if (previousParentId && previousParentId !== nextParentId) {
      const previousParent = this.context.itemsById.get(previousParentId);

      if (previousParent && canAcceptChildren(previousParent)) {
        this.context.itemsById.set(previousParentId, {
          ...previousParent,
          childIds: previousParent.childIds.filter((childId) => childId !== itemId)
        });
      }
    }

    if (nextParentId) {
      const nextParent = this.context.itemsById.get(nextParentId);

      if (nextParent && canAcceptChildren(nextParent) && !nextParent.childIds.includes(itemId)) {
        this.context.itemsById.set(nextParentId, {
          ...nextParent,
          childIds: [...nextParent.childIds, itemId]
        });
      }
    }
  }

  private collectIdsForDeletion(item: DemoItemRecord): string[] {
    if (item.childIds.length === 0) {
      return [item.id];
    }

    return [
      item.id,
      ...item.childIds.flatMap((childId: string) => {
        const child = this.context.itemsById.get(childId);
        return child ? this.collectIdsForDeletion(child) : [childId];
      })
    ];
  }
}
