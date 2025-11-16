import WebSocket from "ws";
import { randomUUID } from "node:crypto";
import { IGame, IPlayerInRoom } from "../../types";
import { games, players, rooms } from "./store";

export function updateWinnersBroadcast() {
  const winnersData = Array.from(players.values()).map(player => ({
    name: player.name,
    wins: player.wins,
  }));

  players.forEach(player => {
    if (player.ws && player.ws.readyState === WebSocket.OPEN) {
      const message = {
        type: "update_winners",
        data: JSON.stringify(winnersData),
        id: 0,
      };
      player.ws.send(JSON.stringify(message));
    }
  });
}

export function updateRoomBroadcast() {
  const roomList = Array.from(rooms.values()).map(room => ({
    roomId: room.roomId,
    roomUsers: room.users,
  }));

  players.forEach(player => {
    if (player.ws && player.ws.readyState === WebSocket.OPEN) {
      const message = {
        type: "update_room",
        data: JSON.stringify(roomList),
        id: 0,
      };
      player.ws.send(JSON.stringify(message));
    }
  });
}

export function createGame(p1Room: IPlayerInRoom, p2Room: IPlayerInRoom): void {
  const player1Data = players.get(p1Room.name);
  const player2Data = players.get(p2Room.name);

  if (!player1Data || !player2Data) {
    console.error("One of the players not found in players map");
    return;
  }
  const gameId = randomUUID();

  const firstTurn = Math.random() < 0.5 ? player1Data.name : player2Data.name;

  const game: IGame = {
    idGame: gameId,
    players: {
      [player1Data.name]: player1Data,
      [player2Data.name]: player2Data,
    },
    ships: {
      [player1Data.name]: [],
      [player2Data.name]: [],
    },
    boardState: {
      [player1Data.name]: Array(10)
        .fill(null)
        .map(() => Array(10).fill(0)),
      [player2Data.name]: Array(10)
        .fill(null)
        .map(() => Array(10).fill(0)),
    },
    turn: firstTurn,
  };

  games.set(gameId, game);

  [player1Data, player2Data].forEach(pl => {
    pl.ws?.send(
      JSON.stringify({
        type: "create_game",
        data: JSON.stringify({
          idGame: gameId,
          idPlayer: pl.name,
        }),
        id: 0,
      })
    );
  });

  console.log(
    `Game ${gameId} created between ${player1Data.name} and ${player1Data.name}. First turn: ${firstTurn}`
  );
}

export function getPlayerNameByWs(ws: WebSocket): string | undefined {
  for (const [name, player] of players) {
    if (player.ws === ws) return name;
  }
  return undefined;
}
