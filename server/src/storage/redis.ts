import { createClient, type RedisClientType } from "redis";
import type { StoredEvent } from "./postgres.js";

export class RedisEventQueue {
  private readonly client: RedisClientType;

  constructor(url: string) {
    this.client = createClient({ url });
  }

  async connect() {
    if (!this.client.isOpen) {
      await this.client.connect();
    }
  }

  async enqueue(roomId: string, event: StoredEvent) {
    const key = this.eventsKey(roomId);
    const length = await this.client.rPush(key, JSON.stringify(event));
    // Track active rooms separately so the pipeline can discover which room queues need flushing.
    await this.client.sAdd(this.roomsKey(), roomId);
    return length;
  }

  async drain(roomId: string, limit: number) {
    const key = this.eventsKey(roomId);
    // Read the next chunk and trim it from the Redis list in one round-trip.
    const rows = await this.client.multi().lRange(key, 0, limit - 1).lTrim(key, limit, -1).exec();
    const rawEvents = ((rows?.[0] as unknown) as string[] | null) ?? [];
    return rawEvents.map((row) => JSON.parse(row) as StoredEvent);
  }

  async listRooms() {
    return this.client.sMembers(this.roomsKey());
  }

  async pendingCount(roomId: string) {
    return this.client.lLen(this.eventsKey(roomId));
  }

  async close() {
    if (this.client.isOpen) {
      await this.client.quit();
    }
  }

  private eventsKey(roomId: string) {
    // One Redis list per room keeps arrival order stable for chunk persistence.
    return `room:${roomId}:events`;
  }

  private roomsKey() {
    // Global set of rooms that have ever buffered events in Redis.
    return "rooms:active";
  }
}
