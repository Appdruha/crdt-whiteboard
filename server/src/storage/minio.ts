import { Client } from "minio";
import type { ServerConfig } from "../config.js";

export class MinioStorage {
  private readonly client: Client;
  private readonly bucket: string;

  constructor(config: ServerConfig["minio"]) {
    this.bucket = config.bucket;
    this.client = new Client({
      endPoint: config.endPoint,
      port: config.port,
      useSSL: config.useSSL,
      accessKey: config.accessKey,
      secretKey: config.secretKey
    });
  }

  async init() {
    const exists = await this.client.bucketExists(this.bucket);

    if (!exists) {
      await this.client.makeBucket(this.bucket);
    }
  }

  async uploadImage(objectName: string, buffer: Buffer, contentType: string) {
    await this.client.putObject(this.bucket, objectName, buffer, buffer.length, {
      "Content-Type": contentType
    });
  }

  async getImage(objectName: string) {
    return this.client.getObject(this.bucket, objectName);
  }

  async getImageMeta(objectName: string) {
    return this.client.statObject(this.bucket, objectName);
  }
}
