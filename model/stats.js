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

load();

module.exports = {
  get: function(key) {
    // console.log("stats.get("+key+")");
    return _map[key] || new Stats({ key: key });
  },
  set: function(key, value) {
    _map[key] = value;
    fs.writeFileSync(DATA_DIR + '/' + key, JSON.stringify(value,null,2));
  },
  // TODO: Setup a watch to refresh the list after util/compute-stats
  // Alternatively, just always load the list for each call.
  all: function() {
    var all = [];
    for(k in _map) {
      all.push(_map[k]);
    }
    return all;
  }
};
