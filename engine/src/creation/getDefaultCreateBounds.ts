import {
  canAcceptChildren,
  getItemDefaultSize,
  type DemoItemRecord,
  type DemoItemType
} from "@crdt-demo/shared";

export function getDefaultCreateBounds(type: DemoItemType, anchor?: DemoItemRecord | null) {
  const defaultSize = getItemDefaultSize(type);

  if (anchor && canAcceptChildren(anchor) && !canAcceptChildren(type)) {
    return {
      x: anchor.x + 48,
      y: anchor.y + 56 + anchor.childIds.length * 28,
      width: defaultSize.width,
      height: defaultSize.height
    };
  }

  return {
    x: 120,
    y: 80,
    width: defaultSize.width,
    height: defaultSize.height
  };
}
