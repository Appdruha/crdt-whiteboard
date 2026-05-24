import type { Container } from "pixi.js";
import type { DemoItemRecord, DemoItemType } from "@crdt-demo/shared";

export interface UpdateViewOptions {
  renderToken: number;
  selectedItemId: string | null;
  loadedImageUrls: {
    has: (url: string) => boolean;
  };
  ensureImageLoaded: (url: string) => Promise<boolean>;
  onImageLoaded: (renderToken: number, url: string) => void;
}

export type ItemRenderer<TItem extends DemoItemRecord = DemoItemRecord> = (
  container: Container,
  item: TItem,
  options: UpdateViewOptions
) => void;

export type ItemRendererRegistry = {
  [TType in DemoItemType]: ItemRenderer<Extract<DemoItemRecord, { type: TType }>>;
};
