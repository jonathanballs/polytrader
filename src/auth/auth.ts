import * as express from "express";
import * as passport from "passport";
import * as passwordHasher from "password-hash";
import UserModel from "../models/user";
import Poloniex from "../wrappers/poloniex-wrapper";

const router = express.Router();

// TODO set redirect url
export function loginRequired(req, res, next) {
    // req["user"] is the user
    req.user ? next() : res.redirect("/auth/login?next=" + encodeURIComponent(req.originalUrl));
}
export function loginRequiredApi(req, res, next) {
    // req["user"] is the user
    req.user ? next() : res.status(401).send("Error: You are not signed into polytrader.");
}

export function superUserRequired(req, res, next) {
    // req["user"] is the user
    (req.user && req.user.isSuperUser)
        ? next()
        : res.redirect("/auth/login?next=" + encodeURIComponent(req.originalUrl));
}
export function superUserRequiredApi(req, res, next) {
    // req["user"] is the user
    (req.user && req.user.isSuperUser) ? next() : res.status(401).send("Error: You are not signed into polytrader.");
}


router.post("/signup", (req, res) => {

    // Check passwords are the same
    const email = req.body.email;
    const password1 = req.body.password1;
    const password2 = req.body.password2;
    if (password1 !== password2) {
        console.log(`User signed up with ${email} but passwords don"t match`);
        res.render("auth/signup",
            {
                formErrors: [
                    { param: "password1", msg: "Passwords do not match", value: "" },
                    { param: "email", value: email },
                ],
            },
        );

        return;
    }

    // Check for other errors
    req.checkBody("email", "Invalid email address").isEmail();
    req.checkBody("password1", "Your password is too short").len({ min: 6 });
    const errors = req.validationErrors();
    if (errors) {
        console.log(`User signed up with ${email} but there were validation errors`);
        res.render("auth/signup", { formErrors: errors });
        return;
    }

    // Check if user already exists otherwise create it.
    UserModel.findOne({ email }, (err, user) => {
        if (!user) {
            new UserModel({
                email,
                isSuperUser: false,
                loginTimestamp: Date.now(),
                passwordHash: passwordHasher.generate(password1),
                signupTimestamp: Date.now(),
            }).save((saveError, u) => {
                if (saveError) {
                    console.log("An error occured creating user ", email);
                    return;
                }
                req.logIn(u, () => res.redirect("/portfolio"));
                return;
            });
        } else {
            const emailError = [
                { param: "email", msg: "A user with this email already exists", value: email },
            ];
            res.render("auth/signup", { formErrors: emailError });
            return;
        }
    });
});

router.get("/logout", (req, res) => {
    req.logout();
    res.redirect("/");
});

router.get("/signup", (req, res) => {
    res.render("auth/signup");
});

router.get("/login", (req, res) => {
    res.render("auth/login");
});

router.post("/login", passport.authenticate(
    "local", { successRedirect: "/", failureRedirect: "/auth/login" }));

export default router;
