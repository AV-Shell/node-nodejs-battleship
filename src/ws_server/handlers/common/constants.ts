import { IShipTypes } from "../../types";

export const FIELDSIZE = 10;
export const AI_NAME = "Ai";

export const SHIP_TYPES: Array<IShipTypes> = [
  { type: "huge", length: 4, counts: 1 },
  { type: "large", length: 3, counts: 2 },
  { type: "medium", length: 2, counts: 3 },
  { type: "small", length: 1, counts: 4 },
];
