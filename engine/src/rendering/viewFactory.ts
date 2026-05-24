import { Container, Graphics, type FederatedPointerEvent } from "pixi.js";
import { canAcceptChildren, type DemoItemRecord } from "@crdt-demo/shared";
import { renderItemContent } from "./itemRenderers";
import type { UpdateViewOptions } from "./types";

export function getOrCreateView(
  viewById: Map<string, Container>,
  id: string,
  onPointerDown: (event: FederatedPointerEvent, id: string) => void
) {
  let container = viewById.get(id);

  if (container) {
    return container;
  }

  container = new Container();
  container.eventMode = "static";
  container.on("pointerdown", (event) => {
    onPointerDown(event, container!.label);
  });
  viewById.set(id, container);
  return container;
}

export function updateView(container: Container, item: DemoItemRecord, options: UpdateViewOptions) {
  container.label = item.id;
  container.cursor = canAcceptChildren(item) ? "move" : "grab";
  container.removeChildren().forEach((child) => child.destroy({ children: true }));
  renderItemContent(container, item, options);
  appendSelectionOutline(container, item, options.selectedItemId);
}

function appendSelectionOutline(container: Container, item: DemoItemRecord, selectedItemId: string | null) {
  if (selectedItemId !== item.id) {
    return;
  }

  const outline = new Graphics();
  outline
    .rect(-4, -4, item.width + 8, item.height + 8)
    .stroke({
      color: "#facc15",
      width: 3
    });
  container.addChild(outline);
}
