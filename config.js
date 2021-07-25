require('dotenv').load();

const config = {
  CREDENTIALS_FOLDER: process.env.CREDENTIALS_FOLDER ||  __dirname + '/credentials',
  DATA_FOLDER: process.env.DATA_FOLDER || __dirname + '/data',
  UPLOADS_FOLDER: process.env.UPLOADS_FOLDER || __dirname + '/data/uploads',
  CURRENT_SEASON: process.env.CURRENT_SEASON || 'season-13',
  CREDENTIALS_FOLDER: process.env.CREDENTIALS_FOLDER || './credentials'
};

module.exports = config;
