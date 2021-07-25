var fs = require('fs');

var _map = {};

require('dotenv').load();
const DATA_FOLDER = process.env.DATA_FOLDER;
const DATA_DIR = DATA_FOLDER + '/stats';

function load() {
  var list = fs.readdirSync(DATA_DIR);
  console.log("Stats load()... list.len:",list.length);
  for(i in list) {
    var pk = list[i];
    var raw = fs.readFileSync(DATA_DIR + '/' + pk);
    var json = JSON.parse(raw);
    _map[pk] = json;
  }
}

module.exports = {
  get: function(key) {
    return _map[key] || new Stats({ key: key });
  },
  set: function(key, value) {
    _map[key] = value;
    fs.writeFileSync(DATA_DIR + '/' + key, JSON.stringify(value,null,2));
  },
  all: function() {
    load(); //This shouldn't take long; and we don't want to have to restart the server just to refresh the stats.
    var all = [];
    for(k in _map) {
      all.push(_map[k]);
    }
    return all;
  }
};
