import { DiscardableData } from "./entities";
import { OrderData } from "./orders";
import { JioState } from "src/entities/Jio";
export interface JioPatchData {
  name?: string;
  closeAt?: Date;
  orderLimit?: number;
  deliveryCost?: number;
  discount?: number;
  jioState: JioState;
  orders: {
    id?: number;
    userId?: number;
    paid?: boolean;
    items?: {
      id?: number;
      name?: string;
      quantity?: number;
      cost?: number;
    }[];
  }[];
}

export interface JioPostData {
  name: string;
  closeAt: Date;
  userId: number;
  orderLimit?: number;
}
export interface JioListData extends DiscardableData {
  name: string;
  joinCode: string;
  createdAt: Date;
  closeAt: Date;
  jioState: JioState;
  userId: number;
  username: string;
  paylah?: string;
  orderLimit?: number;
  orderCount: number;
}
export interface JioUserData {
  toPay: JioListData[];
  joined: JioListData[];
  opened: JioListData[];
}
export interface JioData extends JioListData {
  deliveryCost: number;
  discount: number;
  orders: OrderData[];
}
