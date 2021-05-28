FROM node:16-alpine

WORKDIR /usr/src/app

# These should be part of docker compose, or passed on the docker run command line
ENV CREDENTIALS_FOLDER=/usr/src/data/x.credentials
ENV CURRENT_SEASON=season-13
ENV DATA_FOLDER=/usr/src/data
ENV IFPA_API_KEY=??
ENV LEAGUE_ADMINS=7199
ENV TEST_EMAIL_ADDRESS=??
ENV UPLOADS_FOLDER=/usr/src/data/uploads

COPY package*.json ./

RUN npm ci --only=production

COPY . .

EXPOSE 80 443
CMD ["node", "app.js"]

