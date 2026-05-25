import * as Y from "yjs";
import {
  type CreateItemInput,
  type DemoItem,
  type DemoItemRecord,
  type RoomSnapshotData
} from "@crdt-demo/shared";
import { LOCAL_ORIGIN, REMOTE_ORIGIN } from "../core/constants";
import { ItemMutationService } from "./ItemMutationService";

type UpdateListener = (update: Uint8Array, origin: unknown) => void;

export class WhiteboardDocument {
  private readonly document = new Y.Doc();
  private readonly zOrder = this.document.getArray<string>("zOrder");
  private readonly itemsById = this.document.getMap<DemoItem>("itemsById");
  private readonly mutations = new ItemMutationService({
    zOrder: this.zOrder,
    itemsById: this.itemsById
  });

  onUpdate(listener: UpdateListener) {
    this.document.on("update", listener);

    return () => {
      this.document.off("update", listener);
    };
  }

  destroy() {
    this.document.destroy();
  }

  getItem(id: string) {
    return this.itemsById.get(id) ?? null;
  }

  getItemsById() {
    return this.itemsById;
  }

  getOrderedItems() {
    return this.zOrder
      .toArray()
      .map((id) => this.itemsById.get(id))
      .filter((item): item is DemoItemRecord => Boolean(item));
  }

  createItem(input: CreateItemInput): DemoItemRecord {
    let createdItem: DemoItemRecord | null = null;

    // Group all Yjs mutations produced by item creation into one CRDT update.
    this.document.transact(() => {
      createdItem = this.mutations.createItem(input);
    }, LOCAL_ORIGIN);

    if (!createdItem) {
      throw new Error("Item creation failed");
    }

    return createdItem;
  }

  moveItem(id: string, nextX: number, nextY: number): boolean {
    let didMove = false;

    // The mutation may touch the item and its parent relationships, so keep it atomic.
    this.document.transact(() => {
      didMove = this.mutations.moveItem(id, nextX, nextY);
    }, LOCAL_ORIGIN);
    return didMove;
  }

  deleteItem(id: string): string[] {
    let deletedIds: string[] = [];

    // Deletion can rewrite z-order and remove a whole subtree, so emit one Yjs transaction.
    this.document.transact(() => {
      deletedIds = this.mutations.deleteItem(id);
    }, LOCAL_ORIGIN);
    return deletedIds;
  }

  updateItemFill(id: string, fill: string): boolean {
    let didUpdate = false;

    // Keep field edits as a single local document change for observers and sync.
    this.document.transact(() => {
      didUpdate = this.mutations.updateItemFill(id, fill);
    }, LOCAL_ORIGIN);
    return didUpdate;
  }

  updateItemBackgroundImage(id: string, backgroundImage: string | null): boolean {
    let didUpdate = false;

    // Keep field edits as a single local document change for observers and sync.
    this.document.transact(() => {
      didUpdate = this.mutations.updateItemBackgroundImage(id, backgroundImage);
    }, LOCAL_ORIGIN);
    return didUpdate;
  }

  updateItemText(id: string, text: string): boolean {
    let didUpdate = false;

    // Keep field edits as a single local document change for observers and sync.
    this.document.transact(() => {
      didUpdate = this.mutations.updateItemText(id, text);
    }, LOCAL_ORIGIN);
    return didUpdate;
  }

  loadSnapshot(snapshot: RoomSnapshotData) {
    // Snapshot restore rewrites the whole document, so it should be applied atomically.
    this.document.transact(() => {
      this.zOrder.delete(0, this.zOrder.length);
      this.zOrder.push(snapshot.zOrder);

      for (const key of Array.from(this.itemsById.keys())) {
        this.itemsById.delete(key);
      }

      for (const [id, item] of Object.entries(snapshot.itemsById)) {
        this.itemsById.set(id, item);
      }
    }, REMOTE_ORIGIN);
  }

  exportState(): RoomSnapshotData {
    return {
      zOrder: this.zOrder.toJSON() as string[],
      itemsById: this.itemsById.toJSON() as Record<string, DemoItemRecord>
    };
  }

  applyRemoteUpdate(update: Uint8Array) {
    Y.applyUpdate(this.document, update, REMOTE_ORIGIN);
  }
}
