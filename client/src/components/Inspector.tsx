import type { ChangeEvent } from "react";
import type { DemoItemRecord, InspectorFieldDefinition } from "@crdt-demo/shared";
import { renderInspectorField } from "./inspectorFieldRegistry";

interface InspectorProps {
  selectedItem: DemoItemRecord | null;
  selectedItemLabel: string | null;
  inspectorFields: InspectorFieldDefinition[];
  textDraft: string;
  isUploading: boolean;
  onFillChange: (fill: string) => void;
  onTextChange: (value: string) => void;
  onTextCommit: () => void;
  onImageUpload: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
}

export function Inspector({
  selectedItem,
  selectedItemLabel,
  inspectorFields,
  textDraft,
  isUploading,
  onFillChange,
  onTextChange,
  onTextCommit,
  onImageUpload
}: InspectorProps) {
  return (
    <section className="inspector">
      <h2>Inspector</h2>
      {!selectedItem && <p className="muted">Select an item on canvas to edit it.</p>}

      {selectedItem && (
        <>
          <p className="selection-label">
            {selectedItemLabel} · {selectedItem.id}
          </p>

          {inspectorFields.map((field) => (
            <InspectorFieldSlot
              key={field.kind}
              field={field}
              selectedItem={selectedItem}
              textDraft={textDraft}
              isUploading={isUploading}
              onFillChange={onFillChange}
              onTextChange={onTextChange}
              onTextCommit={onTextCommit}
              onImageUpload={onImageUpload}
            />
          ))}
        </>
      )}
    </section>
  );
}

interface InspectorFieldProps {
  field: InspectorFieldDefinition;
  selectedItem: DemoItemRecord;
  textDraft: string;
  isUploading: boolean;
  onFillChange: (fill: string) => void;
  onTextChange: (value: string) => void;
  onTextCommit: () => void;
  onImageUpload: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
}

function InspectorFieldSlot(props: InspectorFieldProps) {
  return renderInspectorField(props);
}
