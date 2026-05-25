import {
  canAcceptChildren,
  getItemDefaultSize,
  type DemoItemRecord,
  type DemoItemType
} from "@crdt-demo/shared";
import {
  CHILD_SPAWN_OFFSET_X,
  CHILD_SPAWN_OFFSET_Y,
  CHILD_STACK_STEP_Y,
  ROOT_SPAWN_X,
  ROOT_SPAWN_Y
} from "./constants";

export function getDefaultCreateBounds(type: DemoItemType, anchor?: DemoItemRecord | null) {
  const defaultSize = getItemDefaultSize(type);

  if (anchor && canAcceptChildren(anchor) && !canAcceptChildren(type)) {
    return {
      x: anchor.x + CHILD_SPAWN_OFFSET_X,
      y: anchor.y + CHILD_SPAWN_OFFSET_Y + anchor.childIds.length * CHILD_STACK_STEP_Y,
      width: defaultSize.width,
      height: defaultSize.height
    };
  }

  return {
    x: ROOT_SPAWN_X,
    y: ROOT_SPAWN_Y,
    width: defaultSize.width,
    height: defaultSize.height
  };
}
