import { validate } from "class-validator";
import { Item } from "../../entities/Item";
import { Jio, JioState } from "../../entities/Jio";
import { Order } from "../../entities/Order";
import { User } from "../../entities/User";
import {
  ITEM_EDITOR_ERROR,
  JIO_CREATOR_ERROR,
  JIO_EDITOR_ERROR,
  JIO_GETTER_ERROR,
  ORDER_EDITOR_ERROR,
} from "../../types/errors";
import {
  JioData,
  JioPatchData,
  JioPostData,
  JioUserData,
} from "../../types/jios";
import { OrderPatchData } from "src/types/orders";
import { getRepository, ILike } from "typeorm";
import { flatMap } from "lodash";
import { ItemPatchData } from "src/types/items";
import { isAfter, isBefore } from "date-fns";
class JioGetterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = JIO_GETTER_ERROR;
  }
}
class JioCreatorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = JIO_CREATOR_ERROR;
  }
}
class JioEditorError extends Error {
  constructor(message: string) {
    super();
    this.message = message;
    this.name = JIO_EDITOR_ERROR;
  }
}
class OrderEditorError extends Error {
  constructor(message: string) {
    super();
    this.message = message;
    this.name = ORDER_EDITOR_ERROR;
  }
}

class ItemEditorError extends Error {
  constructor(message: string) {
    super();
    this.message = message;
    this.name = ITEM_EDITOR_ERROR;
  }
}
export class JioGetter {
  public async getJios(jioIds: number[]): Promise<Jio[]> {
    const jios =
      jioIds.length === 0
        ? []
        : await getRepository(Jio).find({
            where: jioIds.map((id) => {
              return { id };
            }),
          });
    return jios;
  }

  public async getUserOpenJios(userId: number): Promise<JioUserData> {
    const jiosQuery = await getRepository(User).findOne({
      where: { id: userId },
      relations: [
        "openJios",
        "openJios.orders",
        "openJios.user",
        "orders",
        "orders.jio",
        "orders.jio.user",
        "orders.jio.orders",
      ],
    });

    if (!jiosQuery) {
      throw new JioGetterError(`Could not find a user with a matching ID`);
    }

    const toPay = await Promise.all(
      jiosQuery.orders
        .filter(
          (order) =>
            !order.paid &&
            order.jio.user.id !== userId &&
            order.jio.jioState === JioState.COST_ENTERED
        )
        .map(async (order) => {
          return order.jio.getListData();
        })
    );

    const joined = await Promise.all(
      jiosQuery.orders
        .filter(
          (order) =>
            (order.jio.jioState === JioState.OPEN ||
              order.jio.jioState === JioState.CLOSED) &&
            order.jio.user.id !== userId
        )
        .map(async (order) => {
          return order.jio.getListData();
        })
    );

    const opened = await Promise.all(
      jiosQuery.openJios
        .filter((jio) => jio.jioState !== JioState.PAYMENT_DONE)
        .map((j) => {
          return j.getListData();
        })
    );

    return { toPay, joined, opened };
  }

  public async getJio(id: string): Promise<JioData | undefined> {
    const jio = await getRepository(Jio).findOne({
      where: { joinCode: ILike(`%${id}%`) },
      relations: [
        "orders",
        "orders.user",
        "orders.jio",
        "orders.jio.user",
        "user",
      ],
    });

    if (!jio) {
      throw new JioGetterError(`Could not find an OpenJio matching id ${id}`);
    }

    if (jio.jioState === JioState.OPEN && isBefore(jio.closeAt, new Date())) {
      jio.jioState = JioState.CLOSED;
      await getRepository(Jio).save(jio);
    }

    const result: JioData = await jio.getData();

    return result;
  }
}
export class JioCreator {
  public async createJio(createData: JioPostData): Promise<Jio> {
    const { name, closeAt, userId, orderLimit } = createData;

    const user = await getRepository(User).findOneOrFail({
      where: { id: userId },
    });

    let jio: Jio = new Jio(name, closeAt, user, orderLimit);
    const errors = await validate(jio);
    if (errors.length > 0) {
      throw new JioCreatorError(
        `Provided Jio details (name: ${name}, closeAt: ${closeAt}) ` +
          `failed validation checks (failed properties: ${errors.map(
            (e) => e.property
          )})`
      );
    }

    jio = await getRepository(Jio).save(jio);
    return jio;
  }
}
export class JioEditor {
  public async editJio(id: number, editData: JioPatchData): Promise<Jio> {
    const query = await getRepository(Jio).findOneOrFail({
      where: { id },
      relations: ["orders"],
    });

    const {
      name,
      closeAt,
      orderLimit,
      orders,
      jioState,
      deliveryCost,
      discount,
    } = editData;
    let jio: Jio;
    jio = await this.editJioAttributes(
      query,
      jioState,
      name,
      closeAt,
      orderLimit,
      deliveryCost,
      discount
    );

    if (orders) {
      jio = await this.editAssociatedOrders(query, {
        orders,
      });
    }

    return jio;
  }

  private async editJioAttributes(
    jio: Jio,
    jioState: JioState,
    name?: string,
    closeAt?: Date,
    orderLimit?: number,
    deliveryCost?: number,
    discount?: number
  ): Promise<Jio> {
    if (!name && !closeAt && !orderLimit) {
      return jio;
    }

    if (name) {
      jio.name = name;
    }
    if (closeAt) {
      jio.closeAt = closeAt;
    }
    if (orderLimit) {
      jio.orderLimit = orderLimit;
    }
    jio.jioState = jioState;

    await getRepository(Jio).save(jio);
    return jio;
  }

