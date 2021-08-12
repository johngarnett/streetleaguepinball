const fs = require('fs');
var csv = require('../lib/csv');

const config = require('../config');
const DATA_FOLDER = config.DATA_FOLDER;
const CURRENT_SEASON = process.argv[2] || config.CURRENT_SEASON;
var stem = DATA_FOLDER + '/' + CURRENT_SEASON + '/';
const seasonNumber = CURRENT_SEASON.split('-')[1];//numeric part of "season-13"

/*
 * venues.csv is a list of venues in the form
 * FTB,Full Tilt Ballard
 * OLF,Olaf's
 * SHR,Shorty's
 * 
 * The following turns this two dimensional array,
 * into a map: key is 3 uppercase chars | value is the full name.
 */
let rows = csv.load(stem + 'venues.csv')
const venues = rows.reduce((venues, row) => {
  venues[row[0]] = row[1];
  return venues;
}, {});

/*
 * teams.csv is a list of teams in the form
 * NLT,OLF,Northern Lights,1
 * SJK,FTB,Soda Jerks,1
 *
 * We only care about columns 0,1 and 2.  Previously,
 * we honored column 3 as the division; but we are
 * doing away with that.  But to minimize code churn,
 * we'll keep the team's division, but always make it 0. 
 * 
 * The following turns the csv array into a map:
 * key is 3 uppercase chars | value is a team object.
 * The team object is initialized with an empty roster,
 * and an empty schedule.
 */
//FIRST, Load up the team data
rows = csv.load(stem + 'teams.csv');

var teams = {};
rows.forEach(row => {
  var team_key = row[0];
  teams[team_key] = {
    key: team_key,
    venue: row[1],
    name: row[2],
    roster: [],
    schedule: [],
    division: 0
  };
});

var pteams = {};
//ADDING PLAYOFF TEAMS to the map.
for(let i = 1; i < 13; i++) {
  let team_key = 'S' +i;
  pteams[team_key] = { key: team_key, name: 'Seed #' +i };
}

for(let i = 1; i < 9; i++) {
  let team_key = 'QF' +i;
  pteams[team_key] = { key: team_key, name: 'SF #' +i };
}

pteams['H45'] = { key: 'H45', name: 'SF 4 vs 5' };
pteams['H18'] = { key: 'H18', name: 'SF 1 vs 8' };
pteams['H36'] = { key: 'H36', name: 'SF 3 vs 6' };
pteams['H27'] = { key: 'H27', name: 'SF 2 vs 7' };

pteams['FN1'] = { key: 'FN1', name: 'Finalist #1' };
pteams['FN2'] = { key: 'FN2', name: 'Finalist #2' };
pteams['BR3'] = { key: 'BR3', name: 'Bronze #3' };
pteams['BR4'] = { key: 'BR4', name: 'Bronze #4' };

var labels = {};
var codes = {};
for(let i = 1; i < 20; i++) {
  labels[i] = 'WEEK ' + i;
  codes[i] = 'WK' + i;
}
//NOTE: These labels are for season 9.
//      Earlier seasons did not have a WC round.
//      Also, there are now 2 divisions.
labels[91] = 'Quarter Finals';
labels[92] = 'Semi Finals';
labels[93] = 'Finals & Bronze';

codes[91] = 'QF';
codes[92] = 'SF';
codes[93] = 'FNL';

codes['S'] = 'SCRM';

/*
 * rosters.csv is a list of players in the form
 * Alexa Philbeck,TWC,C
 * Algird Lisaius,SWL,P
 * Alicia Seftel,LLK,A
 * Allison McClure,SJK,P
 * Altwin Hawksford,PGN,P
 * 
 * Column 0 is the player name, column 1 is the team key,
 * column 2 is the enum {C - captain, A - assistant, P - player}
 */
rows = csv.load(stem + 'rosters.csv');

/* 
 * Previously we initialized the teams and populated each
 * with an empty roster array.  Here we are going to populate
 * that roster.  The roster is made up of objects with only
 * the player's name.
 */
rows.forEach(row => {
  if(row.length > 1) {
    let name = row[0];
    let team_key = row[1];
    if(team_key && team_key.length > 0 && teams[team_key]) {

      var team = teams[team_key];
      if(row[2] == 'C') team.captain = name;
      if(row[2] == 'A') team.co_captain = name;
      team.roster.push({
        name: name //,
      });
    }
  }
});

