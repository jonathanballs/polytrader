import * as mongoose from "mongoose";

const logSchema = new mongoose.Schema({
    accountID: mongoose.Schema.Types.ObjectId,
    date: Date,
    error: String,
    success: Boolean,
});

const logModel = mongoose.model("SyncLog", logSchema);

export default logModel;
