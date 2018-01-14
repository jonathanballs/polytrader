import * as bodyParser from "body-parser";
import * as ms from "connect-mongo";
import * as express from "express";
import * as session from "express-session";
import expressValidator = require("express-validator");
import * as fs from "fs";
import * as http from "http";
import * as https from "https";
import * as kue from "kue";
import * as moment from "moment";
import * as mongoose from "mongoose";
import * as passport from "passport";
import { Strategy } from "passport-local";
import * as passwordHasher from "password-hash";
import * as path from "path";
import * as process from "process";

import authRouter from "./auth/auth";
import UserModel from "./models/user";
import portfolioRouter from "./portfolio/portfolio";
import settingsRouter from "./settings/settings";
import statusRouter from "./status/status";
import "./tasks";
import queue from "./tasks";
import servicesList from "./wrappers/services";

// Connect to mongo
const MongoStore = ms(session);
mongoose.Promise = global.Promise;
const mongoUrl = `mongodb://${process.env.MONGO_USERNAME}:` +
    `${process.env.MONGO_PASSWORD}@db/polytrader?authSource=admin`;
mongoose.connect(mongoUrl, {useMongoClient: true })
.catch((err) => {
    console.log("Failed to authenticate with mongo at ", mongoUrl, err);
    process.exit(1);
});

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
const httpsPort = 8443;
const app = express();
let server = null;

// https or http
if (fs.existsSync("/certs/privkey.pem") && fs.existsSync("/certs/privkey.pem")) {

    const privateKey  = fs.readFileSync("/certs/privkey.pem", "utf8");
    const certificate = fs.readFileSync("/certs/fullchain.pem", "utf8");
    const credentials = { key: privateKey, cert: certificate };

    // Https server
    server = https.createServer(credentials, app);
    server.listen(httpsPort);

    // Http redirect
    http.createServer((req, res) => {
        res.writeHead(302, { Location: "https://" + req.headers.host + req.url });
        res.end();
    }).listen(port);

    console.log("Polytrader starting at " + new Date());
    console.log(":: Listening on ports " + port + " and " + httpsPort);
} else {
    server = http.createServer(app);
    server.listen(port);

    console.log("Polytrader starting at " + new Date());
    console.log(":: Listening on port " + port);
}

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

app.get("/favicon.ico", (req, res) => {
    res.sendFile("./static/images/favicon.ico", { root: "./" });
});

app.use((req, res, next) => {
    res.status(404).render("404"); // 404 handler
});

// Clear the queue
queue.inactive((err, ids) => {
    ids.forEach((id) => {
        kue.Job.get(id, (err1, job) => {
            if (err1) {
                console.log("Error killing job id ", id);
            } else {
                job.remove();
            }
        });
    });
});

// Check for accounts that haven"t been updated in five mins
setInterval(() => {
    const fiveMinutesAgo = moment(new Date()).subtract(5, "m").toDate();

    UserModel.find({
        "accounts.timestampLastSync": { $lt: fiveMinutesAgo },
    })
    .then((users) => users.forEach((u) => {
        u.accounts.filter((a) => a.timestampLastSync < fiveMinutesAgo)
                .forEach((a) => {

            queue.create("sync-account", {
                accountID: a._id,
                title: "Syncing " + a.service + " account for " + u.email,
            }).save((err) => {
                if (err) {
                    console.log("Error adding job to queue: ", err);
                }
            });

        });
    }));
}, 5000);

// Update currencies
const currencies = JSON.parse(fs.readFileSync("dist/currencies.json").toString());
let currencyIdx = Math.round(Math.random() * currencies.length - 1);

setInterval(() => {
    const c = currencies[currencyIdx % (currencies.length - 1)];
    queue.create("update-price-history", {
        currency: c,
        title: "Updating price history for " + c.symbol,
    }).save((err) => {
        if (err) {
            console.log("Error adding job to queue: ", err);
        }
    });

    currencyIdx++;
}, 4000);
