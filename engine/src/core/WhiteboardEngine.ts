import type { FederatedPointerEvent } from "pixi.js";
import {
  type CreateItemInput,
  type RoomSnapshotData
} from "@crdt-demo/shared";
import { WhiteboardDocument } from "../document/WhiteboardDocument";
import { PointerInteractionController } from "../interaction/PointerInteractionController";
import { PixiSceneController } from "../rendering/PixiSceneController";
import { SelectionController } from "../selection/SelectionController";
import { YjsSocketSync } from "../sync/YjsSocketSync";
import { decodeBase64 } from "../utils/base64";
import { REMOTE_ORIGIN } from "./constants";
import type { WhiteboardEngineOptions } from "./types";

export class WhiteboardEngine {
  private readonly document = new WhiteboardDocument();
  private readonly scene: PixiSceneController;
  private readonly sync: YjsSocketSync;
  private readonly pointerInteraction: PointerInteractionController;
  private readonly selection: SelectionController;

  constructor(options: WhiteboardEngineOptions) {
    this.scene = new PixiSceneController(options.container, () => {
      this.render();
    });
    this.selection = new SelectionController({
      getItemById: (id) => this.document.getItem(id),
      onSelectionChange: options.onSelectionChange
    });
    this.sync = new YjsSocketSync({
      roomId: options.roomId,
      socketUrl: options.socketUrl,
      stateUrl: options.stateUrl,
      onStatusChange: options.onStatusChange,
      onRemoteUpdate: (update) => {
        this.document.applyRemoteUpdate(update);
      }
    });
    this.pointerInteraction = new PointerInteractionController({
      getItemById: (id) => this.document.getItem(id),
      getItemWorldPosition: (item) => this.scene.getItemWorldPosition(item, this.document.getItemsById()),
      getCamera: () => this.scene.getCamera(),
      toStageLocal: (global) => this.scene.toStageLocal(global),
      onSelectItem: (id) => this.selectItem(id),
      onMoveItem: (id, x, y) => this.moveItem(id, x, y),
      onCameraChange: (x, y) => this.setCamera(x, y)
    });
  }

  async mount(initialStateBase64?: string) {
    await this.scene.mount({
      onItemPointerDown: (event, id) => this.beginItemDrag(event, id),
      onStagePointerDown: (event) => this.pointerInteraction.handleStagePointerDown(event),
      onPointerMove: (event) => this.pointerInteraction.handlePointerMove(event),
      onPointerUp: () => this.pointerInteraction.handlePointerUp()
    });

    this.document.onUpdate((update, origin) => {
      this.render();

      if (origin !== REMOTE_ORIGIN) {
        this.sync.queueUpdate(update);
      }
    });

    if (initialStateBase64) {
      this.applyRemoteUpdate(decodeBase64(initialStateBase64));
    }

    this.render();
    this.sync.connect();
  }

  createItem(input: CreateItemInput) {
    const item = this.document.createItem(input);
    this.selection.setSelectedItemId(item.id);
    this.render();
    this.selection.emitSelectionChange();
    return item;
  }

  moveItem(id: string, x: number, y: number) {
    this.document.moveItem(id, x, y);
  }

  deleteItem(id: string) {
    const deletedIds = this.document.deleteItem(id);
    this.selection.clearIfDeleted(deletedIds);
    this.render();
    this.selection.emitSelectionChange();
  }

  deleteSelectedItem() {
    const selectedItemId = this.selection.getSelectedItemId();

    if (selectedItemId) {
      this.deleteItem(selectedItemId);
    }
  }

  selectItem(id: string | null) {
    this.selection.setSelectedItemId(id);
    this.render();
    this.selection.emitSelectionChange();
  }

  getSelectedItem() {
    return this.selection.getSelectedItem();
  }

  getItem(id: string) {
    return this.document.getItem(id);
  }

  getItems() {
    return this.document.getOrderedItems();
  }

  setCamera(x: number, y: number) {
    this.scene.setCamera(x, y);
    this.render();
  }

  resizeViewport() {
    this.render();
  }

  loadSnapshot(snapshot: RoomSnapshotData) {
    this.document.loadSnapshot(snapshot);
  }

  exportState(): RoomSnapshotData {
    return this.document.exportState();
  }

  applyRemoteUpdate(update: Uint8Array) {
    this.document.applyRemoteUpdate(update);
  }

  updateSelectedFill(fill: string) {
    const selectedItemId = this.selection.getSelectedItemId();

    if (!selectedItemId) {
      return;
    }

    this.document.updateItemFill(selectedItemId, fill);
  }

  updateSelectedBackgroundImage(backgroundImage: string | null) {
    const selectedItemId = this.selection.getSelectedItemId();

    if (!selectedItemId) {
      return;
    }

    this.document.updateItemBackgroundImage(selectedItemId, backgroundImage);
  }

  updateSelectedText(text: string) {
    const selectedItemId = this.selection.getSelectedItemId();

    if (!selectedItemId) {
      return;
    }

    this.document.updateItemText(selectedItemId, text);
  }

  destroy() {
    this.sync.destroy();
    this.scene.destroy();
    this.document.destroy();
  }

  private render() {
    this.scene.render(
      this.document.getOrderedItems(),
      this.document.getItemsById(),
      this.selection.getSelectedItemId(),
      (event, id) => this.beginItemDrag(event, id)
    );
    this.selection.emitSelectionChange();
  }

  private beginItemDrag(event: FederatedPointerEvent, id: string) {
    this.pointerInteraction.beginItemDrag(event, id);
  }
}
