var fs = require('fs');
var CONST = require('../constants');
var players = require('../model/players');
var util = require('../lib/util');
var Auth = require('../lib/auth');
const DATA_FOLDER = require('../config').DATA_FOLDER;

var list = players.all();

var sessions = [];
var files = fs.readdirSync(DATA_FOLDER + '/sessions');
for(i in files) {
//console.log(files[i]);
  var id = files[i];
  var fn = DATA_FOLDER + '/sessions/' + id;
  var raw = fs.readFileSync(fn);
  var obj = JSON.parse(raw);
  obj.id = id;
  obj.save = function() {
console.log("Saving session: " +this.id);
    var filename = DATA_FOLDER + '/sessions/' + this.id;
    var str = JSON.stringify({
      key: this.key,
      created_at: this.created_at
    });
    fs.writeFileSync(filename, str);
  };
  sessions.push(obj);
console.log(obj);
}

for(i in list) {
  var player = list[i];
  var old = player.key;
  var key = players.makeKey(player.name);

  if(old != key && old != CONST.ROOT) {
    var fn = DATA_FOLDER + '/players/' + old;
    if(util.fileExists(fn)) { fs.unlinkSync(fn); }
    player.key = key;

    var sh = Auth.shadows.get(old);
    Auth.shadows.set(key,sh);
    Auth.shadows.clear(old);

    var token = Auth.tokens.get(old);
    if(token) {
      Auth.tokens.set(key,token);
      Auth.tokens.clear(old);
    }

    //Fix the sessions, too.
    for(j in sessions) {
      var s = sessions[j];
      if(s.key == old) {
        s.key = key;
        s.save();
      }
    }

    player.save();
  }
}
