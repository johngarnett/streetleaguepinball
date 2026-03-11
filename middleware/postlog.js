var express = require('express');
var fs = require('fs');
var util = require('../lib/util');
var matches = require('../model/matches');
var CONST = require('../constants');

var router = express.Router();

const config = require('../config');
const DATA_FOLDER = config.DATA_FOLDER;
const UPLOADS_FOLDER = config.UPLOADS_FOLDER;

//NOTE: By placing this middleware AFTER the users middleware,
//	all the login, logout, and signup routes will be
//	handled before this, which is nice to avoid
//	logging passwords in the log.

console.log("Loaded postlog.js");

// Capture the match info when available.

router.post('/matches/:match_id/*', function(req, res, next) {
   var match = matches.get(req.params.match_id);

   if (match) {
      req._match = match;
   }
   next();
});

// Note when both lineups are ready and confirmed. This handler runs before
// the one that updates the match to reflect the final confirmation.

router.post('/matches/:match_id/confirm', function(req, res, next) {
   var match = req._match;

   if (req.body && match && (match.state == CONST.PREGAME) && match.away && match.home && match.away.ready && match.home.ready) {
      req._confirmed = (match.home.confirmed && req.body.right) || (match.away.confirmed && req.body.left);
   } else {
      req._confirmed = false;
   }
   next();
});

//I also want to log ALL POST operations to a file.
router.post('/*',function(req,res,next) {
  console.log("RECORDING POST....");

  //TODO: Semi weird to do this photo scrubbing here,
  //	  but I'm just moving the data so that we don't
  //      dump a bunch of junk. We could also intercept
  //      a standardized convention for photos and save
  //      them to a cache, and attach the filename to
  //      the req.

  if(req.body.photo_data) {
    console.log("Saving photo data ...");
    var x = req.body.photo_data;
    var sha = util.digest(x);
    var fn = UPLOADS_FOLDER + '/' +sha;
    if(!util.fileExists(fn)) {
      fs.writeFileSync(fn,x);
      console.log(" ... saved " +fn+ " " +x.length+ " bytes");
    }
    else console.log("Already have " +fn);
    req.body.photo_data = sha;
  }
  else console.log("No photo data");

  var data = {
    path: req.path,
    body: req.body,
    when: Date.now(),
    user_id: req.user.id,
    ukey: req.user.key
  };

  emit(req, data);

  if (req._match && req._confirmed) {
     const match = req._match;

     emit(req, {
        when: Date.now(),
        body: {
           venue: match.venue,
           away: match.away.lineup,
           home: match.home.lineup
        }
     });
  }

  next();

  function emit(req, data) {
     var combined = data;

     if (req._match) {
        const match = req._match;
        const matchInfo = {
           match: {
              key: match.key,
              state: match.state,
              round: match.round
           }
        };

        console.log(match); // DEBUG

        combined = {...data, ...matchInfo};
     }
     var chunk = JSON.stringify(combined, null, 2);
     var id = util.digest(chunk);

     fs.writeFileSync(DATA_FOLDER + '/posts/' + id, chunk);
  }
});

module.exports = router;
