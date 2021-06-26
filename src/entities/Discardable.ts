import { IsOptional } from "class-validator";
import { Column, DeleteDateColumn } from "typeorm";
import { DiscardableData } from "../types/entities";
import { Base } from "./Base";

export abstract class Discardable extends Base {
  @DeleteDateColumn({ type: "timestamptz" })
  discardedAt!: Date | null;

  getBase = (): DiscardableData => ({
    id: this.id,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    discardedAt: this.discardedAt,
  });
}
