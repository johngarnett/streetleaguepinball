var https = require('https');
var fs = require('fs');
var express = require('express');
var router = require('./route/main');
const config = require('./config');

const CREDENTIALS_FOLDER = config.CREDENTIALS_FOLDER;
const DATA_FOLDER = config.DATA_FOLDER;

//var opts = JSON.parse(fs.readFileSync(CREDENTIALS_FOLDER + '/https.opts.mnp.json'));
//var app = express(opts);
//
//app.use('/', router);
//
//https.createServer(opts, app).listen(443);

//Setup http -> https redirection
var app = express();
app.use('/', router);

const cert = {
  key: fs.readFileSync(CREDENTIALS_FOLDER + '/privkey.pem'),
  cert: fs.readFileSync(CREDENTIALS_FOLDER + '/cert.pem'),
  ca: fs.readFileSync(CREDENTIALS_FOLDER + '/chain.pem')
}
https.createServer(cert, app).listen(443);

var redirect = express();
redirect.use(function(req,res,next) {
  res.redirect("https://" + req.headers.host + req.url);
});
redirect.listen(80);

app.use(express.static(DATA_FOLDER + '/static'));
