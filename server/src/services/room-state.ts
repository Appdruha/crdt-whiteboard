import * as Y from "yjs";
import type { DemoItemRecord, RoomSnapshotData } from "@crdt-demo/shared";

export class RoomStateStore {
  private readonly docs = new Map<string, Y.Doc>();

  applyUpdate(roomId: string, payloadBase64: string) {
    const doc = this.getDoc(roomId);
    Y.applyUpdate(doc, Buffer.from(payloadBase64, "base64"), "server");
  }

  getSnapshot(roomId: string): RoomSnapshotData {
    const doc = this.getDoc(roomId);
    const zOrder = doc.getArray<string>("zOrder").toJSON() as string[];
    const itemsById = doc.getMap<DemoItemRecord>("itemsById").toJSON() as Record<string, DemoItemRecord>;

    return {
      zOrder,
      itemsById
    };
  }

  getEncodedState(roomId: string) {
    const doc = this.getDoc(roomId);
    return Buffer.from(Y.encodeStateAsUpdate(doc)).toString("base64");
  }

  private getDoc(roomId: string) {
    let doc = this.docs.get(roomId);

    if (!doc) {
      doc = new Y.Doc();
      this.docs.set(roomId, doc);
    }

    return doc;
  }
}
