import { Assets } from "pixi.js";

export class ImageAssetStore {
  private readonly loadedImageUrls = new Set<string>();
  private readonly pendingImageUrls = new Set<string>();

  has(url: string) {
    return this.loadedImageUrls.has(url);
  }

  async ensureLoaded(url: string) {
    if (this.loadedImageUrls.has(url) || this.pendingImageUrls.has(url)) {
      return false;
    }

    this.pendingImageUrls.add(url);

    try {
      await Assets.load(url);
      this.loadedImageUrls.add(url);
      return true;
    } catch {
      return false;
    } finally {
      this.pendingImageUrls.delete(url);
    }
  }
}
