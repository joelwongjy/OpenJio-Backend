import { IsInt, IsNotEmpty, Min } from "class-validator";
import _ from "lodash";
import { nanoid } from "nanoid";
import { JioData, JioListData } from "src/types/jios";
import {
  BeforeInsert,
  Column,
  Entity,
  getRepository,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from "typeorm";
import { Discardable } from "./Discardable";
import { Order } from "./Order";
import { User } from "./User";

@Entity()
export class Jio extends Discardable {
  entityName = "Jio";

  constructor(name: string, closeAt: Date, user: User, orderLimit?: number) {
    super();
    this.name = name;
    this.closeAt = closeAt;
    this.user = user;
    this.orderLimit = orderLimit ?? 1000;
  }

  @Column("varchar", { length: 6 })
  joinCode!: string;

  @Column()
  @IsNotEmpty()
  name: string;

  @Column({ type: "timestamptz" })
  @IsNotEmpty()
  closeAt: Date;

  @Column({ nullable: true })
  @IsInt()
  @Min(0)
  orderLimit?: number;

  @ManyToOne(() => User, (user) => user.openJios, { eager: false })
  @JoinColumn()
  user: User;

  @OneToMany(() => Order, (order) => order.jio)
  orders!: Order[];

  @BeforeInsert()
  setJoinCode() {
    this.joinCode = nanoid(6);
  }

  getOrders = async (): Promise<Order[]> => {
    const orders = (
      await getRepository(Jio).findOneOrFail({
        where: { id: this.id },
        relations: ["orders"],
      })
    ).orders;
    return orders;
  };

  getListData = async (): Promise<JioListData> => {
    const orderCount = this.orders.length || (await this.getOrders()).length;
    return {
      ...this.getBase(),
      name: this.name,
      joinCode: this.joinCode,
      closeAt: this.closeAt,
      username: this.user.name,
      orderCount,
    };
  };

  getData = async (): Promise<JioData> => {
    const orders = this.orders || this.getOrders();
    return {
      ...(await this.getListData()),
      orders: await Promise.all(orders.map((order) => order.getData())),
    };
  };
}
