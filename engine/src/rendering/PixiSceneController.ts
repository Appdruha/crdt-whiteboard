import { Application, Container, Rectangle, type FederatedPointerEvent, type PointData } from "pixi.js";
import type { DemoItemRecord } from "@crdt-demo/shared";
import { canAcceptChildren } from "@crdt-demo/shared";
import { getWorldPosition, getWorldRect } from "../spatial/itemCoordinates";
import { intersectsBounds } from "../spatial/rects";
import { getOrCreateView, updateView } from "./viewFactory";
import { ImageAssetStore } from "./ImageAssetStore";

interface StageHandlers {
  onItemPointerDown: (event: FederatedPointerEvent, id: string) => void;
  onStagePointerDown: (event: FederatedPointerEvent) => void;
  onPointerMove: (event: FederatedPointerEvent) => void;
  onPointerUp: () => void;
}

export class PixiSceneController {
  private readonly application = new Application();
  private readonly stageRoot = new Container();
  private readonly viewById = new Map<string, Container>();
  private readonly imageAssets = new ImageAssetStore();
  private readonly resizeObserver: ResizeObserver;
  private readonly camera = { x: 0, y: 0 };
  private renderVersion = 0;

  constructor(
    private readonly container: HTMLElement,
    private readonly onRenderRequest: () => void
  ) {
    this.resizeObserver = new ResizeObserver(() => {
      this.syncViewportBounds();
      this.onRenderRequest();
    });
  }

  async mount(handlers: StageHandlers) {
    await this.application.init({
      resizeTo: this.container,
      background: "#111827",
      antialias: true
    });

    this.application.stage.addChild(this.stageRoot);
    this.stageRoot.sortableChildren = true;
    this.container.appendChild(this.application.canvas);
    this.application.stage.eventMode = "static";
    this.syncViewportBounds();
    this.application.stage.on("pointerdown", handlers.onStagePointerDown);
    this.application.stage.on("pointermove", handlers.onPointerMove);
    this.application.stage.on("pointerup", handlers.onPointerUp);
    this.application.stage.on("pointerupoutside", handlers.onPointerUp);
    this.resizeObserver.observe(this.container);

    return this.application.canvas;
  }

  destroy() {
    this.resizeObserver.disconnect();

    for (const view of this.viewById.values()) {
      view.destroy({ children: true });
    }

    this.viewById.clear();
    this.application.destroy(true, {
      children: true
    });
  }

  setCamera(x: number, y: number) {
    this.camera.x = x;
    this.camera.y = y;
  }

  getCamera() {
    return {
      x: this.camera.x,
      y: this.camera.y
    };
  }

  toStageLocal(global: PointData) {
    return this.stageRoot.toLocal(global);
  }

  getItemWorldPosition(item: DemoItemRecord, itemsById: ReadonlyMap<string, DemoItemRecord>) {
    return getWorldPosition(item, itemsById);
  }

  render(
    orderedItems: DemoItemRecord[],
    itemsById: ReadonlyMap<string, DemoItemRecord>,
    selectedItemId: string | null,
    onItemPointerDown: (event: FederatedPointerEvent, id: string) => void
  ) {
    const renderToken = ++this.renderVersion;
    const visibleIds = this.getVisibleItemIds(orderedItems, itemsById);
    const presentIds = new Set(orderedItems.map((item) => item.id));

    this.stageRoot.position.set(this.camera.x, this.camera.y);

    for (const [id, view] of this.viewById.entries()) {
      if (!presentIds.has(id)) {
        if (view.parent === this.stageRoot) {
          this.stageRoot.removeChild(view);
        }

        view.destroy({ children: true });
        this.viewById.delete(id);
      }
    }

    for (const [index, item] of orderedItems.entries()) {
      const view = getOrCreateView(this.viewById, item.id, onItemPointerDown);
      updateView(view, item, {
        renderToken,
        selectedItemId,
        loadedImageUrls: {
          has: (url) => this.imageAssets.has(url)
        },
        ensureImageLoaded: (url) => this.imageAssets.ensureLoaded(url),
        onImageLoaded: (token, url) => {
          if (token === this.renderVersion && this.imageAssets.has(url)) {
            this.onRenderRequest();
          }
        }
      });

      const worldPosition = getWorldPosition(item, itemsById);
      view.position.set(worldPosition.x, worldPosition.y);
      view.zIndex = index;

      if (visibleIds.has(item.id)) {
        if (view.parent !== this.stageRoot) {
          this.stageRoot.addChild(view);
        }
      } else if (view.parent === this.stageRoot) {
        this.stageRoot.removeChild(view);
      }
    }
  }

  private getVisibleItemIds(items: DemoItemRecord[], itemsById: ReadonlyMap<string, DemoItemRecord>) {
    const viewport = this.getViewportBounds();
    const visibleContainers = new Set<string>();
    const visibleItems = new Set<string>();

    for (const item of items) {
      if (!canAcceptChildren(item)) {
        continue;
      }

      const worldRect = getWorldRect(item, itemsById);

      if (intersectsBounds(worldRect, viewport)) {
        visibleContainers.add(item.id);
        visibleItems.add(item.id);
      }
    }

    for (const item of items) {
      if (canAcceptChildren(item)) {
        continue;
      }

      const worldRect = getWorldRect(item, itemsById);

      if (item.parentId && visibleContainers.has(item.parentId) && intersectsBounds(worldRect, viewport)) {
        visibleItems.add(item.id);
        continue;
      }

      if (!item.parentId && intersectsBounds(worldRect, viewport)) {
        visibleItems.add(item.id);
      }
    }

    return visibleItems;
  }

  private getViewportBounds() {
    return {
      x: -this.camera.x,
      y: -this.camera.y,
      width: this.application.screen.width,
      height: this.application.screen.height
    };
  }

  private syncViewportBounds() {
    this.application.stage.hitArea = new Rectangle(
      0,
      0,
      this.application.screen.width,
      this.application.screen.height
    );
  }
}
