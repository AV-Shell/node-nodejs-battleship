import { IGame, IPosition, IShip } from "../types";
import { AI_NAME } from "./common/constants";
import { players } from "./common/store";
import { getAttackPosition, getAttackResult, handleWin } from "./common/utils";

export function handleAiGame(game: IGame) {
  if (game.turn !== AI_NAME) {
    console.log("Not Ai turn");
    return;
  }

  setTimeout(() => {
    try {
      const indexPlayer = AI_NAME;

      const shooter = players.get(indexPlayer);

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
      const nextPosition: IPosition | undefined = getAttackPosition(board);
      if (!nextPosition) {
        return;
      }

      const attackResult = getAttackResult(
        nextPosition,
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
      console.error("handleRandomAttack error:", err);
    }
  }, 1300);
}
