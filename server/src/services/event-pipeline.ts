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

    // Keep the in-memory room document hot so snapshots can be produced from current state.
    this.roomStateStore.applyUpdate(roomId, payloadBase64);
    const length = await this.redisQueue.enqueue(roomId, event);
    this.ensureFlushTimer(roomId);

    // Flush immediately when the buffered room queue reaches the configured chunk size.
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

    // Each room gets its own periodic flush so low-traffic rooms are eventually persisted too.
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
      // Drain only one chunk at a time so Redis buffering and Postgres sequence ranges stay aligned.
      const events = await this.redisQueue.drain(roomId, this.config.chunkSize);

      if (events.length === 0) {
        return;
      }

      // Postgres stores the binary event chunk and, when needed, a JSON snapshot of the current room.
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
