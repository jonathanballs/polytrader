import * as express from "express";
import * as mongoose from "mongoose";
import * as multiparty from "multiparty";
import { loginRequired, loginRequiredApi } from "../auth/auth";
import UserModel from "../models/user";
import { servicesClient } from "../wrappers/services";
import services from "../wrappers/services";

const router = express.Router();
export default router;

router.get("/", (req, res) => {
    res.render("status/status", { services });
});
