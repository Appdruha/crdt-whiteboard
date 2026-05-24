export interface ServerConfig {
  port: number;
  publicBaseUrl: string;
  roomId: string;
  chunkSize: number;
  flushIntervalMs: number;
  snapshotEvery: number;
  postgresUrl: string;
  redisUrl: string;
  minio: {
    endPoint: string;
    port: number;
    useSSL: boolean;
    accessKey: string;
    secretKey: string;
    bucket: string;
  };
}

export function getServerConfig(): ServerConfig {
  return {
    port: Number(process.env.PORT ?? 3001),
    publicBaseUrl: process.env.PUBLIC_BASE_URL ?? "http://localhost:3001",
    roomId: process.env.DEMO_ROOM_ID ?? "demo-room",
    chunkSize: Number(process.env.CHUNK_SIZE ?? 10),
    flushIntervalMs: Number(process.env.FLUSH_INTERVAL_MS ?? 1000),
    snapshotEvery: Number(process.env.SNAPSHOT_EVERY ?? 50),
    postgresUrl:
      process.env.POSTGRES_URL ?? "postgresql://postgres:postgres@localhost:55432/crdt_demo",
    redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
    minio: {
      endPoint: process.env.MINIO_ENDPOINT ?? "localhost",
      port: Number(process.env.MINIO_PORT ?? 9000),
      useSSL: process.env.MINIO_USE_SSL === "true",
      accessKey: process.env.MINIO_ACCESS_KEY ?? "minio",
      secretKey: process.env.MINIO_SECRET_KEY ?? "minio123",
      bucket: process.env.MINIO_BUCKET ?? "crdt-demo"
    }
  };
}
