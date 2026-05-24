import type { DemoItemRecord } from "@crdt-demo/shared";

export interface WhiteboardEngineOptions {
  container: HTMLElement;
  roomId: string;
  socketUrl?: string;
  stateUrl?: string;
  onStatusChange?: (status: string) => void;
  onSelectionChange?: (item: DemoItemRecord | null) => void;
}

export type DragState =
  | {
      type: "item";
      id: string;
      offsetX: number;
      offsetY: number;
    }
  | {
      type: "pan";
      startGlobalX: number;
      startGlobalY: number;
      startCameraX: number;
      startCameraY: number;
    };

export interface ServerSocketMessage {
  type?: string;
  payload?: string;
}
