import WebSocket from "ws";
import { randomUUID } from "node:crypto";
import {
  CellState,
  IGame,
  IPlayer,
  IPlayerInRoom,
  IPosition,
  IShip,
  ResponseCellState,
} from "../../types";
import { games, players, rooms } from "./store";
import { FIELDSIZE, SHIP_TYPES } from "./constants";
import { handleAiGame } from "../aiHandler";

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

export const emptyBoard: () => CellState[][] = () =>
  Array.from({ length: FIELDSIZE }, () =>
    Array.from({ length: FIELDSIZE }, () => "untouched")
  );

function isShipPlacementValid(ship: IShip, tmpBoard: CellState[][]): boolean {
  const positionEndX =
    ship.position.x + (ship.length - 1) * Number(!ship.direction);
  const positionEndY =
    ship.position.y + (ship.length - 1) * Number(ship.direction);
  if (positionEndX >= FIELDSIZE || positionEndY >= FIELDSIZE) {
    return false;
  }

  for (let aY = ship.position.y - 1; aY <= positionEndY + 1; aY++) {
    for (let aX = ship.position.x - 1; aX <= positionEndX + 1; aX++) {
      if (tmpBoard[aY]?.[aX] === "killed") {
        return false;
      }
    }
  }

  return true;
}

function updateTmpBoard(ship: IShip, tmpBoard: CellState[][]): boolean {
  for (let delta = 0; delta < ship.length; delta++) {
    const positionX = ship.position.x + delta * Number(!ship.direction);
    const positionY = ship.position.y + delta * Number(ship.direction);

    if (tmpBoard[positionY]?.[positionX] === undefined) {
      console.log(`updateTmpBoard`, tmpBoard, { positionY, positionX });
      return false;
    }
    tmpBoard[positionY][positionX] = "killed";
  }
  return true;
}

export function fillAiBoard(): Array<IShip> {
  let ships: Array<IShip> = [];
  let setted: boolean;
  do {
    setted = true;
    const tmpShips: Array<IShip> = [];

    const tmpBoard: CellState[][] = emptyBoard();

    sTypes: for (const s of SHIP_TYPES) {
      for (let i = 0; i < s.counts; i++) {
        let couldSet = false;
        let attempts = 0;
        const ship: IShip = {
          direction: false,
          length: s.length,
          position: {
            x: 0,
            y: 0,
          },
          type: s.type,
        };
        do {
          ship.position.x = getRandomInt(FIELDSIZE);
          ship.position.y = getRandomInt(FIELDSIZE);
          ship.direction = !getRandomInt(2);
          couldSet = isShipPlacementValid(ship, tmpBoard);
          attempts++;
        } while (!couldSet && attempts < 50);
        if (!couldSet) {
          external: for (let y = 0; y < FIELDSIZE; y++) {
            for (let x = 0; x < FIELDSIZE; x++) {
              for (let dir = 0; dir <= 1; dir++) {
                ship.position.x = x;
                ship.position.y = y;
                ship.direction = !dir;
                couldSet = isShipPlacementValid(ship, tmpBoard);

                if (couldSet) {
                  break external;
                }
              }
            }
          }
        }

        if (!couldSet) {
          setted = false;
          console.error("!couldSet error placement ship", s, tmpBoard);
          break sTypes;
        }

        if (couldSet) {
          if (!updateTmpBoard(ship, tmpBoard)) {
            console.error("error placement ship", s);
            throw new Error("error placement ship");
          }
          tmpShips.push(ship);
        }
      }
    }
    if (setted) {
      console.log(`tmpShips setted`, tmpShips);
      ships.push(...tmpShips);
    }
  } while (!setted);

  return ships;
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
      [player1Data.name]: emptyBoard(),
      [player2Data.name]: emptyBoard(),
    },
    turn: firstTurn,
    isAiGame: false,
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

export function getRandomInt(max: number) {
  return Math.floor(Math.random() * max);
}

export function removeUserRooms(playerName: string) {
  for (const [id, r] of rooms) {
    const index = r.users.findIndex(u => u.name === playerName);
    if (index !== -1) {
      r.users.splice(index, 1);
      console.log(`Player ${playerName} removed from room ${id}`);
      if (r.users.length === 0) {
        rooms.delete(id);
        console.log(`Room ${id} deleted because it's empty`);
      }
    }
  }
}

