import { Pool } from "pg";
import type { DemoItemRecord, RoomSnapshotData } from "@crdt-demo/shared";

export interface StoredEvent {
  payloadBase64: string;
  receivedAt: string;
}

export interface SnapshotPayload extends RoomSnapshotData {}

export interface PersistChunkResult {
  seqFrom: number;
  seqTo: number;
  eventCount: number;
  snapshotSaved: boolean;
}

export class PostgresStorage {
  private readonly pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  async init() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        last_seq INTEGER NOT NULL DEFAULT 0,
        last_snapshot_seq INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS event_chunks (
        id BIGSERIAL PRIMARY KEY,
        room_id TEXT NOT NULL REFERENCES rooms(id),
        seq_from INTEGER NOT NULL,
        seq_to INTEGER NOT NULL,
        event_count INTEGER NOT NULL,
        payload_binary BYTEA NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS snapshots (
        id BIGSERIAL PRIMARY KEY,
        room_id TEXT NOT NULL REFERENCES rooms(id),
        seq INTEGER NOT NULL,
        snapshot_json JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  }

  async persistChunk(
    roomId: string,
    events: StoredEvent[],
    snapshotEvery: number,
    snapshot: SnapshotPayload
  ): Promise<PersistChunkResult> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");
      await client.query(
        `
          INSERT INTO rooms (id)
          VALUES ($1)
          ON CONFLICT (id) DO NOTHING
        `,
        [roomId]
      );

      const roomResult = await client.query<{
        last_seq: number;
        last_snapshot_seq: number;
      }>(
        `
          SELECT last_seq, last_snapshot_seq
          FROM rooms
          WHERE id = $1
          FOR UPDATE
        `,
        [roomId]
      );

      const room = roomResult.rows[0];
      const seqFrom = room.last_seq + 1;
      const seqTo = room.last_seq + events.length;
      const payloadBinary = encodeChunk(events);

      await client.query(
        `
          INSERT INTO event_chunks (room_id, seq_from, seq_to, event_count, payload_binary)
          VALUES ($1, $2, $3, $4, $5)
        `,
        [roomId, seqFrom, seqTo, events.length, payloadBinary]
      );

      let snapshotSaved = false;
      let lastSnapshotSeq = room.last_snapshot_seq;

      if (seqTo - room.last_snapshot_seq >= snapshotEvery) {
        await client.query(
          `
            INSERT INTO snapshots (room_id, seq, snapshot_json)
            VALUES ($1, $2, $3)
          `,
          [roomId, seqTo, snapshot]
        );

        snapshotSaved = true;
        lastSnapshotSeq = seqTo;
      }

      await client.query(
        `
          UPDATE rooms
          SET last_seq = $2,
              last_snapshot_seq = $3
          WHERE id = $1
        `,
        [roomId, seqTo, lastSnapshotSeq]
      );

      await client.query("COMMIT");

      return {
        seqFrom,
        seqTo,
        eventCount: events.length,
        snapshotSaved
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async close() {
    await this.pool.end();
  }

  async loadRoomState(roomId: string) {
    const snapshotResult = await this.pool.query<{
      seq: number;
      snapshot_json: SnapshotPayload;
    }>(
      `
        SELECT seq, snapshot_json
        FROM snapshots
        WHERE room_id = $1
        ORDER BY seq DESC
        LIMIT 1
      `,
      [roomId]
    );

    const snapshot = snapshotResult.rows[0] ?? null;
    const chunksResult = await this.pool.query<{
      payload_binary: Buffer;
      seq_from: number;
      seq_to: number;
    }>(
      `
        SELECT payload_binary, seq_from, seq_to
        FROM event_chunks
        WHERE room_id = $1
        ORDER BY seq_from ASC
      `,
      [roomId]
    );

    return {
      snapshot,
      events: chunksResult.rows.flatMap((row) => decodeChunk(row.payload_binary))
    };
  }
}

function encodeChunk(events: StoredEvent[]) {
  const parts: Buffer[] = [];
  const countBuffer = Buffer.allocUnsafe(4);
  countBuffer.writeUInt32BE(events.length, 0);
  parts.push(countBuffer);

  for (const event of events) {
    const payload = Buffer.from(event.payloadBase64, "base64");
    const metadata = Buffer.from(JSON.stringify({ receivedAt: event.receivedAt }), "utf8");
    const header = Buffer.allocUnsafe(8);
    header.writeUInt32BE(metadata.length, 0);
    header.writeUInt32BE(payload.length, 4);
    parts.push(header, metadata, payload);
  }

  return Buffer.concat(parts);
}

function decodeChunk(payloadBinary: Buffer) {
  const events: StoredEvent[] = [];
  let offset = 0;
  const count = payloadBinary.readUInt32BE(offset);
  offset += 4;

  for (let index = 0; index < count; index += 1) {
    const metadataLength = payloadBinary.readUInt32BE(offset);
    offset += 4;
    const payloadLength = payloadBinary.readUInt32BE(offset);
    offset += 4;

    const metadata = JSON.parse(payloadBinary.subarray(offset, offset + metadataLength).toString("utf8")) as {
      receivedAt: string;
    };
    offset += metadataLength;

    const payload = payloadBinary.subarray(offset, offset + payloadLength);
    offset += payloadLength;

    events.push({
      payloadBase64: payload.toString("base64"),
      receivedAt: metadata.receivedAt
    });
  }

  return events;
}
