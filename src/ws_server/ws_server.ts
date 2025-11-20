import { WebSocketServer } from "ws";
import { startControl } from "./controller";

const WS_PORT = 3000;

export const wss = new WebSocketServer({ port: WS_PORT });

wss.on("listening", () =>
  console.log("WebSocketServer listening on port", WS_PORT)
);
wss.on("connection", startControl);

wss.on("close", () => {
  console.log("[WS] Server closed.");
});
wss.on("error", error => {
  console.log("error ", error);
});
