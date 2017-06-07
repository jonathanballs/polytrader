#!/usr/bin/env/ node

import * as express from 'express';
import * as http from 'http';
import * as socketio from 'socket.io';
import {Player, Projectile, Spectator, User} from './player';
import {consts} from './consts';

var verbose = false;
var port = 8080;
var app = express();
var server = http.createServer(app);
var io = socketio(server);

server.listen(port);
console.log("Polotrader running :)");
console.log(':: Listening on port ' + port);

// Serve the index file
app.get('/', function(req, res) {
    res.sendFile('index.html', { root: __dirname + "/../"});
});

// Serve static files at /static
app.use(express.static('lib'))
app.use(express.static('comp'))
app.use('/static', express.static('static'))

