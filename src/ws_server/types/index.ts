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

export interface IShip {
  position: { x: number; y: number };
  direction: boolean;
  length: number;
  type: "small" | "medium" | "large" | "huge";
}

export interface IGame {
  idGame: string;
  players: Record<string, IPlayer>;
  ships: Record<string, IShip[]>; 
  boardState: Record<string, number[][]>; 
  turn: string; 
}
