import type {
  CreateItemInput,
  DemoItemBase,
  DemoItemRecord,
  DemoItemType,
  RectangleItem,
  SlideItem,
  TextItem
} from "./items.js";

export interface ItemCapabilities {
  acceptsChildren: boolean;
  supportsFill: boolean;
  supportsText: boolean;
  supportsBackgroundImage: boolean;
}

export type InspectorFieldKind = "fill" | "text" | "backgroundImage";

export interface InspectorFieldDefinition {
  kind: InspectorFieldKind;
  label: string;
}

export interface ItemPresentation {
  label: string;
  createLabel: string;
}

export interface ItemDefinition<TItem extends DemoItemRecord = DemoItemRecord> {
  type: TItem["type"];
  defaultSize: {
    width: number;
    height: number;
  };
  presentation: ItemPresentation;
  inspectorFields: InspectorFieldDefinition[];
  capabilities: ItemCapabilities;
  create: (input: CreateItemInput & { id: string }) => TItem;
}

type ItemDefinitionMap = {
  [TType in DemoItemType]: ItemDefinition<Extract<DemoItemRecord, { type: TType }>>;
};

export type FillableItem = Extract<DemoItemRecord, { fill: string }>;
export type BackgroundImageItem = Extract<DemoItemRecord, { backgroundImage: string | null }>;
export type TextEditableItem = Extract<DemoItemRecord, { text: string }>;

export const ITEM_DEFINITIONS: ItemDefinitionMap = {
  slide: {
    type: "slide",
    defaultSize: {
      width: 520,
      height: 320
    },
    presentation: {
      label: "Slide",
      createLabel: "Add slide"
    },
    inspectorFields: [
      {
        kind: "fill",
        label: "Fill"
      },
      {
        kind: "backgroundImage",
        label: "Background image"
      }
    ],
    capabilities: {
      acceptsChildren: true,
      supportsFill: true,
      supportsText: false,
      supportsBackgroundImage: true
    },
    create: (input): SlideItem => ({
      ...createBaseItemData(input, true),
      id: input.id,
      type: "slide",
      fill: "#1f2937",
      backgroundImage: null
    })
  },
  text: {
    type: "text",
    defaultSize: {
      width: 240,
      height: 60
    },
    presentation: {
      label: "Text",
      createLabel: "Add text"
    },
    inspectorFields: [
      {
        kind: "text",
        label: "Text"
      }
    ],
    capabilities: {
      acceptsChildren: false,
      supportsFill: false,
      supportsText: true,
      supportsBackgroundImage: false
    },
    create: (input): TextItem => ({
      ...createBaseItemData(input, false),
      id: input.id,
      type: "text",
      text: "New text",
      fontSize: 24,
      color: "#f9fafb"
    })
  },
  rectangle: {
    type: "rectangle",
    defaultSize: {
      width: 180,
      height: 120
    },
    presentation: {
      label: "Rectangle",
      createLabel: "Add rectangle"
    },
    inspectorFields: [
      {
        kind: "fill",
        label: "Fill"
      },
      {
        kind: "backgroundImage",
        label: "Background image"
      }
    ],
    capabilities: {
      acceptsChildren: false,
      supportsFill: true,
      supportsText: false,
      supportsBackgroundImage: true
    },
    create: (input): RectangleItem => ({
      ...createBaseItemData(input, false),
      id: input.id,
      type: "rectangle",
      fill: "#f59e0b",
      backgroundImage: null
    })
  }
};

export function createDemoItem(input: CreateItemInput): DemoItemRecord {
  return getItemDefinition(input.type).create({
    ...input,
    id: createId()
  });
}

export function getItemDefinition(itemOrType: DemoItemRecord | DemoItemType) {
  return ITEM_DEFINITIONS[typeof itemOrType === "string" ? itemOrType : itemOrType.type];
}

export function getItemDefaultSize(type: DemoItemType) {
  return getItemDefinition(type).defaultSize;
}

export function getItemPresentation(itemOrType: DemoItemRecord | DemoItemType) {
  return getItemDefinition(itemOrType).presentation;
}

export function getInspectorFields(itemOrType: DemoItemRecord | DemoItemType) {
  return getItemDefinition(itemOrType).inspectorFields;
}

export function getToolbarItems() {
  return Object.values(ITEM_DEFINITIONS).map((definition) => ({
    type: definition.type,
    label: definition.presentation.createLabel
  }));
}

export function canAcceptChildren(
  item: Pick<DemoItemBase, "acceptsChildren" | "type"> | DemoItemType
) {
  if (typeof item === "string") {
    return getItemDefinition(item).capabilities.acceptsChildren;
  }

  if (typeof item.acceptsChildren === "boolean") {
    return item.acceptsChildren;
  }

  return getItemDefinition(item.type).capabilities.acceptsChildren;
}

export function supportsFill(item: DemoItemRecord): item is FillableItem;
export function supportsFill(type: DemoItemType): boolean;
export function supportsFill(itemOrType: DemoItemRecord | DemoItemType) {
  return getItemDefinition(itemOrType).capabilities.supportsFill;
}

export function supportsBackgroundImage(item: DemoItemRecord): item is BackgroundImageItem;
export function supportsBackgroundImage(type: DemoItemType): boolean;
export function supportsBackgroundImage(itemOrType: DemoItemRecord | DemoItemType) {
  return getItemDefinition(itemOrType).capabilities.supportsBackgroundImage;
}

export function supportsText(item: DemoItemRecord): item is TextEditableItem;
export function supportsText(type: DemoItemType): boolean;
export function supportsText(itemOrType: DemoItemRecord | DemoItemType) {
  return getItemDefinition(itemOrType).capabilities.supportsText;
}

function createBaseItemData(
  input: CreateItemInput,
  acceptsChildren: boolean
): Omit<DemoItemBase, "id" | "type"> {
  return {
    x: input.x,
    y: input.y,
    width: input.width,
    height: input.height,
    parentId: null,
    childIds: [],
    acceptsChildren
  };
}

function createId() {
  return `item_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
