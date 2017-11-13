import * as bodyParser from "body-parser";
import * as ms from "connect-mongo";
import * as express from "express";
import * as session from "express-session";
import expressValidator = require("express-validator");
import * as http from "http";
import * as moment from "moment";
import * as mongoose from "mongoose";
import * as passport from "passport";
import { Strategy } from "passport-local";
import * as passwordHasher from "password-hash";
import * as path from "path";

import authRouter from "./auth/auth";
import UserModel from "./models/user";
import portfolioRouter from "./portfolio/portfolio";
import settingsRouter from "./settings/settings";
import statusRouter from "./status/status";
import "./tasks";
import queue from "./tasks";
import servicesList from "./wrappers/services";

const MongoStore = ms(session);
mongoose.Promise = global.Promise;
mongoose.connect("mongodb://db/polytrader", { useMongoClient: true });

// Local strategy to fetch user from database
passport.use(new Strategy({ usernameField: "email" }, (email, password, done) => {
    UserModel.findOne({ email }, (err, user) => {
        if (err) {
            return done(err);
        } else if (!user) {
            return done(null, false, { message: "Incorrect username." });
        } else if (!passwordHasher.verify(password, user.passwordHash)) {
            return done(null, false, { message: "Incorrect password." });
        }

        return done(null, user);
    });
}));

passport.serializeUser((user: any, done) => {
    done(null, user._id);
});
passport.deserializeUser((id, done) => {
    UserModel.findById(id, (err, u) => done(null, u));
});

const verbose = false;
const port = 8080;
const app = express();
const server = http.createServer(app);

server.listen(port);
console.log("Polytrader starting at " + new Date());
console.log(":: Listening on port " + port);

app.set("view engine", "pug");
app.set("views", path.join(__dirname, "/views"));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
    resave: false,
    saveUninitialized: false,
    secret: "TODO: make a secret key",
    store: new MongoStore({ mongooseConnection: mongoose.connection }),
}));
app.use(passport.initialize());
app.use(passport.session());
app.use("/static", express.static("static")); // Serve static files
app.use("/static", express.static("dist/static")); // Serve compiled static files
app.use(expressValidator());
app.use((req, res, next) => {
    res.locals.user = req.user;
    next();
});

app.use("/account", settingsRouter);
app.use("/auth", authRouter);
app.use("/portfolio", portfolioRouter);
app.use("/status", statusRouter);

app.get("/", (req, res) => {
    if (req.user) {
        // Logged in users get redirected to their portfolios
        res.redirect("/portfolio");
    } else {
        res.render("index");
    }
});

app.use((req, res, next) => {
    res.status(404).render("404"); // 404 handler
});

// Check for accounts that haven"t been updated in five mins
setInterval(() => {
    const fiveMinutesAgo = moment(new Date()).subtract(5, "m").toDate();

    UserModel.find({
        "accounts.timestampLastSync": { $lt: fiveMinutesAgo },
    })
        .then((users) => users.forEach((u) => {
            u.accounts.forEach((a) => {

                queue.create("sync-account", {
                    accountID: a._id,
                    title: "Syncing " + a.service + " account for " + u.email,
                }).save((err) => {
                    if (err) {
                        console.log("Error adding job to queue", err);
                    }
                });

            });
        }));
}, 5000);
