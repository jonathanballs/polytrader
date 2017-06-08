#!/usr/bin/env/ node

import * as express from 'express';
import * as http from 'http';
import * as socketio from 'socket.io';
import * as poloniex from 'poloniex.js';
import * as bodyParser from 'body-parser';

var verbose = false;
var port = 8080;
var app = express();
var server = http.createServer(app);
var io = socketio(server);

server.listen(port);
console.log("Polotrader running :)");
console.log(':: Listening on port ' + port);

app.set('view engine', 'pug')
app.use(bodyParser.urlencoded({ extended: true }));

// API key and secret
var p = new poloniex("DQ4HLF00-AKHKVSSI-P758MKYO-2BT9BJBE",
    "8dff019f2c5e5823af13d490e12310f1308fd758f8edd3041f665088997cfdc135e41ab2c911fcc7c90a8a90174ea4a314179a59e6b57450a6848ed3ba9bfc50");


// Serve the index file
app.get('/', function(req, res) {
    res.sendFile('index.html', { root: __dirname + "/../"});
});

// Get poloniex data
app.get('/portfolio', (req, res) => {
    p.returnCompleteBalances((err, data) => {
        var balances = []
        for (var key in data) {
            if (data.hasOwnProperty(key)) {
                if (data[key] > 0.0) {
                    balances.push({currency: key, balance: data[key]})
                }
            }
        }
        console.log(balances);
        res.render('portfolio', {err: err, balances: balances})
    });
});

app.post('/signup', (req, res) => {
    console.log(req.body.email);
    console.log(req.body.password1);
    console.log(req.body.password2);

    res.send("Thanks for your details :D");
});

// Serve static files at /static
app.use(express.static('lib'))
app.use(express.static('comp'))
app.use('/static', express.static('static'))

