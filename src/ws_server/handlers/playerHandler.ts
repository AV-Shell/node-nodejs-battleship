import { WebSocket } from "ws";
import { IPlayer } from "../types";
import { updateRoomBroadcast, updateWinnersBroadcast } from "./common/utils";
import { players } from "./common/store";

interface IRegData {
  name: string;
  password: string;
}

export function playerHandler(ws: WebSocket, rawData: string) {
  const data: IRegData = JSON.parse(rawData);
  const { name, password } = data;

  let player: IPlayer | undefined = players.get(name);

  let response;

  if (player) {
    if (player.password !== password) {
      response = {
        type: "reg",
        data: JSON.stringify({
          name,
          index: "",
          error: true,
          errorText: "Invalid password",
        }),
        id: 0,
      };
      ws.send(JSON.stringify(response));
      return;
    }

    player.ws = ws;
  } else {
    player = { name, password, wins: 0, ws };
    players.set(name, player);
  }

  response = {
    type: "reg",
    data: JSON.stringify({ name, index: name, error: false, errorText: "" }),
    id: 0,
  };

  ws.send(JSON.stringify(response));
  updateRoomBroadcast();
  updateWinnersBroadcast();
}