export function getAttackPosition(board: CellState[][]) {
  const nextPosition: IPosition = { x: 0, y: 0 };
  let findGoodPosition = false;
  external: for (let posY = 0; posY < FIELDSIZE; posY++) {
    for (let posX = 0; posX < FIELDSIZE; posX++) {
      if (board?.[posY]?.[posX] && board?.[posY]?.[posX] === "shot") {
        let attempt = posX - 1;
        while (
          board?.[posY]?.[attempt] !== undefined &&
          board?.[posY]?.[attempt] !== "miss"
        ) {
          if (board?.[posY]?.[attempt] === "untouched") {
            findGoodPosition = true;
            nextPosition.x = attempt;
            nextPosition.y = posY;
            break external;
          }
          attempt -= 1;
        }

        attempt = posX + 1;
        while (
          board?.[posY]?.[attempt] !== undefined &&
          board?.[posY]?.[attempt] !== "miss"
        ) {
          if (board?.[posY]?.[attempt] === "untouched") {
            findGoodPosition = true;
            nextPosition.x = attempt;
            nextPosition.y = posY;
            break external;
          }
          attempt += 1;
        }

        attempt = posY - 1;
        while (
          board?.[attempt]?.[posX] !== undefined &&
          board?.[attempt]?.[posX] !== "miss"
        ) {
          if (board?.[attempt]?.[posX] === "untouched") {
            findGoodPosition = true;
            nextPosition.x = posX;
            nextPosition.y = attempt;
            break external;
          }
          attempt -= 1;
        }
        attempt = posY + 1;
        while (
          board?.[attempt]?.[posX] !== undefined &&
          board?.[attempt]?.[posX] !== "miss"
        ) {
          if (board?.[attempt]?.[posX] === "untouched") {
            findGoodPosition = true;
            nextPosition.x = posX;
            nextPosition.y = attempt;
            break external;
          }
          attempt += 1;
        }

        console.log(
          `Board `,
          board,
          `at positions x:${posX}, y:${posY} has "shot" but no "untouched" nearby`
        );
        break external;
      }
    }
  }

  if (!findGoodPosition) {
    const freePositions: Array<IPosition> = [];

    for (let posY = 0; posY < FIELDSIZE; posY++) {
      for (let posX = 0; posX < FIELDSIZE; posX++) {
        if (board?.[posY]?.[posX] === "untouched") {
          freePositions.push({ x: posX, y: posY });
        }
      }
    }
    if (freePositions.length) {
      const p = freePositions[getRandomInt(freePositions.length)];
      if (p) {
        findGoodPosition = true;
        nextPosition.x = p.x;
        nextPosition.y = p.y;
      }
    }
  }
  if (!findGoodPosition) {
    console.log(`findGoodPosition`, findGoodPosition);
    console.log(`Board \n`, board, ` \n has no "untouched"  fields`);
    return;
  }
  return nextPosition;
}

