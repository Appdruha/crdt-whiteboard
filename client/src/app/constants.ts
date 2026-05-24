import type { DemoConfig } from "./types";

export const DEFAULT_CONFIG: DemoConfig = {
  roomId: "demo-room",
  websocketUrl: "ws://localhost:3001",
  uploadUrl: "http://localhost:3001/assets",
  stateUrl: "http://localhost:3001/state"
};
