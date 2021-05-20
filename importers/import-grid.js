'use strict';

const DATA_FOLDER = process.env.DATA_FOLDER;
const CURRENT_SEASON = process.env.CURRENT_SEASON;

// TODO: No more hard coded season nums!
require('../lib/csv').load(DATA_FOLDER + '/' + CURRENT_SEASON + '/roster-grid.csv')
  .filter(row => row[3] != '')
  .reduce((p, row) => {
    p.push(row.slice(2,5));   // C-D-E
    p.push(row.slice(7,10));  // H-I-J
    p.push(row.slice(12,15)); // M-N-O
    p.push(row.slice(17,20)); // Q-R-S
    return p;
  }, [])
  .filter(row => row[0] != '')
  .map(row => ([
    row[0].trim().toLowerCase(),
    ...row
  ].join(',')))
  .forEach(row => console.log(row));
