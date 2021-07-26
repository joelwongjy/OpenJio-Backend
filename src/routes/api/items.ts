import { Router } from "express";
import { BearerTokenType } from "../../types/tokens";
import { checkBearerToken } from "../../middlewares/checkBearerToken";
import * as ItemController from "../../controllers/ItemController";

export const router = Router();

router.use(checkBearerToken(BearerTokenType.AccessToken));
router.patch("/:id", ItemController.edit);

export default router;
