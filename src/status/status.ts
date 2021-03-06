import * as child_process from "child_process";
import * as express from "express";
import * as mongoose from "mongoose";
import * as multiparty from "multiparty";
import * as process from "process";
import { loginRequired, loginRequiredApi } from "../auth/auth";
import PriceModel from "../models/price";
import UserModel from "../models/user";
import queue from "../tasks";
import { servicesClient } from "../wrappers/services";
import services from "../wrappers/services";

const router = express.Router();
export default router;

function execute(command, callback) {
    child_process.exec(command, (error, stdout, stderr) => { callback(stdout); });
}

router.get("/", (req, res) => {
    // These environment variables are created by travis and won't exist in dev
    // environments
    const commitHash = process.env.COMMIT_HASH;
    const buildTimestamp = process.env.BUILD_TIMESTAMP;

    PriceModel.getCurrencyStats().then((currencies) => {
        queue.inactiveCount("update-price-history", (err, queueLength) => {
            queue.inactiveCount("sync-account", (err1, userQueueLength) => {
                res.render("status/status", {
                    buildTimestamp,
                    commitHash,
                    currencies,
                    queueLength,
                    services,
                    userQueueLength,
                });
            });
        });
    });
});
