const fs = require('fs');
var csv = require('../lib/csv');

'use strict';

const config = require('../config');
const DATA_FOLDER = config.DATA_FOLDER;
const CURRENT_SEASON = config.CURRENT_SEASON;
var stem = DATA_FOLDER + '/' + CURRENT_SEASON + '/';

var groups = {};

rows = csv.load(stem + 'groups.csv');
rows.forEach(row => {
  var group_key = row[0];
  groups[group_key] = {
    key: group_key,
    name: row[1],
    teams: [],
  };
  row.slice(2).forEach( team => {
    if (team != '') {
      groups[group_key].teams.push(team)
    }
  });
});

/*
{
  A: {
    key: 'A',
    name: 'SlingshotX  ',
    teams: [ 'BOC', 'CRA', 'CDC', 'DTP' ]
  },
  B: {
    key: 'B',
    name: 'PlungerX    ',
    teams: [ 'DND', 'DSV', 'DIH', 'ETB', 'HHS' ]
  },
  C: {
    key: 'C',
    name: 'FlipperX    ',
    teams: [ 'HWZ', 'KNR', 'LAS', 'LLK', 'RMS' ]
  },
  D: {
    key: 'D',
    name: 'BumperX     ',
    teams: [ 'JMF', 'NLT', 'OLD', 'CPO' ]
  },
  E: {
    key: 'E',
    name: 'TargetX     ',
    teams: [ 'PGN', 'PKT', 'PBR', 'RTR', 'SCN' ]
  },
  F: {
    key: 'F',
    name: 'SpinnerX    ',
    teams: [ 'SSS', 'SKP', 'SJK', 'SWL', 'TWC' ]
  }
}
*/

console.log(groups);

function getGroup(teamKey) {
  
}