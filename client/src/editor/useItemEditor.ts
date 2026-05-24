import { useState, type ChangeEvent, type MutableRefObject } from "react";
import {
  getInspectorFields,
  getItemPresentation,
  supportsText,
  type DemoItemRecord
} from "@crdt-demo/shared";
import type { WhiteboardEngine } from "@crdt-demo/engine";

interface UseItemEditorOptions {
  engineRef: MutableRefObject<WhiteboardEngine | null>;
  uploadUrl: string;
}

export function useItemEditor({ engineRef, uploadUrl }: UseItemEditorOptions) {
  const [selectedItem, setSelectedItem] = useState<DemoItemRecord | null>(null);
  const [textDraft, setTextDraft] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const selectedItemLabel = selectedItem ? getItemPresentation(selectedItem).label : null;
  const inspectorFields = selectedItem ? getInspectorFields(selectedItem) : [];

  function handleSelectionChange(item: DemoItemRecord | null) {
    setSelectedItem(item);
    setTextDraft(item && supportsText(item) ? item.text : "");
  }

  function handleFillChange(fill: string) {
    engineRef.current?.updateSelectedFill(fill);
  }

  function handleTextCommit() {
    engineRef.current?.updateSelectedText(textDraft);
  }

  function handleTextChange(nextValue: string) {
    setTextDraft(nextValue);
    engineRef.current?.updateSelectedText(nextValue);
  }

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setIsUploading(true);

    try {
      const payload = new FormData();
      payload.append("file", file);

      const response = await fetch(uploadUrl, {
        method: "POST",
        body: payload
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const result = (await response.json()) as { url: string };
      engineRef.current?.updateSelectedBackgroundImage(result.url);
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }

  return {
    selectedItem,
    selectedItemLabel,
    inspectorFields,
    textDraft,
    isUploading,
    handleSelectionChange,
    handleFillChange,
    handleTextCommit,
    handleTextChange,
    handleImageUpload
  };
}
