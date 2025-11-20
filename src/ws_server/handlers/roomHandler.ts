import { randomUUID } from "node:crypto";
import { IRoom } from "../types";
import {
  updateRoomBroadcast,
  createGame,
  removeUserRooms,
} from "./common/utils";
import { rooms, players } from "./common/store";

export function createRoom(playerName: string) {
  for (const room of rooms.values()) {
    if (room.users.find(u => u.name === playerName)) {
      console.warn(`${playerName} уже создал комнату с ID ${room.roomId}`);

      updateRoomBroadcast();

      return;
    }
  }
  const roomId = randomUUID();

  const newRoom: IRoom = {
    roomId,
    users: [{ name: playerName, index: playerName }],
  };

  rooms.set(roomId, newRoom);

  console.log(`Комната ${roomId} создана игроком ${playerName}`);

  updateRoomBroadcast();
}

export function addUserToRoom(playerName: string, roomId: string) {
  const room = rooms.get(roomId);
  if (!room) {
    console.warn(`Room ${roomId} not found`);
    return;
  }

  const player = players.get(playerName);
  if (!player) {
    console.warn(`Player ${playerName} not found`);
    return;
  }

  if (room.users.find(u => u.name === playerName)) {
    console.warn(`Player ${playerName} already in room ${roomId}`);
    return;
  }

  // for (const [id, r] of rooms) {
  //   const index = r.users.findIndex(u => u.name === playerName);
  //   if (index !== -1) {
  //     r.users.splice(index, 1);
  //     console.log(`Player ${playerName} removed from room ${id}`);
  //     if (r.users.length === 0) {
  //       rooms.delete(id);
  //       console.log(`Room ${id} deleted because it's empty`);
  //     }
  //   }
  // }
  removeUserRooms(playerName);

  room.users.push({ name: playerName, index: playerName });

  const isRoomFull = room.users.length === 2;

  if (isRoomFull) {
    console.log(
      `Room ${roomId} deleted because it became full and game started`
    );
    rooms.delete(roomId);
  }

  updateRoomBroadcast();

  if (isRoomFull) {
    const [player1, player2] = room.users;
    if (!player1 || !player2) {
      return;
    }

    createGame(player1, player2);
  }
}
