import { IsInt, IsNotEmpty, Min } from "class-validator";
import { isBefore } from "date-fns";
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

export enum JioState {
  OPEN = "OPEN",
  CLOSED = "CLOSED",
  COST_ENTERED = "COST_ENTERED",
  PAYMENT_DONE = "PAYMENT_DONE",
}

@Entity()
export class Jio extends Discardable {
  entityName = "Jio";

  constructor(name: string, closeAt: Date, user: User, orderLimit?: number) {
    super();
    this.name = name;
    this.closeAt = closeAt;
    this.jioState = JioState.OPEN;
    this.user = user;
    this.orderLimit = orderLimit ?? 0;
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

  @Column({
    type: "enum",
    enum: JioState,
    default: JioState.OPEN,
  })
  jioState: JioState;

  @Column("decimal", { scale: 2, nullable: true })
  deliveryCost?: number;

  @Column("decimal", { scale: 2, nullable: true })
  discount?: number;

  @ManyToOne(() => User, (user) => user.openJios, {
    eager: false,
  })
  @JoinColumn()
  user: User;

  @OneToMany(() => Order, (order) => order.jio, { onDelete: "CASCADE" })
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
      jioState: this.jioState,
      userId: this.user.id,
      username: this.user.name,
      paylah: this.user.paylah,
      orderCount,
    };
  };

  getData = async (): Promise<JioData> => {
    const orders = this.orders || this.getOrders();
    return {
      ...(await this.getListData()),
      deliveryCost: this.deliveryCost ?? 0,
      discount: this.discount ?? 0,
      orders: await Promise.all(orders.map((order) => order.getData())),
    };
  };
}
