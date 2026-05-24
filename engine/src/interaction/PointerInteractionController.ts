import type { FederatedPointerEvent } from "pixi.js";
import type { DemoItemRecord } from "@crdt-demo/shared";
import type { DragState } from "../core/types";

interface Point {
  x: number;
  y: number;
}

interface Camera {
  x: number;
  y: number;
}

interface PointerInteractionControllerOptions {
  getItemById: (id: string) => DemoItemRecord | null;
  getItemWorldPosition: (item: DemoItemRecord) => Point;
  getCamera: () => Camera;
  toStageLocal: (global: FederatedPointerEvent["global"]) => Point;
  onSelectItem: (id: string | null) => void;
  onMoveItem: (id: string, x: number, y: number) => void;
  onCameraChange: (x: number, y: number) => void;
}

export class PointerInteractionController {
  private dragState: DragState | null = null;

  constructor(private readonly options: PointerInteractionControllerOptions) {}

  beginItemDrag(event: FederatedPointerEvent, id: string) {
    event.stopPropagation();
    this.options.onSelectItem(id);

    const item = this.options.getItemById(id);

    if (!item) {
      return;
    }

    const point = this.options.toStageLocal(event.global);
    const worldPosition = this.options.getItemWorldPosition(item);
    this.dragState = {
      type: "item",
      id,
      offsetX: point.x - worldPosition.x,
      offsetY: point.y - worldPosition.y
    };
  }

  handleStagePointerDown(event: FederatedPointerEvent) {
    const camera = this.options.getCamera();
    this.options.onSelectItem(null);
    this.dragState = {
      type: "pan",
      startGlobalX: event.global.x,
      startGlobalY: event.global.y,
      startCameraX: camera.x,
      startCameraY: camera.y
    };
  }

  handlePointerMove(event: FederatedPointerEvent) {
    if (!this.dragState) {
      return;
    }

    if (this.dragState.type === "pan") {
      this.options.onCameraChange(
        this.dragState.startCameraX + (event.global.x - this.dragState.startGlobalX),
        this.dragState.startCameraY + (event.global.y - this.dragState.startGlobalY)
      );
      return;
    }

    const point = this.options.toStageLocal(event.global);
    this.options.onMoveItem(
      this.dragState.id,
      point.x - this.dragState.offsetX,
      point.y - this.dragState.offsetY
    );
  }

  handlePointerUp() {
    this.dragState = null;
  }
}