/*
 * matches.csv is a list of matches in the form
 * 1,20200203,DSV,ETB,GET
 * 1,20200203,CRA,KNR,FFD
 * 1,20200203,SWL,SJK,FTB
 * 1,20200203,BOC,PBR,AAB
 * 1,20200203,TWC,SSS,SHR
 * 
 * Column 0 is the week number
 * Column 1 is the date (YYYYMMDD)
 * Column 2 is the away/visiting team
 * Column 3 is the home team
 * Column 4 is the venue
 * 
 * We'll give each match a unique key with
 * mnp-{seasonNumber}-{away}-{home}-{venue}
 * 
 * Each team's schedule will be built up as an
 * array.  Each object describes the match
 * in terms of the team.
 */
rows = csv.load(stem + 'matches.csv');
var weeks = {};

/*
 * Load all the matches to create schedules.
 * Also, build up the 'weeks' array.
 */
rows.forEach(row => {
  let match = {
    key: 'mnp-' + seasonNumber + '-' +row[0]+ '-' +row[2]+ '-' +row[3],
    week: row[0],
    date: row[1],
    away: row[2],
    home: row[3],
    venue: row[4]
  };

  // I believe week 'S' indicates Scrimmage.
  if(match.week == 'S' || match.week > 0) {
    var home = teams[match.home];
    var away = teams[match.away];

    if(match.week > 90) {
      if(!home) {
        home = pteams[match.home];
        home.venue = 'TBD';
        home.schedule = [];
        home.isPlaceholder = true;
      }
      if(!away) {
        away = pteams[match.away];
        away.venue = 'TBD';
        away.schedule = [];
        away.isPlaceholder = true;
      }
    }

    home.schedule.push({
      match_key: match.key,
      week: match.week,
      date: match.date,
      side: 'vs',
      opp: {
        key: away.key,
        name: away.name
      }
    });
    away.schedule.push({
      match_key: match.key,
      week: match.week,
      date: match.date,
      side: '@',
      opp: {
        key: home.key,
        name: home.name
      }
    });

    var week = weeks[match.date];
    if(!week) {
      week = {
        n: match.week,
        label: labels[match.week],
        code: codes[match.week],
        // n: match.week < 91 ? match.week : pweeks[match.week],
        isPlayoffs: match.week > 90,
        date: match.date,
        matches: []
      };
      weeks[match.date] = week;
    }

    var venue = venues[match.venue];

    if(!venue) {
      console.warn('Venue not found:', match.venue, match.key);

      venue = venues[home.venue] || {
        key: 'TBD',
        name: 'To Be Determined',
      };

      // If the venue is still undefined, there will be an error below,
      // which is probably ok, because the matches.csv is not correct.
      console.warn('Using:', venue.name);
    }

    week.matches.push({
      match_key: match.key,
      away_key: away.key,
      away_name: away.name,
      away_linked: !away.isPlaceholder,
      home_key: home.key,
      home_name: home.name,
      home_linked: !home.isPlaceholder,
      venue: { key: venue.key, name: venue.name }
    });
  }
  else {
    let week = weeks[match.date];
    //Week is a special event.
    if(!week) {
      let venue = venues[teams[match.away].venue];
      week = {
        date: match.date,
        isSpecial: true,
        html: match.home, //Yeah, this and the next line look weird.
        venue: { key: home.venue, name: venue.name }
      };
      weeks[match.date] = week;
    }
  }
});

var list = [];

/*
 * This just goes through and converts all of the dates
 * to a friendlier format: 02/03/2021
 */
var keys = Object.keys(weeks);
for(let k in keys) {
  let week = weeks[keys[k]];

  var date = week.date;

  var year  = date.substring(0,4);
  var month = date.substring(4,6);
  var day   = date.substring(6,8);

  week.date = month+ '/' +day+ '/' +year;

  list.push(week);
}

/*
 * groups.csv is a list of matches in the form
 * A,SlingshotX  ,BOC,CRA,CDC,DTP,
 * B,PlungerX    ,DND,DSV,DIH,ETB,HHS,
 * C,FlipperX    ,HWZ,KNR,LAS,LLK,RMS,
 * D,BumperX     ,JMF,NLT,OLD,CPO,
 * E,TargetX     ,PGN,PKT,PBR,RTR,SCN,
 * F,SpinnerX    ,SSS,SKP,SJK,SWL,TWC,
 * 
 * 
 * Column 0 is the group key
 * Column 1 is the group name
 * Column 2... is the list of team keys
 * 
 * Only the standings and the team page need
 * to know about the groups
 */
var groups = {};

rows = csv.load(stem + 'groups.csv');
rows.forEach(row => {
  var group_key = row[0];
  groups[group_key] = {
    key: group_key,
    name: row[1],
    teams: [],
  };
  row.slice(2,20).forEach( team => {
    if (team != '') {
      groups[group_key].teams.push(team)
    }
  });
});


var season = {
  key: CURRENT_SEASON,
  teams: teams,
  weeks: list,
  groups: groups
};

fs.writeFileSync(`${stem}/season.json`, JSON.stringify(season,null,2));
