export const DEMO_ROOM_ID = "demo-room";

export interface SystemReadyEnvelope {
  type: "system.ready";
  roomId: string;
  message: string;
}

export interface YjsUpdateEnvelope {
  type: "document.update";
  roomId: string;
  payload: string;
}

export interface ChunkFlushedEnvelope {
  type: "system.chunk-flushed";
  roomId: string;
  seqFrom: number;
  seqTo: number;
  eventCount: number;
}

export type ServerEnvelope = SystemReadyEnvelope | YjsUpdateEnvelope | ChunkFlushedEnvelope;

export function isServerEnvelope(value: unknown): value is ServerEnvelope {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const envelope = value as Partial<ServerEnvelope>;
  return (
    envelope.type === "system.ready" ||
    envelope.type === "document.update" ||
    envelope.type === "system.chunk-flushed"
  );
}