export function getAttackResult(
  { x, y }: IPosition,
  opponentShips: IShip[],
  board: CellState[][],
  game: IGame,
  indexPlayer: string
) {
  if (!board?.[y]?.[x]) {
    console.log(
      `Board ${y} ${x} is corrupted value: ${board?.[y]?.[x]} \n`,
      board
    );
    return;
  }

  if (board[y][x] !== "untouched") {
    console.log(`Board ${y} ${x} has wrong value:${board[y][x]} \n`, board);

    return;
  }
  let status: ResponseCellState = "miss";

  let hitShip: IShip | undefined;
  let hitShipPositions: Array<IPosition> = [];
  let killed = false;
  let win = false;
  for (const ship of opponentShips) {
    const shipPositions = getShipCells(ship);
    if (shipPositions.some(pos => pos.x === x && pos.y === y)) {
      hitShip = ship;
      hitShipPositions = shipPositions;
      break;
    }
  }

  let responsePositions: Array<{
    position: IPosition;
    status: ResponseCellState;
  }> = [];

  if (hitShip) {
    board[y][x] = "shot";
    status = "shot";

    killed = hitShipPositions.every(({ x: posX, y: posY }) => {
      return (
        board?.[posY]?.[posX] === "shot" || board?.[posY]?.[posX] === "killed"
      );
    });

    if (killed) {
      hitShipPositions.forEach(({ x: posX, y: posY }) => {
        if (!board?.[posY]?.[posX]) {
          console.log(
            `Board ${y} ${x} is corrupted value: ${board?.[posY]?.[posX]} \n`,
            board
          );
          return;
        }
        board[posY][posX] = "killed";
        responsePositions.push({
          position: { x: posX, y: posY },
          status: "killed",
        });
      });

      const startShipY = hitShipPositions[0]?.y;
      const endShipY = hitShipPositions[hitShipPositions.length - 1]?.y;
      const startShipX = hitShipPositions[0]?.x;
      const endShipX = hitShipPositions[hitShipPositions.length - 1]?.x;

      if (
        !(hitShipPositions.length > 0) ||
        startShipY == undefined ||
        endShipY == undefined ||
        startShipX == undefined ||
        endShipX == undefined
      ) {
        console.log(
          `Ship ${hitShip} with positions ${hitShipPositions} is corrupted \n`,
          board,
          opponentShips
        );
        return;
      }

      for (let fieldY = startShipY - 1; fieldY <= endShipY + 1; fieldY++) {
        for (let fieldX = startShipX - 1; fieldX <= endShipX + 1; fieldX++) {
          if (!board && !board[fieldY] && !board[fieldY][fieldX]) {
            //out of the board  fieldY < 0 || fieldY >= FIELDSIZE || fieldX < 0 || fieldX >= FIELDSIZE
            continue;
          }

          /*  //fucking TS
    
    
                // const exampleBoard = [
                //   ["killed", "miss", "untouched", "untouched", "untouched"],
                //   ["miss", "miss", "untouched", "shot", "untouched"],
                //   ["miss", "untouched", "untouched", "shot", "untouched"],
                //   ["untouched", "untouched", "untouched", "untouched", "untouched"],
                //   ["untouched", "untouched", "untouched", "miss", "untouched"],
                // ];
                if (
                  board &&
                  board[fieldY] &&
                  board[fieldY][fieldX] &&
                  board[fieldY][fieldX] != "killed" &&
                  board[fieldY][fieldX] != "shot"
                ) {
                  board[fieldY][fieldX] = "miss";
                  responsePositions.push({
                    position: { x: fieldX, y: fieldY },
                    status: killed ? "killed" : "shot",
                  });
                }
                */
          const fuckingTS = board[fieldY];

          if (
            fuckingTS &&
            fuckingTS[fieldX] &&
            fuckingTS[fieldX] != "killed" &&
            fuckingTS[fieldX] != "shot"
          ) {
            fuckingTS[fieldX] = "miss";

            responsePositions.push({
              position: { x: fieldX, y: fieldY },
              status: "miss",
            });
          }
        }
      }

      win = opponentShips.every(ship => {
        const shipPositions = getShipCells(ship);
        return shipPositions.every(({ x: posX, y: posY }) => {
          return (
            board?.[posY]?.[posX] === "shot" ||
            board?.[posY]?.[posX] === "killed"
          );
        });
      });
    } else {
      responsePositions.push({
        position: { x, y },
        status: "shot",
      });
    }
  } else {
    board[y][x] = "miss";
    responsePositions.push({
      position: { x, y },
      status: "miss",
    });
  }

  responsePositions.forEach(({ position, status }) => {
    broadcastAttack(game, indexPlayer, position, status);
  });
  return { win, status };
}

export function handleWin(
  win: boolean,
  status: ResponseCellState,
  game: IGame,
  shooter: IPlayer | undefined,
  shooterName: string,
  opponentName: string
) {
  if (win) {
    broadcastFinish(game, shooterName);
    if (shooter) {
      shooter.wins = shooter.wins + 1;
    }
    games.delete(game.idGame);

    updateWinnersBroadcast();
  } else {
    if (status === "miss") {
      game.turn = opponentName;
    }
    sendTurn(game);

    if (game.isAiGame) {
      handleAiGame(game);
    }
  }
}
