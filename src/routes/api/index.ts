import { Router } from "express";
import auth from "./auth";
import users from "./users";
import jios from "./jios";
import orders from "./orders";

const routes = Router();

routes.use("/auth", auth);
routes.use("/users", users);
routes.use("/jios", jios);
routes.use("/orders", orders);

export default routes;
