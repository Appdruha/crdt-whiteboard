export type DemoItemType = "slide" | "text" | "rectangle";

export interface ItemGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ItemHierarchy {
  parentId: string | null;
  childIds: string[];
  acceptsChildren: boolean;
}

export interface DemoItemBase extends ItemGeometry, ItemHierarchy {
  id: string;
  type: DemoItemType;
}

export interface SlideItem extends DemoItemBase {
  type: "slide";
  fill: string;
  backgroundImage: string | null;
}

export interface TextItem extends DemoItemBase {
  type: "text";
  text: string;
  fontSize: number;
  color: string;
}

export interface RectangleItem extends DemoItemBase {
  type: "rectangle";
  fill: string;
  backgroundImage: string | null;
}

export type DemoItemRecord = SlideItem | TextItem | RectangleItem;
export type DemoItem = DemoItemRecord;
export interface RoomSnapshotData {
  zOrder: string[];
  itemsById: Record<string, DemoItemRecord>;
}
export interface RoomStateResponse {
  yjsStateBase64: string;
  snapshot: RoomSnapshotData;
}

export interface CreateItemInput {
  type: DemoItemType;
  x: number;
  y: number;
  width: number;
  height: number;
}
