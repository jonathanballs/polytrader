// Mongoose models
import * as mongoose from 'mongoose';

var userSchema = new mongoose.Schema({
    email: String,
    loginTimestamp: Date,
    signupTimestamp: Date,
    poloniexAPIKey: String,
    poloniexAPISecret: String,
    passwordHash: String
});
export var User = mongoose.model('User', userSchema);
