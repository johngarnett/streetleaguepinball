FROM node:16-alpine

WORKDIR /usr/src/app

# These should be part of docker compose, or passed on the docker run command line
ENV LEAGUE_ADMINS=7199
ENV CURRENT_SEASON=season-13

COPY package*.json ./

RUN npm ci --only=production

COPY . .

EXPOSE 80
CMD ["node", "http.js"]

