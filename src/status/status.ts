import * as child_process from "child_process";
import * as express from "express";
import * as mongoose from "mongoose";
import * as multiparty from "multiparty";
import * as process from "process";
import { loginRequired, loginRequiredApi } from "../auth/auth";
import PriceModel from "../models/price";
import UserModel from "../models/user";
import { servicesClient } from "../wrappers/services";
import services from "../wrappers/services";

const router = express.Router();
export default router;

function execute(command, callback) {
    child_process.exec(command, (error, stdout, stderr) => { callback(stdout); });
}

router.get("/", (req, res) => {
    // Get currency information
    PriceModel.getCurrencyStats().then((currencies) => {
        execute("git rev-parse HEAD", (commitHash) => {
            execute("git --no-pager log -1 --format=%cd", (commitTime) => {
                res.render("status/status", { currencies, services, commitHash, commitTime });
            });
        });
    });
});
