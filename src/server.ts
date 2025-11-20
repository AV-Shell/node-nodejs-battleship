import { httpServer } from "./http_server/static";
import { wss } from "./ws_server/ws_server";
import WebSocket from "ws";

const HTTP_PORT = 8181;

console.log(`Start static http server on the ${HTTP_PORT} port!`);
httpServer.listen(HTTP_PORT);

["SIGINT", "SIGTERM"].forEach(signal => {
  process.on(signal, sig => {
    console.log(`Received ${sig}, shutting down...`);
    wss.clients.forEach((ws: WebSocket) => {
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      } catch (err) {
        console.error("Error closing client:", err);
      }
    });

    setTimeout(async () => {
      await new Promise(resolve => wss.close(resolve));
      console.log("WebSocket server closed");
      await new Promise(resolve => httpServer.close(resolve));
      console.log("HTTP server closed");
      process.exit(0);
    }, 50);
  });
});
