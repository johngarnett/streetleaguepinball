var express = require('express');
var https = require('https');
var fs = require('fs');
require('dotenv').load();

var router = require('./route/main');

require('dotenv').load();
const CREDENTIALS_FOLDER = process.env.CREDENTIALS_FOLDER;

//var opts = JSON.parse(fs.readFileSync(CREDENTIALS_FOLDER + '/https.opts.mnp.json'));
//var app = express(opts);
//
//app.use('/', router);
//
//https.createServer(opts, app).listen(443);

var app = express();
app.use('/', router);

const cert = {
    key: fs.readFileSync(CREDENTIALS_FOLDER + '/key.pem'),
    cert: fs.readFileSync(CREDENTIALS_FOLDER + '/cert.pem')
}
https.createServer(cert, app).listen(443);
