import { WebSocket } from "ws";
import { IAddShipsData, IPosition, IShip, ResponseCellState } from "../types";
import { games, players } from "./common/store";
import {
  broadcastAttack,
  broadcastFinish,
  broadcastStart,
  getRandomInt,
  getShipCells,
  sendTurn,
  updateWinnersBroadcast,
} from "./common/utils";
import { FIELDSIZE } from "./common/constants";

export function handleAddShips(ws: WebSocket, rawData: string) {
  try {
    const data: IAddShipsData = JSON.parse(rawData);
    const { gameId: rawGameId, ships, indexPlayer } = data;

    const gameId = rawGameId.toString();
    const game = games.get(gameId);

    if (!game) {
      console.error(`Game ${gameId} not found`);
      return;
    }

    const playerName = indexPlayer.toString();
    const player = players.get(playerName);

    if (!player || player.ws !== ws) {
      console.error(`Player ${playerName} not found or WS mismatch`);
      return;
    }

    game.ships[playerName] = ships;

    const playerNames = Object.keys(game.players);
    const [p1, p2] = playerNames;

    if (!p1 || !p2) {
      console.error(`Game ${gameId} has invalid player names`);
      return;
    }

    const p1ShipsSubmitted = game.ships[p1] && game.ships[p1].length > 0;
    const p2ShipsSubmitted = game.ships[p2] && game.ships[p2].length > 0;

    if (p1ShipsSubmitted && p2ShipsSubmitted) {
      console.log(`Both players submitted ships. Starting game ${gameId}`);

      broadcastStart(game);

      sendTurn(game);
    } else {
      console.log(
        `Player ${playerName} submitted ships. Waiting for the other player.`
      );
    }
  } catch (err) {
    console.error("handleAddShips error:", err);
  }
}

interface IAttackData {
  gameId: string;
  x: number;
  y: number;
  indexPlayer: string;
}

export function handleAttack(ws: WebSocket, rawData: string) {
  try {
    const data: IAttackData = JSON.parse(rawData);
    const { gameId, x, y, indexPlayer } = data;

    const game = games.get(gameId);
    if (!game) {
      console.error(`Game ${gameId} not found`);
      return;
    }

    const shooter = players.get(indexPlayer);
    if (!shooter || shooter.ws !== ws) {
      console.error(`Player ${indexPlayer} not found or WS mismatch`);
      return;
    }

    if (game.turn !== indexPlayer) {
      console.error(
        `Player ${indexPlayer} tries to shoot when it's not his turn.`
      );
      return;
    }

    const opponentName = Object.keys(game.players).find(
      name => name !== indexPlayer
    );
    if (!opponentName) {
      return;
    }

    const opponentShips: IShip[] | undefined = game.ships[opponentName];

    if (!opponentShips) {
      return;
    }

    const board = game.boardState[indexPlayer];

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

    let status: "miss" | "shot" | "killed" = "miss";

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
    if (win) {
      broadcastFinish(game, indexPlayer);
      shooter.wins = shooter.wins + 1;
      games.delete(gameId);

      updateWinnersBroadcast();
    } else {
      if (status === "miss") {
        game.turn = opponentName;
      }
      sendTurn(game);
    }
  } catch (err) {
    console.error("handleAttack error:", err);
  }
}

export function handleRandomAttack(ws: WebSocket, rawData: string) {
  try {
    const data: IAttackData = JSON.parse(rawData);
    const { gameId, indexPlayer } = data;
    const game = games.get(gameId);
    if (!game) {
      console.error(`Game ${gameId} not found`);
      return;
    }

    const shooter = players.get(indexPlayer);
    if (!shooter || shooter.ws !== ws) {
      console.error(`Player ${indexPlayer} not found or WS mismatch`);
      return;
    }

    if (game.turn !== indexPlayer) {
      console.error(
        `Player ${indexPlayer} tries to shoot when it's not his turn.`
      );
      return;
    }

    const opponentName = Object.keys(game.players).find(
      name => name !== indexPlayer
    );
    if (!opponentName) {
      return;
    }

    const opponentShips: IShip[] | undefined = game.ships[opponentName];

    if (!opponentShips) {
      return;
    }
    const board = game.boardState[indexPlayer];
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
    handleAttack(
      ws,
      JSON.stringify({
        gameId,
        x: nextPosition.x,
        y: nextPosition.y,
        indexPlayer,
      })
    );
  } catch (err) {
    console.error("handleRandomAttack error:", err);
  }
}
