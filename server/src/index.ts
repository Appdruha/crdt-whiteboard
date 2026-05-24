import express from "express";
import { createServer } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { type ServerEnvelope, isServerEnvelope } from "@crdt-demo/shared";
import { getServerConfig } from "./config.js";
import { createUploadsRouter } from "./http/uploads.js";
import { EventPipeline } from "./services/event-pipeline.js";
import { RoomStateStore } from "./services/room-state.js";
import { MinioStorage } from "./storage/minio.js";
import { PostgresStorage } from "./storage/postgres.js";
import { RedisEventQueue } from "./storage/redis.js";

const config = getServerConfig();
const app = express();
const server = createServer(app);
const socketServer = new WebSocketServer({ server });

const clients = new Set<WebSocket>();
const roomStateStore = new RoomStateStore();
const postgresStorage = new PostgresStorage(config.postgresUrl);
const redisQueue = new RedisEventQueue(config.redisUrl);
const minioStorage = new MinioStorage(config.minio);

const eventPipeline = new EventPipeline(
  config,
  redisQueue,
  postgresStorage,
  roomStateStore,
  (envelope) => {
    broadcast(envelope);
  }
);

app.use(express.json({ limit: "10mb" }));
app.use((request, response, next) => {
  response.header("Access-Control-Allow-Origin", "*");
  response.header("Access-Control-Allow-Headers", "Content-Type");
  response.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");

  if (request.method === "OPTIONS") {
    response.sendStatus(204);
    return;
  }

  next();
});
app.use("/assets", createUploadsRouter(minioStorage, config.publicBaseUrl));

app.get("/health", (_request, response) => {
  response.json({
    ok: true,
    roomId: config.roomId,
    uptimeSeconds: Math.floor(process.uptime())
  });
});

app.get("/config", (_request, response) => {
  response.json({
    roomId: config.roomId,
    websocketUrl: toWebSocketUrl(config.publicBaseUrl),
    uploadUrl: `${config.publicBaseUrl}/assets`,
    stateUrl: `${config.publicBaseUrl}/state`
  });
});

app.get("/state", (_request, response) => {
  response.json({
    yjsStateBase64: roomStateStore.getEncodedState(config.roomId),
    snapshot: roomStateStore.getSnapshot(config.roomId)
  });
});

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  console.error(error);
  response.status(500).json({
    error: "Internal server error"
  });
});

socketServer.on("connection", (socket) => {
  clients.add(socket);

  socket.send(
    JSON.stringify({
      type: "system.ready",
      roomId: config.roomId,
      message: "Socket connected"
    } satisfies ServerEnvelope)
  );

  socket.on("message", async (payload) => {
    const textPayload = payload.toString();

    try {
      const envelope = JSON.parse(textPayload);

      if (!isServerEnvelope(envelope)) {
        return;
      }

      if (envelope.type === "document.update" && envelope.roomId === config.roomId) {
        await eventPipeline.enqueueUpdate(envelope.roomId, envelope.payload);
      }

      broadcast(envelope, socket);
    } catch (error) {
      console.error("Failed to process socket payload", error);
    }
  });

  socket.on("close", () => {
    clients.delete(socket);
  });
});

void bootstrap();

async function bootstrap() {
  await Promise.all([postgresStorage.init(), redisQueue.connect(), minioStorage.init()]);
  await restoreRoom(config.roomId);

  server.listen(config.port, () => {
    console.log(`Server listening on http://localhost:${config.port}`);
  });
}

function broadcast(envelope: ServerEnvelope, exclude?: WebSocket) {
  const payload = JSON.stringify(envelope);

  for (const client of clients) {
    if (client !== exclude && client.readyState === client.OPEN) {
      client.send(payload);
    }
  }
}

async function shutdown() {
  await eventPipeline.dispose();
  await Promise.all([postgresStorage.close(), redisQueue.close()]);
  socketServer.close();
  server.close();
}

process.on("SIGINT", () => {
  void shutdown();
});

process.on("SIGTERM", () => {
  void shutdown();
});

function toWebSocketUrl(publicBaseUrl: string) {
  if (publicBaseUrl.startsWith("https://")) {
    return publicBaseUrl.replace("https://", "wss://");
  }

  if (publicBaseUrl.startsWith("http://")) {
    return publicBaseUrl.replace("http://", "ws://");
  }

  return publicBaseUrl;
}

async function restoreRoom(roomId: string) {
  const state = await postgresStorage.loadRoomState(roomId);

  for (const event of state.events) {
    roomStateStore.applyUpdate(roomId, event.payloadBase64);
  }
}
