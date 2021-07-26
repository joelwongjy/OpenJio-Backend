import { Request, Response } from "express";
import { ItemPatchData } from "../types/items";
import { SuccessId, TYPEORM_ENTITYNOTFOUND } from "../types/errors";
import { ItemEditor } from "../services/jio";

export async function edit(
  request: Request<{ id: string }, {}, ItemPatchData, {}>,
  response: Response<SuccessId>
): Promise<void> {
  const { id } = request.params;
  const editData = request.body;

  try {
    const idInt = parseInt(id);
    if (!idInt) {
      response.status(400);
      return;
    }
    const order = await new ItemEditor().editItem(idInt, editData);

    response.status(200).json({ success: true, id: order.id });
  } catch (e) {
    switch (e.name) {
      case TYPEORM_ENTITYNOTFOUND:
        response.sendStatus(404);
        return;

      default:
        console.log(e);
        response.status(400).json({ success: false });
        return;
    }
  }
}
