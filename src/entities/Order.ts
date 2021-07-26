import {
  Column,
  Entity,
  getRepository,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from "typeorm";
import { Discardable } from "./Discardable";
import { Jio } from "./Jio";
import { Item } from "./Item";
import { OrderData } from "src/types/orders";
import { User } from "./User";

@Entity()
export class Order extends Discardable {
  entityName = "Order";

  constructor(user: User, jio: Jio) {
    super();
    this.user = user;
    this.paid = false;
    this.jio = jio;
  }

  @Column()
  paid: boolean;

  @OneToMany((type) => Item, (item) => item.order, { onDelete: "CASCADE" })
  items!: Item[];

  @ManyToOne((type) => Jio, (jio) => jio.orders, { onDelete: "CASCADE" })
  @JoinColumn()
  jio!: Jio;

  @ManyToOne(() => User, (user) => user.orders, { eager: false })
  @JoinColumn()
  user: User;

  getData = async (): Promise<OrderData> => {
    const order = await getRepository(Order).findOneOrFail({
      where: { id: this.id },
      relations: ["items", "user"],
    });
    const items = this.items || order.items;
    const cost = items.map((item) => item.cost ?? 0).reduce((a, b) => a + b, 0);
    return {
      ...this.getBase(),
      userId: order.user.id,
      username: order.user.name,
      paid: this.paid,
      cost,
      items,
    };
  };
}
