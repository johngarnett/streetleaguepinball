'use strict';

const fs = require('fs');
const DATA_FOLDER = require('../config').DATA_FOLDER;

const filename = process.argv[2] || './' + DATA_FOLDER + '/WPPR_PLAYERS.csv';

let raw = fs.readFileSync(filename).toString();

let lines = raw.split('\n');
for(let i = 0; i < lines.length; i++) {
  let x = lines[i].split(';');
  if(x && x.length > 2)
    console.log(`${x[1]} ${x[2].trim()},${x[0]}`);
}

//console.log(raw);
