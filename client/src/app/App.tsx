import { getToolbarItems } from "@crdt-demo/shared";
import { getDefaultCreateBounds, type WhiteboardEngine } from "@crdt-demo/engine";
import { useRef } from "react";
import { Toolbar } from "../components/Toolbar";
import { Inspector } from "../components/Inspector";
import { useItemEditor } from "../editor/useItemEditor";
import { useDeleteSelectionHotkey } from "../hooks/useDeleteSelectionHotkey";
import { useDemoConfig } from "../hooks/useDemoConfig";
import { useWhiteboardSession } from "../hooks/useWhiteboardSession";
import type { DemoItemType } from "@crdt-demo/shared";

export function App() {
  const config = useDemoConfig();
  const engineRef = useRef<WhiteboardEngine | null>(null);
  const editor = useItemEditor({
    engineRef,
    uploadUrl: config.uploadUrl
  });
  const session = useWhiteboardSession({
    config,
    engineRef,
    onSelectionChange: editor.handleSelectionChange
  });
  useDeleteSelectionHotkey(engineRef);

  function handleCreate(type: DemoItemType) {
    const engine = engineRef.current;

    if (!engine) {
      return;
    }

    const bounds = getDefaultCreateBounds(type, editor.selectedItem);
    engine.createItem({
      type,
      ...bounds
    });
  }

  function handleDeleteSelected() {
    engineRef.current?.deleteSelectedItem();
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <p className="eyebrow">CRDT whiteboard demo</p>
        <h1>Pixi + Yjs engine demo</h1>
        <p className="muted">{session.status}</p>

        <Toolbar
          items={getToolbarItems()}
          hasSelection={Boolean(editor.selectedItem)}
          onCreate={handleCreate}
          onDeleteSelected={handleDeleteSelected}
        />

        <Inspector
          selectedItem={editor.selectedItem}
          selectedItemLabel={editor.selectedItemLabel}
          inspectorFields={editor.inspectorFields}
          textDraft={editor.textDraft}
          isUploading={editor.isUploading}
          onFillChange={editor.handleFillChange}
          onTextChange={editor.handleTextChange}
          onTextCommit={editor.handleTextCommit}
          onImageUpload={editor.handleImageUpload}
        />
      </aside>

      <section className="stage-panel">
        <div ref={session.hostRef} className="stage-host" />
      </section>
    </main>
  );
}
