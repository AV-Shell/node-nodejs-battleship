import WebSocket from "ws";
import { randomUUID } from "node:crypto";
import {
  CellState,
  IGame,
  IPlayerInRoom,
  IPosition,
  IShip,
  ResponseCellState,
} from "../../types";
import { games, players, rooms } from "./store";
import { FIELDSIZE } from "./constants";

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

const emptyBoard: () => CellState[][] = () =>
  Array.from({ length: FIELDSIZE }, () =>
    Array.from({ length: FIELDSIZE }, () => "untouched")
  );

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
      [player1Data.name]: emptyBoard(),
      [player2Data.name]: emptyBoard(),
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

export function sendTurn(game: IGame) {
  const message = {
    type: "turn",
    data: JSON.stringify({
      currentPlayer: game.turn,
    }),
    id: 0,
  };

  Object.values(game.players).forEach(player => {
    if (player.ws && player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(JSON.stringify(message));
    }
  });

  console.log(
    `Turn sent for game ${game.idGame}. Current player: ${game.turn}`
  );
}

export function getShipCells(ship: IShip): Array<IPosition> {
  const { position, direction, length } = ship;

  const cells: Array<IPosition> = [];
  for (let i = 0; i < length; i++) {
    cells.push({
      x: !direction ? position.x + i : position.x,
      y: !direction ? position.y : position.y + i,
    });
  }
  return cells;
}

export function broadcastAttack(
  game: IGame,
  currentPlayer: string,
  position: IPosition,
  status: ResponseCellState
) {
  Object.values(game.players).forEach(pl => {
    if (pl.ws && pl.ws.readyState === WebSocket.OPEN) {
      const attackMessage = {
        type: "attack",
        data: JSON.stringify({
          position,
          currentPlayer,
          status,
        }),
        id: 0,
      };

      pl.ws.send(JSON.stringify(attackMessage));
    }
  });
}

export function broadcastFinish(game: IGame, winPlayer: string) {
  Object.values(game.players).forEach(pl => {
    if (pl.ws && pl.ws.readyState === WebSocket.OPEN) {
      const finishMessage = {
        type: "finish",
        data: JSON.stringify({
          winPlayer,
        }),
        id: 0,
      };

      pl.ws.send(JSON.stringify(finishMessage));
    }
  });
}

export function broadcastStart(game: IGame) {
  Object.entries(game.players).forEach(([name, pl]) => {
    const playerShips: IShip[] = game.ships[name] || [];
    const startGameMessage = {
      type: "start_game",
      data: JSON.stringify({
        ships: playerShips,
        currentPlayerIndex: name,
      }),
      id: 0,
    };
    if (pl.ws && pl.ws.readyState === WebSocket.OPEN) {
      pl.ws.send(JSON.stringify(startGameMessage));
    }
  });
}
