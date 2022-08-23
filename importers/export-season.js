const fs = require('fs');
// const csv = require('../lib/csv');

// const mustache = require('mustache');

// const makeKey = require('../lib/make-key');
const venues = require('../model/venues');
const seasons = require('../model/seasons');
const config = require('../config');

const DATA_FOLDER = config.DATA_FOLDER;
const CURRENT_SEASON = process.argv[2] || config.CURRENT_SEASON;
const stem = DATA_FOLDER + '/' + CURRENT_SEASON + '/';

// const byName = (a,b) => [a.name, b.name].sort()[0] === a.name ? -1 : 1;

const season = seasons.get();
var outText = '';

for(k in season.teams) {
  const team = season.teams[k];
  const venue = venues.get(team.venue);
  var capt = team.captain
  var cocapt = team.co_captain
  team.roster.forEach( player => {
    if(player.name == capt) {
      const txt = team.captain + ',' + k + ',C'
      outText += txt
      outText += '\n'
    } else if(player.name == cocapt) {
      const txt = player.name + ',' + k + ',A'
      outText += txt
      outText += '\n'
    } else {
      const txt = player.name + ',' + k + ',P'
      outText += txt
      outText += '\n'
    }
  })
}

console.log(outText)
fs.writeFileSync(stem + 'exported-rosters.csv', outText);

