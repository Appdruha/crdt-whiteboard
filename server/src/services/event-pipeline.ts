import type { ServerEnvelope } from "@crdt-demo/shared";
import type { ServerConfig } from "../config.js";
import type { PostgresStorage } from "../storage/postgres.js";
import { RedisEventQueue } from "../storage/redis.js";
import { RoomStateStore } from "./room-state.js";

export class EventPipeline {
  private readonly flushTimers = new Map<string, NodeJS.Timeout>();
  private readonly roomFlushLocks = new Set<string>();

  constructor(
    private readonly config: ServerConfig,
    private readonly redisQueue: RedisEventQueue,
    private readonly postgresStorage: PostgresStorage,
    private readonly roomStateStore: RoomStateStore,
    private readonly onChunkFlushed?: (envelope: ServerEnvelope) => void
  ) {}

  async enqueueUpdate(roomId: string, payloadBase64: string) {
    const event = {
      payloadBase64,
      receivedAt: new Date().toISOString()
    };

    this.roomStateStore.applyUpdate(roomId, payloadBase64);
    const length = await this.redisQueue.enqueue(roomId, event);
    this.ensureFlushTimer(roomId);

    if (length >= this.config.chunkSize) {
      await this.flushRoom(roomId);
    }
  }

  async flushAllRooms() {
    const rooms = await this.redisQueue.listRooms();

    for (const roomId of rooms) {
      await this.flushRoom(roomId);
    }
  }

  async dispose() {
    for (const timer of this.flushTimers.values()) {
      clearInterval(timer);
    }

    this.flushTimers.clear();
    await this.flushAllRooms();
  }

  private ensureFlushTimer(roomId: string) {
    if (this.flushTimers.has(roomId)) {
      return;
    }

    const timer = setInterval(() => {
      void this.flushRoom(roomId);
    }, this.config.flushIntervalMs);

    this.flushTimers.set(roomId, timer);
  }

  private async flushRoom(roomId: string) {
    if (this.roomFlushLocks.has(roomId)) {
      return;
    }

    const pendingCount = await this.redisQueue.pendingCount(roomId);

    if (pendingCount === 0) {
      return;
    }

    this.roomFlushLocks.add(roomId);

    try {
      const events = await this.redisQueue.drain(roomId, this.config.chunkSize);

      if (events.length === 0) {
        return;
      }

      const result = await this.postgresStorage.persistChunk(
        roomId,
        events,
        this.config.snapshotEvery,
        this.roomStateStore.getSnapshot(roomId)
      );

      this.onChunkFlushed?.({
        type: "system.chunk-flushed",
        roomId,
        seqFrom: result.seqFrom,
        seqTo: result.seqTo,
        eventCount: result.eventCount
      });
    } finally {
      this.roomFlushLocks.delete(roomId);
    }
  }
}
