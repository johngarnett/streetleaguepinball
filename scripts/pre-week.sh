#!/bin/bash

export NVM_DIR="/root/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"  # This loads nvm

# TODO: It might be nice to get up to date on node version.
nvm use 6

LOG=/home/mnp/main/data/cronlog/pre-week.log

echo "Running Pre week:" `date` >> $LOG

# Roster updates are now done through the site, and 
# will be archived in the post-week script.

#cd /home/mnp/main
#node util/spawn-matches.js
#sh scripts/restart.sh

echo "We are no longer running this on the server!!"

# We will manually run spawn-matches.js locally, upload
# the resulting files, SSH into the server, stop/start 
# the docker container.
#
# We need an admin page that will allow us to do this
# through the web interface.
