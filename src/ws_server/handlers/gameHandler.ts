import { WebSocket } from "ws";
import { IAddShipsData, IPosition, IShip } from "../types";
import { games, players } from "./common/store";
import {
  broadcastStart,
  getAttackResult,
  getRandomInt,
  handleWin,
  sendTurn,
} from "./common/utils";
import { FIELDSIZE } from "./common/constants";
import { handleAiGame } from "./aiHandler";

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

      if (game.isAiGame) {
        handleAiGame(game);
      }
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
    if (!board) {
      return;
    }

    const attackResult = getAttackResult(
      { x, y },
      opponentShips,
      board,
      game,
      indexPlayer
    );

    if (attackResult === undefined) {
      return;
    }

    const { win, status } = attackResult;

    handleWin(win, status, game, shooter, indexPlayer, opponentName);
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
