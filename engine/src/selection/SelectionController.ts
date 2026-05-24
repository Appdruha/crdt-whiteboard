import type { DemoItemRecord } from "@crdt-demo/shared";

interface SelectionControllerOptions {
  getItemById: (id: string) => DemoItemRecord | null;
  onSelectionChange?: (item: DemoItemRecord | null) => void;
}

export class SelectionController {
  private selectedItemId: string | null = null;

  constructor(private readonly options: SelectionControllerOptions) {}

  setSelectedItemId(id: string | null) {
    this.selectedItemId = id;
  }

  getSelectedItemId() {
    return this.selectedItemId;
  }

  getSelectedItem() {
    return this.selectedItemId ? this.options.getItemById(this.selectedItemId) : null;
  }

  clearIfDeleted(deletedIds: string[]) {
    if (this.selectedItemId && deletedIds.includes(this.selectedItemId)) {
      this.selectedItemId = null;
    }
  }

  emitSelectionChange() {
    this.options.onSelectionChange?.(this.getSelectedItem());
  }
}
