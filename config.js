require('dotenv').load();

const config = {
  CREDENTIALS_FOLDER: process.env.CREDENTIALS_FOLDER ||  __dirname + '/credentials',
  DATA_FOLDER: process.env.DATA_FOLDER || __dirname + '/data',
  UPLOADS_FOLDER: process.env.UPLOADS_FOLDER || __dirname + '/data/uploads',
  CURRENT_SEASON: process.env.CURRENT_SEASON || 'season-13',
  CREDENTIALS_FOLDER: process.env.CREDENTIALS_FOLDER || './credentials',
  IFPA_API_KEY: process.env.IFPA_API_KEY,
  EMAIL_HOST: process.env.EMAIL_HOST,
  EMAIL_PORT: process.env.EMAIL_PORT,
  EMAIL_ADDRESS: process.env.EMAIL_ADDRESS,
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD,
  LEAGUE_ADMINS: (process.env.LEAGUE_ADMINS || "admin").split(',')
};

module.exports = config;
