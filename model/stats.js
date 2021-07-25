var fs = require('fs');

var _map = {};

const DATA_FOLDER = require('../config').DATA_FOLDER;
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

/*
 * The Team page displays stats for each player on the team.
 */
function Stats(obj) {
  this.key = obj.key;
  this.history = [];
  this.divisions = ['all', 'div-1', 'div-2'].map(id => ({
    id,
    pops: '0.000',
    num_matches: 0,
    ppm: '0.000',
    points: { won: 0, of: 0 }
  })).reduce((obj, div) => {
    obj[div.id] = div;
    return obj;
  }, {});
}

// Need to load here, because we render stats on the Team page (in addition to the stats page).
load();

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
