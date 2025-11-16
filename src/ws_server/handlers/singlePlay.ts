import { WebSocket } from "ws";
import { IPlayer, IGame } from "../types";
import { games, players } from "./common/store";
import { randomUUID } from "node:crypto";
import { emptyBoard, fillAiBoard, removeUserRooms } from "./common/utils";
import { AI_NAME } from "./common/constants";

const getPlayer = (ws: WebSocket): IPlayer | undefined => {
  return Array.from(players.values()).find((pl: IPlayer) => {
    return pl.ws == ws;
  });
};

const getAiPlayer = (): IPlayer | undefined => {
  return Array.from(players.values()).find((pl: IPlayer) => {
    return pl.name == AI_NAME;
  });
};

export function handleSinglePlay(ws: WebSocket) {
  try {
    const player = getPlayer(ws);
    const aiPlayer = getAiPlayer();
    console.log({ aiPlayer });

    if (!player) {
      console.error(
        "Player with this connection not found in players map",
        player
      );
      return;
    }
    const gameId = randomUUID();

    const firstTurn = Math.random() < 0.5 ? player.name : AI_NAME;

    const game: IGame = {
      idGame: gameId,
      players: {
        [player.name]: player,
        [AI_NAME]: { name: AI_NAME, password: randomUUID(), wins: 0 },
      },
      boardState: {
        [player.name]: emptyBoard(),
        [AI_NAME]: emptyBoard(),
      },

      ships: {
        [player.name]: [],
        [AI_NAME]: fillAiBoard(),
      },
      turn: firstTurn,
      isAiGame: true,
    };

    removeUserRooms(player.name);

    console.log(game);
    console.log(game.ships[AI_NAME]);
    games.set(gameId, game);

    player.ws?.send(
      JSON.stringify({
        type: "create_game",
        data: JSON.stringify({
          idGame: gameId,
          idPlayer: player.name,
        }),
        id: 0,
      })
    );

    console.log(
      `Game ${gameId} created between ${player.name} and Ai. First turn: ${firstTurn}`
    );
  } catch (err) {
    console.error("handleRandomAttack error:", err);
  }
}
