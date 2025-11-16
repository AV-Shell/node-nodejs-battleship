import WebSocket from "ws";
import { playerHandler } from "./handlers/playerHandler";
import { createRoom, addUserToRoom } from "./handlers/roomHandler";
import { getPlayerNameByWs } from "./handlers/common/utils";
import { handleAddShips, handleAttack, handleRandomAttack } from "./handlers/gameHandler";

export const startControl = (ws: WebSocket): void => {
  console.log("Ws connected:", !ws.isPaused);
  ws.on("message", async message => {
    try {
      const parsedCommand = JSON.parse(message.toString());
      const type: string = parsedCommand.type ?? "";
      const rawData: string = parsedCommand.data ?? "";
      const id: number = parsedCommand.id ?? 0;

      console.log({ type, data: rawData, id }, {timeStamp: Date.now()});
      const playerName = getPlayerNameByWs(ws);
      switch (type) {
        case "reg":
          playerHandler(ws, rawData);
          break;

        case "create_room": {
          if (!playerName) {
            console.error("create_room: Player not found for this ws");
            return;
          }
          console.log({ playerName });
          createRoom(playerName);

          break;
        }

        case "add_user_to_room": {
          const data = JSON.parse(rawData);
          if (!playerName) {
            console.error(
              `add_user_to_room: Player ${playerName} not found for this ws`
            );
            return;
          }

          const { indexRoom } = data;

          if (!indexRoom) {
            console.error(
              `add_user_to_room: Room ${indexRoom} not found for this ws`
            );
            return;
          }

          addUserToRoom(playerName, indexRoom);
          break;
        }

        case "add_ships": {
          handleAddShips(ws, rawData);
          break;
        }

        case "attack": {
          handleAttack(ws, rawData);
          break;
        }

        case "randomAttack": {
          handleRandomAttack(ws, rawData);
          break;
        }

        default:
          break;
      }
    } catch (error) {
      console.log("error: ", error);
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
    // TODO: удалить игрока из rooms/games, обнулить сокет завершить текущую игру победой второго игрока
  });
};
