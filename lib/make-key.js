'use strict';

const util = require('./util');

var playerNames = {
    "paul white wa": "paul white",
    "denton dickson": "denton dickson"
};

// We use a hash of the player name as the key. That presents a problem when
// a player's name changes.
function mappedName(name) {
    var lcName = name.trim().toLowerCase()
    var mapped = playerNames[lcName]
    if ( mapped === undefined ) {
        return lcName
    }
    return mapped
}
  
module.exports = (name) => util.digest(mappedName(name));
