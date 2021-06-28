import { Item } from "src/entities/Item";
import { DiscardableData } from "./entities";

export interface OrderPatchData {
  paid?: boolean;
  items: {
    id?: number;
    name?: string;
    quantity?: number;
    cost?: number;
  }[];
}

export interface OrderData extends DiscardableData {
  userId: number;
  username: string;
  paid: boolean;
  items: {
    id: number;
    name: string;
    quantity: number;
    cost?: number;
  }[];
  cost?: number;
}
