import * as Y from "yjs";
import { type RoomStateResponse } from "@crdt-demo/shared";
import { UPDATE_THROTTLE_MS } from "../core/constants";
import type { ServerSocketMessage } from "../core/types";
import { decodeBase64, encodeBase64 } from "../utils/base64";

interface YjsSocketSyncOptions {
  roomId: string;
  socketUrl?: string;
  stateUrl?: string;
  onStatusChange?: (status: string) => void;
  onRemoteUpdate: (update: Uint8Array) => void;
}

export class YjsSocketSync {
  private socket: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private outboundFlushTimer: number | null = null;
  private lastOutboundFlushAt = 0;
  private isDestroyed = false;
  private readonly pendingOutboundUpdates: Uint8Array[] = [];

  constructor(private readonly options: YjsSocketSyncOptions) {}

  connect() {
    if (!this.options.socketUrl) {
      this.options.onStatusChange?.("Offline mode");
      return;
    }

    this.options.onStatusChange?.("Connecting to server...");

    this.socket = new WebSocket(this.options.socketUrl);
    this.socket.addEventListener("open", () => {
      this.options.onStatusChange?.("Connected to demo-room");
      void this.reloadStateFromServer().finally(() => {
        this.flushPendingUpdates();
      });
    });

    this.socket.addEventListener("close", () => {
      this.options.onStatusChange?.("Disconnected from server");
      this.scheduleReconnect();
    });

    this.socket.addEventListener("error", () => {
      this.options.onStatusChange?.("Socket error, retrying...");
    });

    this.socket.addEventListener("message", (event) => {
      const payload = JSON.parse(String(event.data)) as ServerSocketMessage;

      if (payload.type !== "document.update" || !payload.payload) {
        return;
      }

      this.options.onRemoteUpdate(decodeBase64(payload.payload));
    });
  }

  queueUpdate(update: Uint8Array) {
    this.pendingOutboundUpdates.push(update);
    this.scheduleOutboundFlush();
  }

  destroy() {
    this.isDestroyed = true;

    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.outboundFlushTimer !== null) {
      window.clearTimeout(this.outboundFlushTimer);
      this.outboundFlushTimer = null;
    }

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  private flushPendingUpdates() {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN || this.pendingOutboundUpdates.length === 0) {
      return;
    }

    const mergedUpdate = Y.mergeUpdates(this.pendingOutboundUpdates);
    this.pendingOutboundUpdates.length = 0;
    this.lastOutboundFlushAt = Date.now();
    this.socket.send(
      JSON.stringify({
        type: "document.update",
        roomId: this.options.roomId,
        payload: encodeBase64(mergedUpdate)
      })
    );
  }

  private scheduleReconnect() {
    if (this.isDestroyed || this.reconnectTimer !== null || !this.options.socketUrl) {
      return;
    }

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 1000);
  }

  private async reloadStateFromServer() {
    if (!this.options.stateUrl) {
      return;
    }

    try {
      const response = await fetch(this.options.stateUrl);

      if (!response.ok) {
        return;
      }

      const state = (await response.json()) as RoomStateResponse;

      if (state.yjsStateBase64) {
        this.options.onRemoteUpdate(decodeBase64(state.yjsStateBase64));
      }
    } catch {
      // ignore transient state sync errors, websocket updates can still continue
    }
  }

  private scheduleOutboundFlush() {
    if (this.outboundFlushTimer !== null) {
      return;
    }

    const elapsed = Date.now() - this.lastOutboundFlushAt;
    const delay = Math.max(0, UPDATE_THROTTLE_MS - elapsed);

    this.outboundFlushTimer = window.setTimeout(() => {
      this.outboundFlushTimer = null;
      this.flushPendingUpdates();

      if (this.pendingOutboundUpdates.length > 0) {
        this.scheduleOutboundFlush();
      }
    }, delay);
  }
}