  private async editAssociatedOrders(
    jio: Jio,
    editData: Required<Pick<JioPatchData, "orders">>
  ): Promise<Jio> {
    const { orders: existingOrders } = jio;

    const orderMap: Map<number, Order> = new Map();
    existingOrders.forEach((order) => {
      orderMap.set(order.id, order);
    });

    const toKeep: Order[] = [];
    const toCreate: Order[] = [];
    const toDelete: Order[] = [];

    for (const order of editData.orders) {
      if (order.id && orderMap.has(order.id)) {
        const orderInMap = orderMap.get(order.id)!;
        toKeep.push(orderInMap);
        orderMap.delete(order.id);
        continue;
      }

      await getRepository(User)
        .findOneOrFail({
          where: { id: order.userId },
        })
        .then((user) => {
          toCreate.push(new Order(user, jio));
        });
    }

    orderMap.forEach((order) => {
      toDelete.push(order);
    });

    const keptOrders = await this.keepOrders(toKeep);
    const createdOrders = await this.createOrders(toCreate);
    const deletedOrders = await this.deleteOrders(toDelete);
    const associatedOrders: Order[] = [
      ...keptOrders,
      ...createdOrders,
      ...deletedOrders,
    ];

    if (associatedOrders.length < jio.orders.length) {
      throw new JioEditorError(`Edit operation will cause dangling orders`);
    }

    jio.orders = associatedOrders;
    await getRepository(Jio).save(jio);
    return jio;
  }

  private async createOrders(orders: Order[]): Promise<Order[]> {
    await Promise.all(
      orders.map(async (order) => {
        const errors = await validate(order);
        if (errors.length > 0) {
          throw new JioEditorError(
            `${order} failed validation checks ` +
              `(failed properties: ${errors.map((e) => e.property)})`
          );
        }
      })
    );

    const newOrders = await getRepository(Order).save(orders);
    return newOrders;
  }

  private async deleteOrders(orders: Order[]): Promise<Order[]> {
    const deletor = new OrderDeletor();
    return await deletor.deleteOrders(orders);
  }

  private async keepOrders(orders: Order[]): Promise<Order[]> {
    const toRestore: Order[] = [];
    const toKeep: Order[] = [];

    orders.forEach((order) => {
      if (order.discardedAt) {
        toRestore.push(order);
      } else {
        toKeep.push(order);
      }
    });

    const recoveredOrders = await getRepository(Order).recover(toRestore);
    const result = toKeep.concat(recoveredOrders);

    return result;
  }
}
export class OrderEditor {
  public async editOrder(id: number, editData: OrderPatchData): Promise<Order> {
    const order = await getRepository(Order).findOne({
      where: { id },
      relations: ["items"],
    });

    if (!order) {
      throw new OrderEditorError(`No order found for id ${id}`);
    }

    const { paid, items } = editData;

    if (paid !== undefined) {
      order.paid = paid;
    }

    const itemMap: Map<number, Item> = new Map();
    order.items.forEach((item) => {
      itemMap.set(item.id, item);
    });

    const toKeep: Item[] = [];
    const toDelete: Item[] = [];
    let toCreate: Item[] = [];

    if (items) {
      items.forEach((item) => {
        if (item.id && itemMap.has(item.id)) {
          const i = itemMap.get(item.id)!;
          toKeep.push(i);
          itemMap.delete(item.id);
          return;
        }

        const { name, quantity, cost } = item;
        if (!name || !quantity) {
          throw new JioEditorError(
            `Could not create new item as no name or quantity were given`
          );
        }
        toCreate.push(new Item(name, quantity));
      });
    }

    itemMap.forEach((item) => {
      toDelete.push(item);
    });

    // save
    await getRepository(Item).save(toKeep);
    await getRepository(Item).remove(toDelete);
    await getRepository(Item).save(toCreate);

    const prevCount = order.items.length;
    order.items = [...toKeep, ...toDelete, ...toCreate];
    if (order.items.length < prevCount) {
      throw new OrderEditorError(
        `Implementation bug: will cause dangling Item`
      );
    }
    await getRepository(Order).save(order);
    return order;
  }
}
export class ItemEditor {
  public async editItem(id: number, editData: ItemPatchData) {
    const item = await getRepository(Item).findOne({
      where: { id },
    });

    if (!item) {
      throw new ItemEditorError(`No item found for id ${id}.`);
    }

    const { cost } = editData;
    item.cost = cost;

    await getRepository(Item).save(item);
    return item;
  }
}

export class JioDeleter {
  public async deleteJio(id: number) {
    const jio = await getRepository(Jio).findOneOrFail({
      where: { id },
      relations: ["orders"],
    });

    const { orders } = jio;

    await this._deleteJio(jio);

    const orderDeletor = new OrderDeletor();
    await orderDeletor.deleteOrders(orders);
  }

  private async _deleteJio(jio: Jio): Promise<void> {
    await getRepository(Jio).remove(jio);
  }
}
export class OrderDeletor {
  public async deleteOrders(orders: Order[]): Promise<Order[]> {
    if (orders.length === 0) {
      return [];
    }

    const ordersOR = orders.map((order) => {
      return { id: order.id };
    });
    const queryOrders = await getRepository(Order).find({
      where: ordersOR,
      relations: ["items"],
      withDeleted: true,
    });

    const items = flatMap(queryOrders.map((order) => order.items));

    const result = await this._deleteOrders(queryOrders);
    await this._deleteItems(items);

    return result;
  }

  private async _deleteOrders(orders: Order[]): Promise<Order[]> {
    return await getRepository(Order).remove(orders);
  }

  private async _deleteItems(items: Item[]): Promise<Item[]> {
    return await getRepository(Item).remove(items);
  }
}
