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

var priceSchema = new mongoose.Schema({
    date: Date,
    currency_pair: String,
    price: Number
}, {collection: 'price_history'})
export var Price = mongoose.model('Price', priceSchema);