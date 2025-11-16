import WebSocket from "ws";

export interface IPlayer {
  name: string;
  password: string;
  wins: number;
  ws?: WebSocket;
}

export interface IPlayerInRoom {
  name: string;
  index: string;
}

export interface IRoom {
  roomId: string;
  users: IPlayerInRoom[];
}

export interface IPosition {
  x: number;
  y: number;
}

export interface IShip {
  position: IPosition;
  direction: boolean;
  length: number;
  type: "small" | "medium" | "large" | "huge";
}

export interface IAddShipsData {
  gameId: number | string;
  ships: Array<IShip>;
  indexPlayer: number | string;
}

export type ResponseCellState = "miss" | "shot" | "killed";
export type CellState = "untouched" | ResponseCellState;

export interface IGame {
  idGame: string;
  players: Record<string, IPlayer>;
  ships: Record<string, IShip[]>;
  boardState: Record<string, Array<Array<CellState>>>;
  turn: string;
}
