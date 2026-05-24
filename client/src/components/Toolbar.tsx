import type { DemoItemType } from "@crdt-demo/shared";

export interface ToolbarItem {
  type: DemoItemType;
  label: string;
}

interface ToolbarProps {
  items: ToolbarItem[];
  hasSelection: boolean;
  onCreate: (type: DemoItemType) => void;
  onDeleteSelected: () => void;
}

export function Toolbar({ items, hasSelection, onCreate, onDeleteSelected }: ToolbarProps) {
  return (
    <div className="toolbar">
      {items.map((item) => (
        <button key={item.type} type="button" onClick={() => onCreate(item.type)}>
          {item.label}
        </button>
      ))}

      <button
        type="button"
        className="danger-button"
        onClick={onDeleteSelected}
        disabled={!hasSelection}
      >
        Delete selected
      </button>
    </div>
  );
}
