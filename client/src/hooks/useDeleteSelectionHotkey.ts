import { useEffect, type MutableRefObject } from "react";
import type { WhiteboardEngine } from "@crdt-demo/engine";

export function useDeleteSelectionHotkey(engineRef: MutableRefObject<WhiteboardEngine | null>) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;

      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        engineRef.current?.deleteSelectedItem();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [engineRef]);
}
