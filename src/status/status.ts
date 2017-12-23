import * as express from "express";
import * as mongoose from "mongoose";
import * as multiparty from "multiparty";
import { loginRequired, loginRequiredApi } from "../auth/auth";
import PriceModel from "../models/price";
import UserModel from "../models/user";
import { servicesClient } from "../wrappers/services";
import services from "../wrappers/services";

const router = express.Router();
export default router;

router.get("/", (req, res) => {
    // Get currency information
    PriceModel.getCurrencyStats().then((currencies) => {
        res.render("status/status", { currencies, services });
    });
});
