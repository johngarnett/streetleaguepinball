const fs = require('fs');
const DATA_FOLDER = require('../config').DATA_FOLDER

const csv = fs.readFileSync(DATA_FOLDER + '/IPR.csv')
  .toString()
  .split('\n')
  .filter(line => line.length > 0)
  .map(line => line.split(','));

const map = csv.reduce((m, row) => {
  const [ ipr, name ] = row;
  m[name.trim().toLowerCase()] = parseInt(ipr);
  return m;
}, {});

module.exports = {
  forName: name => name ? (map[name.trim().toLowerCase()] || 0) : 0,
  getNames: () => csv.map(row => row[1])
};
