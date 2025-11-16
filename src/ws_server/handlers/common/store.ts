import { randomUUID } from "node:crypto";
import { IPlayer, IRoom, IGame } from "../../types";
import { AI_NAME } from "./constants";

export const players = new Map<string, IPlayer>([
  [AI_NAME, { name: AI_NAME, password: randomUUID(), wins: 0 }],
]);
export const rooms = new Map<string, IRoom>();
export const games = new Map<string, IGame>();
