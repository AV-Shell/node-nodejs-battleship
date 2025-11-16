import WebSocket from "ws";
import { FIELDSIZE } from "../handlers/common/constants";

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

export type TShipType = "small" | "medium" | "large" | "huge";
export interface IShip {
  position: IPosition;
  direction: boolean;
  length: number;
  type: TShipType;
}

export interface IShipTypes {
  type: TShipType;
  length: number;
  counts: number;
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
  isAiGame: boolean;
}

export interface ISingleGame {
  idGame: string;
  player: IPlayer;
  ships: Record<string, IShip[]>;
  boardState: Record<string, Array<Array<CellState>>>;
  turn: boolean;
}

export type TFixedArray<
  T,
  N extends number,
  A extends T[] = []
> = A["length"] extends N ? A : TFixedArray<T, N, [...A, T]>;

export type TBoard = TFixedArray<
  TFixedArray<CellState, typeof FIELDSIZE>,
  typeof FIELDSIZE
>;
