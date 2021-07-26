import { Router } from "express";
import auth from "./auth";
import users from "./users";
import jios from "./jios";
import orders from "./orders";
import items from "./items";

const routes = Router();

routes.use("/auth", auth);
routes.use("/users", users);
routes.use("/jios", jios);
routes.use("/orders", orders);
routes.use("/items", items);

export default routes;
