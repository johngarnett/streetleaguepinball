const fs = require('fs');
// const csv = require('../lib/csv');

// const mustache = require('mustache');

// const makeKey = require('../lib/make-key');
const venues = require('../model/venues');
const seasons = require('../model/seasons');
const matches = require('../model/matches');
const config = require('../config');
const IPR = require('../model/ratings');

const DATA_FOLDER = config.DATA_FOLDER;
const CURRENT_SEASON = process.argv[2] || config.CURRENT_SEASON;
const stem = DATA_FOLDER + '/' + CURRENT_SEASON + '/';

const season = seasons.get();
const Match = matches.Match;

var outText = '';

const nameSort = function(a, b) {
  return [a.name, b.name].sort()[0] === a.name ? -1 : 1;
}

function outputHandicapCSV(match) {
  var state = match.state;
  var venue = match.venue;

  var away_ipr = 0;
  var home_ipr = 0;

  var a = match.away.lineup;
  var h = match.home.lineup;
  a.sort(nameSort);
  h.sort(nameSort);

  const getIPR = (arr, i) => {
    if(!arr[i]) return 0;
    return arr[i].IPR || IPR.forName(arr[i].name) || 0;
  };

  // TODO: Add team sums to pregame view
  var nr = Math.max(a.length, h.length);
  var aNumSubs = 0;
  var hNumSubs = 0;
  var aSubsIPR = 0;
  var hSubsIPR = 0;
  for(var i = 0; i < nr; i++) {
    var aRank = getIPR(a, i);
    var hRank = getIPR(h, i);
    if (i < a.length && a[i].sub) {
      aNumSubs += 1;
      aSubsIPR += aRank;
    }
    if (i < h.length && h[i].sub) {
      hNumSubs += 1;
      hSubsIPR += hRank;
    }
    away_ipr += aRank;
    home_ipr += hRank;
  }
  var points = match.getPoints();

  // Week |	Homecoming | Visiting team | VNum Subs | VIPR SUBs | VIPR ROSTER | VIPR | Home team |	HNum Subs	| HIPR SUBs | HIPR ROSTER | HIPR | 
  // Vpts R1-R4	Vbonus	Vpts	Hpts R1-R4	HBonus	Hpts

  // console.log(`${match.key}, 0, ${match.away.key}, ${aNumSubs},  ${aSubsIPR}, ${away_ipr - aSubsIPR}, ${away_ipr}, ${match.home.key}, ${hNumSubs},  ${hSubsIPR}, ${home_ipr - hSubsIPR}, ${home_ipr}, ${points.away - points.bonus.away}, ${points.bonus.away}, ${points.away}, ${points.home - points.bonus.home}, ${points.bonus.home}, ${points.home}`);
  return `${match.key}, 0, ${match.away.key}, ${aNumSubs},  ${aSubsIPR}, ${away_ipr - aSubsIPR}, ${away_ipr}, ${match.home.key}, ${hNumSubs},  ${hSubsIPR}, ${home_ipr - hSubsIPR}, ${home_ipr}, ${points.away - points.bonus.away.participation}, ${points.bonus.away.participation}, ${points.away}, ${points.rounds[3].away}, ${points.home - points.bonus.home.participation}, ${points.bonus.home.participation}, ${points.home}, ${points.rounds[3].home}`;
}

for(k in season.teams) {
  const team = season.teams[k];
  const venue = venues.get(team.venue);
}

for(w in season.weeks) {
  var week = season.weeks[w];
  for(m in week.matches) {
    var season_match = week.matches[m];
    let match_key = season_match.match_key;
    var match = matches.get(match_key);
    let match_result = outputHandicapCSV(match)
    outText += match_result;
    outText += '\n';
    // console.log(`${match_result}`)
  }
}

console.log(outText)
fs.writeFileSync(stem + 'exported-match-results.csv', outText);

