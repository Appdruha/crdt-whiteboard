import { useEffect, useRef, useState, type MutableRefObject } from "react";
import type { WhiteboardEngine } from "@crdt-demo/engine";
import { WhiteboardEngine as WhiteboardEngineRuntime } from "@crdt-demo/engine";
import type { DemoItemRecord, RoomStateResponse } from "@crdt-demo/shared";
import type { DemoConfig } from "../app/types";

interface UseWhiteboardSessionOptions {
  config: DemoConfig;
  engineRef: MutableRefObject<WhiteboardEngine | null>;
  onSelectionChange: (item: DemoItemRecord | null) => void;
}

export function useWhiteboardSession({
  config,
  engineRef,
  onSelectionChange
}: UseWhiteboardSessionOptions) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const selectionChangeRef = useRef(onSelectionChange);
  const [status, setStatus] = useState("Bootstrapping engine...");

  selectionChangeRef.current = onSelectionChange;

  useEffect(() => {
    if (!hostRef.current) {
      return;
    }

    let disposed = false;

    void (async () => {
      const initialStateBase64 = await loadInitialState(config.stateUrl);

      if (disposed || !hostRef.current) {
        return;
      }

      const engine = new WhiteboardEngineRuntime({
        container: hostRef.current,
        roomId: config.roomId,
        socketUrl: config.websocketUrl,
        stateUrl: config.stateUrl,
        onStatusChange: setStatus,
        onSelectionChange: (item) => {
          selectionChangeRef.current(item);
        }
      });

      await engine.mount(initialStateBase64);
      setStatus("Engine mounted. Room state restored.");
      engineRef.current = engine;
    })();

    return () => {
      disposed = true;
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, [config]);

  return {
    hostRef,
    engineRef,
    status
  };
}

async function loadInitialState(stateUrl: string) {
  try {
    const response = await fetch(stateUrl);

    if (!response.ok) {
      throw new Error("State request failed");
    }

    const state = (await response.json()) as RoomStateResponse;
    return state.yjsStateBase64;
  } catch {
    return undefined;
  }
}
