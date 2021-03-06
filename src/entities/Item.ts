import { IsNotEmpty } from "class-validator";
import { Column, Entity, ManyToOne } from "typeorm";
import { Discardable } from "./Discardable";
import { Order } from "./Order";

@Entity()
export class Item extends Discardable {
  entityName = "Item";

  constructor(name: string, quantity: number, cost?: number) {
    super();
    this.name = name;
    this.quantity = quantity;
    this.cost = cost;
  }

  @Column()
  @IsNotEmpty()
  name: string;

  @Column()
  @IsNotEmpty()
  quantity: number;

  @Column("decimal", { scale: 2, nullable: true })
  cost?: number;

  @ManyToOne((type) => Order, (order) => order.items, { onDelete: "CASCADE" })
  order!: Order;
}
