import { IPlayer, IRoom, IGame } from "../../types";

export const players = new Map<string, IPlayer>();
export const rooms = new Map<string, IRoom>();
export const games = new Map<string, IGame>();
