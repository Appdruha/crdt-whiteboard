import type { ChangeEvent, ReactElement } from "react";
import {
  supportsBackgroundImage,
  supportsFill,
  supportsText,
  type DemoItemRecord,
  type InspectorFieldDefinition,
  type InspectorFieldKind
} from "@crdt-demo/shared";

export interface InspectorFieldRendererProps {
  field: InspectorFieldDefinition;
  selectedItem: DemoItemRecord;
  textDraft: string;
  isUploading: boolean;
  onFillChange: (fill: string) => void;
  onTextChange: (value: string) => void;
  onTextCommit: () => void;
  onImageUpload: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
}

type InspectorFieldRenderer = (props: InspectorFieldRendererProps) => ReactElement | null;

const fillFieldRenderer: InspectorFieldRenderer = ({ field, selectedItem, onFillChange }) => {
  if (!supportsFill(selectedItem)) {
    return null;
  }

  return (
    <label className="field">
      <span>{field.label}</span>
      <input
        type="color"
        value={selectedItem.fill}
        onChange={(event) => onFillChange(event.target.value)}
      />
    </label>
  );
};

const textFieldRenderer: InspectorFieldRenderer = ({
  field,
  selectedItem,
  textDraft,
  onTextChange,
  onTextCommit
}) => {
  if (!supportsText(selectedItem)) {
    return null;
  }

  return (
    <label className="field">
      <span>{field.label}</span>
      <textarea
        value={textDraft}
        onChange={(event) => onTextChange(event.target.value)}
        onBlur={onTextCommit}
        rows={4}
      />
    </label>
  );
};

const backgroundImageFieldRenderer: InspectorFieldRenderer = ({
  field,
  selectedItem,
  isUploading,
  onImageUpload
}) => {
  if (!supportsBackgroundImage(selectedItem)) {
    return null;
  }

  return (
    <label className="field file-field">
      <span>{field.label}</span>
      <input type="file" accept="image/*" onChange={(event) => void onImageUpload(event)} />
      <small>{isUploading ? "Uploading..." : selectedItem.backgroundImage ?? "No image"}</small>
    </label>
  );
};

const INSPECTOR_FIELD_RENDERERS: Record<InspectorFieldKind, InspectorFieldRenderer> = {
  fill: fillFieldRenderer,
  text: textFieldRenderer,
  backgroundImage: backgroundImageFieldRenderer
};

export function renderInspectorField(props: InspectorFieldRendererProps) {
  return INSPECTOR_FIELD_RENDERERS[props.field.kind](props);
}
