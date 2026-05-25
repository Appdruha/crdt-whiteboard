import { Assets, Container, Graphics, Sprite, Text, Texture } from "pixi.js";
import type { DemoItemRecord } from "@crdt-demo/shared";
import type { ItemRendererRegistry, UpdateViewOptions } from "./types";

const slideRenderer: ItemRendererRegistry["slide"] = (container, item, options) => {
  appendFilledShape(container, item.width, item.height, item.fill);
  appendBackgroundImage(container, item, options);
  appendLabel(container, "Slide", 16, 12);
};

const textRenderer: ItemRendererRegistry["text"] = (container, item) => {
  container.addChild(
    new Text({
      text: item.text,
      style: {
        fill: item.color,
        fontSize: item.fontSize
      }
    })
  );
};

const rectangleRenderer: ItemRendererRegistry["rectangle"] = (container, item, options) => {
  appendFilledShape(container, item.width, item.height, item.fill);
  appendBackgroundImage(container, item, options);
};

const ITEM_RENDERERS: ItemRendererRegistry = {
  slide: slideRenderer,
  text: textRenderer,
  rectangle: rectangleRenderer
};

export function renderItemContent<TType extends DemoItemRecord["type"]>(
  container: Container,
  item: Extract<DemoItemRecord, { type: TType }>,
  options: UpdateViewOptions
) {
  // Type-specific drawing is dispatched through a registry instead of branching in the scene controller.
  ITEM_RENDERERS[item.type](container, item, options);
}

function appendFilledShape(container: Container, width: number, height: number, fill: string) {
  const shape = new Graphics();
  shape.rect(0, 0, width, height).fill(fill);
  container.addChild(shape);
}

function appendBackgroundImage(
  container: Container,
  item: Extract<DemoItemRecord, { backgroundImage: string | null }>,
  options: UpdateViewOptions
) {
  if (!item.backgroundImage) {
    return;
  }

  // Image loading is async, so the fill stays visible until the texture is available.
  void options.ensureImageLoaded(item.backgroundImage).then((loadedNow) => {
    if (loadedNow) {
      options.onImageLoaded(options.renderToken, item.backgroundImage!);
    }
  });

  if (!options.loadedImageUrls.has(item.backgroundImage)) {
    return;
  }

  const texture = Assets.get<Texture>(item.backgroundImage);

  if (!texture) {
    return;
  }

  // The loaded texture is projected to the item's bounds as a plain Pixi sprite.
  const sprite = new Sprite(texture);
  sprite.width = item.width;
  sprite.height = item.height;
  container.addChild(sprite);
}

function appendLabel(container: Container, text: string, x: number, y: number) {
  const label = new Text({
    text,
    style: {
      fill: "#f9fafb",
      fontSize: 16
    }
  });

  label.position.set(x, y);
  container.addChild(label);
}
