var express = require('express');
var router = express.Router();
var fs = require('fs');
var mustache = require('mustache');
const config = require('../config');
const DATA_FOLDER = config.DATA_FOLDER;
const UPLOADS_FOLDER = config.UPLOADS_FOLDER;

// TODO: This could probably be renamed to matches,
// or matches should be a folder that includes the parts of this router.

console.log("INIT MNP...");

// CONSTANTS AND LIBS
var CONST = require('../constants');
var util = require('../lib/util');
var ids = require('../lib/ids');

// MODELS
var machines = require('../model/machines');
var venues = require('../model/venues');
var matches = require('../model/matches');
const IPR = require('../model/ratings');
var players = require('../model/players');
var { getSuggestions } = require('../model/suggestions');

var base = fs.readFileSync('./template/base.html').toString();

router.get('/matches', function(req,res) {
// TODO: Change ALL console.log statements to either debug() or info() log calls.
console.log("GET /matches");
  var all = matches.all();

  var ukey = req.user.key || 'ANON';

//console.log("req.user:",req.user);
  var canCreate = CONST.ROOT == ukey;

  var template = fs.readFileSync('./template/matches.html').toString();
  var style    = fs.readFileSync('./template/matches.css').toString();

  var buf = {};

  for(i in all) {
    var m = all[i];
    var p = m.getPoints();
    //TODO: Handle wk == post season strings.
    var wk = m.week;
    if(wk == 'Scrimmage') wk = 'S';

    var week = buf[wk];
    if(!week) {
      week = {
        n: wk,
        boxes: []
      }
      buf[wk] = week;
    }
    week.boxes.push({
      key: m.key,
      name: m.name,
      away: m.away,
      home: m.home,
      points: p
    });
  }

  var nums = Object.keys(buf);
  // nums.sort(function(a,b) {
  //   var n1 = parseInt(a);
  //   var n2 = parseInt(b);
  //   return n1 > n2;
  // });

  var weeks = [];
  for(i in nums) {
    var n = nums[i];
    weeks.push(buf[n]);
  }

// console.log(weeks);

  var html = mustache.render(base,{
    redirect_url: '/matches',
    style: style,
    title: 'Matches',
    // matches: boxes,
    week_nums: nums,
    weeks: weeks,
    current: nums[nums.length - 1],
    canCreate: canCreate
  },{
    content: template
  });

  res.send(html);
});

router.get('/matches/:match_id.json',function(req,res) {
  var match = matches.get(req.params.match_id);
  res.json(match);
});

function sendCreate(res,errors) {
  var template = fs.readFileSync('./template/match_create.html').toString();

  var html = mustache.render(base,{
    title: 'Create Match',
    venues: venues.all(),
    errors: errors
  },{
    content: template
  });

  res.send(html);
}

router.get('/matches/create',function(req,res) {
  sendCreate(res);
});

router.get('/matches/reload',function(req,res) {
  matches.reload();
  res.redirect('/matches/');
});

router.get('/matches/spawn',function(req,res) {
  matches.reload();
  res.redirect('/matches/');
});

router.post('/matches/create',function(req,res) {
  console.log("POST /matches/create",req.body);

  var name = req.body.match_name || '';
  if(name.length == 0) {
    return sendCreate(res,"ERROR: You can't use an empty name.");
  }

  var key = req.body.match_key || '';
  if(key.length == 0) {
    //Make up a key from the name.
    key = name.trim().toLowerCase().replace(/ /g,'-').replace(/[^a-z0-9\-]/g,'');
    key = key + '-' + ids.create().substring(0,3);
  }

  // TODO: Try to determine the current week, if a season is in progress.
  //       There is a weird template issue where any S matches will take over the
  //       default panel.
  var week = req.body.match_week || 'S';

  var ukey = req.user.key;

  var away_name = req.body.away || "Away Team";
  var home_name = req.body.home || "Home Team";

  matches.create({
    ukey: ukey,
    week: week,
    name: name,
    key: key,
    venue: req.body.venue,
    away: { name: away_name },
    home: { name: home_name },
    type: req.body.type
  }, function(match) {

    // TODO If error, sendCreate with the error(s)

    console.log('CREATED:', match);
    res.redirect('/matches/'+key);
  });
});

router.post('/matches/:match_id/confirm',function(req,res) {
console.log("POST /matches CONFIRM...");
console.log(req.body);
  var match = matches.get(req.params.match_id);

  var side = false;

  if(match.state == CONST.PREGAME) {
    if(req.body.left) {
      side = 'away';
    }
    else if(req.body.right) {
      side = 'home';
    }
    match.confirmLineup({
      ukey: req.user.key,
      side: side
    }, function(err,m) {
      if(err) console.log(err);
      res.redirect('/matches/' +req.params.match_id);
    });
  }
  else {
    if(req.body.left) {
      side = 'left';
    }
    else if(req.body.right) {
      side = 'right';
    }
    match.confirmScores({
      ukey: req.user.key,
      side: side
    }, function(err,m) {
      if(err) console.log(err);
      res.redirect('/matches/' +req.params.match_id);
    });
  }
});

router.post('/matches/:match_id/ready',function(req,res) {
  console.log("POST /matches READY...");
  console.log(req.body);
  var match = matches.get(req.params.match_id);
  if(!match) { return res.redirect('/matches'); }

  var ukey = req.user.key;

  match.teamReady({
    side: req.body.team,
    ukey: req.user.key
  },function(err,m) {
    if(err) console.log(err);
    res.redirect('/matches/' +req.params.match_id);
  });

});

router.post('/matches/:match_id/picks',function(req,res) {
  var match = matches.get(req.params.match_id);
  if(!match) { return res.redirect('/matches'); }
  console.log("POST picks...");
  console.log(req.body);

  var state = req.body.state;
  delete req.body.state;
  var round = req.body.round;
  delete req.body.round;

  match.makePicks({
    ukey: req.user.key,
    picks: req.body,
    state: state,
    round: round
  }, function(errors,m) {
    if(errors) {
      console.log(errors);
      res.send(renderMatch({
        match: match,
        ukey: req.user.key,
        errors: errors
      }));
    }
    else {
      res.redirect('/matches/'+req.params.match_id);
    }
  });
});

router.get('/matches/:match_id/venue',function(req,res) {
  var match = matches.get(req.params.match_id);
  if(!match) { return res.redirect('/matches'); }

  var template = fs.readFileSync('./template/match_venue.html').toString();
  var head = fs.readFileSync('./template/match_head.html').toString();

  var ukey = req.user.key;

  //Either captain can edit.
  var auth = match.home.hasCaptain(ukey) ||
             match.away.hasCaptain(ukey);

  var points = match.getPoints();

  var list = [];
  for(i in match.venue.machines) {
    var mk = match.venue.machines[i];
    var m = machines.get(mk);
    if(!m) m = { key: mk, name: mk };
    list.push(m);
  }
  list.sort(function(a, b) {
    if(a.name === b.name) return 0; // This actually shouldn't happen!
    return [a.name, b.name].sort()[0] === a.name ? -1 : 1;
  });
  var awayEPts = expectedPoints(match.away.lineup);
  var homeEPts = expectedPoints(match.home.lineup);
  var expected_points_to_tie = (awayEPts + homeEPts)/2;
  var expected_points_to_tie_A = expected_points_to_tie - (expectedBonus(match.away.lineup) + expectedHcp(match.away.lineup));
  var expected_points_to_tie_H = expected_points_to_tie - (expectedBonus(match.home.lineup) + expectedHcp(match.home.lineup));

  var html = mustache.render(base, {
    redirect_url: '/matches/'+match.key+'/venue',
    title: match.venue.name,
    name: match.name,
    match_id: match.key,
    key: match.key,
    venue: match.venue.name,
    //machines: match.venue.machines,
    machines: list,
    away_team: match.away.name,
    away_bonus: points.bonus.away.participation,
    away_hcp: points.bonus.away.handicap,
    away_total: points.away,
    home_team: match.home.name,
    home_bonus: points.bonus.home.participation,
    home_hcp: points.bonus.home.handicap,
    home_total: points.home,
    expected_points_to_tie_A: expected_points_to_tie_A,
    expected_points_to_tie_H: expected_points_to_tie_A,
    rounds: points.rounds,
    canEdit: auth,
    sugs: JSON.stringify(machines.all())
  }, {
    head: head,
    content: template
  });
  res.send(html);
});

router.post('/matches/:match_id/venue/add',function(req,res) {
console.log("POST Match Venue ADD");
  var match = matches.get(req.params.match_id);
  if(!match) { return res.redirect('/matches'); }

  //TODO: machines.add({ key: mkey, name: mkey });

  match.addMachine({
    ukey: req.user.key,
    mkey: req.body.mkey
  },function(err,m) {
    res.redirect('/matches/'+req.params.match_id+ '/venue');
  });
});

router.post('/matches/:match_id/venue/remove',function(req,res) {
console.log("POST Match Venue REMOVE",req.params,req.body);
  var match = matches.get(req.params.match_id);
  if(!match) { return res.redirect('/matches'); }

  match.removeMachine({
    ukey: req.user.key,
    mkey: req.body.mkey
  },function(err,m) {
    res.redirect('/matches/'+req.params.match_id+ '/venue');
  });
});

router.get('/matches/:match_id/:side',function(req,res) {
  console.log("GET " +req.params.side+ " team for " +req.params.match_id);
  var match = matches.get(req.params.match_id);
  if(!match) { return res.redirect('/matches'); }

  var params = {
    ukey: req.user.key,
    match: match,
    redirect_url: '/matches/'+match.key+'/'+req.params.side
  };

  if(req.params.side == 'home') {
    params.team = match.home;
    params.label = 'Home';
  }
  else if(req.params.side == 'away') {
    params.team = match.away;
    params.label = 'Away';
  }
  else {
    return res.redirect('/matches/'+req.params.match_id);
  }
  // else fuk'd

  res.send(renderTeam(params));
});

function renderTeam(params) {
  var ukey = params.ukey;
  var match = params.match;
  var team = params.team;
  var perms = team.getPermissions(ukey);

  var template = fs.readFileSync('./template/match_team.html').toString();
  var head = fs.readFileSync('./template/match_head.html').toString();

  var points = match.getPoints();

  let teamRating = 0;
  var lineup = [];
  for(i in team.lineup) {
    var p = team.lineup[i];
    const rating = p.IPR || IPR.forName(p.name.trim()) || 0;
    // TODO: Handle cases where rating == undefined, instead of default to 0.
    teamRating += Math.max(1, parseInt(rating));

    lineup.push({
      key: p.key,
      name: p.name,
      num_played: p.num_played,
      sub: p.sub,
      rating
    });
  }

  let teamHandicap = expectedHcp(lineup);
  lineup.sort(function(a, b) {
    return [a.name, b.name].sort()[0] === a.name ? -1 : 1;
  });
  var awayEPts = expectedPoints(match.away.lineup);
  var homeEPts = expectedPoints(match.home.lineup);
  var expected_points_to_tie = (awayEPts + homeEPts)/2;
  var expected_points_to_tie_A = expected_points_to_tie - (expectedBonus(match.away.lineup) + expectedHcp(match.away.lineup));
  var expected_points_to_tie_H = expected_points_to_tie - (expectedBonus(match.home.lineup) + expectedHcp(match.home.lineup));

  var html = mustache.render(base,{
    redirect_url: params.redirect_url || '/matches/' + match.key,
    title: params.label + ' Team',
    name: match.name,
    team_rating: teamRating,
    team_handicap: teamHandicap,
    key: match.key, //TODO: Maybe change to match_id
    venue: match.venue.name,
    ukey: ukey,
    match_id: match.key,
    away_team: match.away.name,
    home_team: match.home.name,
    away_bonus: points.bonus.away.participation,
    away_hcp: points.bonus.away.handicap,
    home_bonus: points.bonus.home.participation,
    home_hcp: points.bonus.home.handicap,
    away_total: points.away,
    home_total: points.home,
    expected_points_to_tie_A: expected_points_to_tie_A,
    expected_points_to_tie_H: expected_points_to_tie_H,
    rounds: points.rounds,
    home_or_away: params.label.toLowerCase(),
    label: params.label,
    // team_name: team.name,
    team: team,
    captains: team.captains,
    lineup: lineup,
    ready: match.state == CONST.PREGAME && team.ready,
    canAdd: perms.canEdit, //Add a canAdd perm to the perms object?
    canEdit: perms.canEdit,
    canRemove: perms.canRemove,
    canBegin: !team.ready && match.state == CONST.PREGAME && perms.canEdit && team.lineup.length > 7,
    sugs: match.state == CONST.PREGAME ? JSON.stringify(getSuggestions([team.key]),null,2) : '[]'
  },{
    head: head,
    content: template
  });

  return html;
}

/* For league matches, we don't really need to be able to change team names.
   We can re-introduce this if we ever decide that it might be needed.
router.post('/matches/:match_id/:side',function(req,res) {
console.log("POST to " +req.params.side+ " team for " +req.params.match_id);
console.log(req.body);
  var match = matches.get(req.params.match_id);
  if(!match) { return res.redirect('/matches'); }

  var team;
  if(req.params.side == 'home') team = match.home;
  if(req.params.side == 'away') team = match.away;
  if(!team) { return res.redirect('/matches/'+req.params.match_id); }

  //TODO: Change to team.setName(), which handles the save.
  team.name = req.body.team_name || team.name;

  res.redirect('/matches/'+req.params.match_id);
});
*/

router.post('/matches/:match_id/players/remove',function(req,res) {
  console.log("POST REMOVE");
  var match = matches.get(req.params.match_id);
  if(!match) { return res.redirect('/matches'); }

  match.remove({
    ukey: req.user.key,
    key: req.body.key,
    team: req.body.team
  }, function(err, p) {
    if(err) {
      console.log(err);
    }
    console.log("Removed ",p);
    var t = req.body.team ? '/' + req.body.team : '';
    res.redirect('/matches/' +req.params.match_id+ t);
  });
});

router.post('/matches/:match_id/players/add',function(req,res) {
  console.log("POST matches ADD player");
  var match = matches.get(req.params.match_id);
  if(!match) { return res.redirect('/matches'); }

  match.add({
    ukey: req.user.key,
    name: req.body.name,
    team: req.body.team,
    want_captain: req.body.want_captain
  }, function(err, m) {
    if(err) {
      console.log(err);
    }
    //Win or lose, redirect back and it will show what happened.
    var t = req.body.team ? '/' + req.body.team : '';
    res.redirect('/matches/' +req.params.match_id+ t);
  });
});

router.get('/matches/:match_id',function(req,res) {
  //TODO: matches.get should be async to account for mongo.
  var match = matches.get(req.params.match_id);
  if(!match) { return res.redirect('/matches'); }

  var ukey = req.user.key || 'ANON';

  if(!match) { return res.redirect('/matches'); }

  var round = req.query.round || match.round;

  if(round > match.round) { return res.redirect('/matches/'+req.params.match_id); }

  res.send(renderMatch({
    match: match,
    ukey: ukey,
    round: round
  }));
});

function expectedBonus(lineup) {
  if(lineup.length == 9) {
    return 4;
  }
  if(lineup.length == 10) {
    return 9;
  }
  return 0;
} 

function expectedPoints(lineup) {
  var epts = 41;
  epts += expectedBonus(lineup);
  epts += expectedHcp(lineup);
  return epts;
}

function iprForPlayer(player) {
    if(Number.isFinite(player.IPR)) {
      return Math.max(1, player.IPR);
    }
    return Math.max(1, player.rating);
}

function expectedHcp(lineup) {
  lineup.sort((a, b) => b.rating - a.rating);

  var teamIPR = 0;
  for(i in lineup) {
    var p = lineup[i];
    teamIPR += iprForPlayer(p);
  }
  if(lineup.length < 10) {
    var p0 = iprForPlayer(lineup[0].IPR);
    var p1 = iprForPlayer(lineup[1].IPR);
    var p2 = iprForPlayer(lineup[2].IPR);
    teamIPR += (p0 + p1 + p2)/3;
  }
  if(lineup.length < 9) {
    var p3 = iprForPlayer(lineup[3].IPR);
    var p4 = iprForPlayer(lineup[4].IPR);
    var p5 = iprForPlayer(lineup[5].IPR);
    teamIPR += (p3 + p4 + p5)/3;
  }

  var handicap = Math.trunc((50-teamIPR)/2);
  handicap = Math.max(handicap, 0);
  handicap = Math.min(handicap, 15);
  return handicap;
}

function labelsFor(match, showCount) {
  //var venue = venues.get(match.venue);
  var venue = match.venue;

  var labels = {};
  for(i in match.home.lineup) {
    var x = match.home.lineup[i];
    var v = '';
    var np = x.num_played || 0;
    // if(match.state != CONST.PLAYING) {
    if(showCount) {
      if(np > 0) v = '(' +np+ ')';
    }
    if(v.length > 0) v += ' ';
    v += x.name;
    labels[x.key] = v;
  }
  for(i in match.away.lineup) {
    var x = match.away.lineup[i];
    var v = '';
    var np = x.num_played || 0;
    // if(match.state != CONST.PLAYING) {
    if(showCount) {
      if(np > 0) v = '(' +np+ ')';
    }
    if(v.length > 0) v += ' ';
    v += x.name;
    labels[x.key] = v;
  }
  for(i in venue.machines) {
    var x = venue.machines[i];
    var m = machines.get(x);
    var y = m ? m.name : x;
    labels[x] = y;
  }
  return labels;
}

const nameSort = function(a, b) {
  return [a.name, b.name].sort()[0] === a.name ? -1 : 1;
}

//Only need match and ukey for params. Optional: errors
function renderMatch(params) {
//console.log(params);
  var match = params.match;
  var ukey = params.ukey;
  var errors = params.errors;
  var state = match.state;
  params.round = params.round || match.round;
  if(params.round != match.round) {
    state = CONST.PLAYING;
  }
  //NOTE: getPickingTeam only applies to picking states
  var team = match.getPickingTeam(params.round);
  var team_name = '';
  if(team) team_name = team.name;

  console.log("renderMatch, requested round:",params.round,match.round,match.key,ukey,state,match.state);

  var round = match.getRound(params.round); // Defaults to match.round
  //console.log("round:",round);

  //NOTE: We should get the games for the round requested.
  var games = round.games;
  var num = games.length;
  var venue = match.venue;

  var labels = labelsFor(match);

  var template = 'Messed up!';

  //TODO: Decide if we can merge editable with the perms.
  var editable = false; //Only applies to picking.

  //Only needed in the case of DRAFTING. Maybe breaking this method!
  var rows = [];

  var perms = team ? team.getPermissions(ukey) : { canEdit: false };

  var away_ipr = 0;
  var home_ipr = 0;

  switch(state) {
    case CONST.TIE_BREAKER:
      template = fs.readFileSync('./template/tie_breaker.html').toString();
      games = JSON.stringify(games);
      editable = perms.canEdit;
      break;
    case CONST.PICKING:
      template = fs.readFileSync('./template/picking.html').toString();
      games = JSON.stringify(games);
      editable = perms.canEdit;
      break;
    case CONST.RESPONDING:
      template = fs.readFileSync('./template/responding.html').toString();
      games = JSON.stringify(games);
      editable = perms.canEdit;
      break;
    case CONST.PLAYING:
    case CONST.COMPLETE:
      template = fs.readFileSync('./template/playing.html').toString();
      games = JSON.stringify(games);
      break;
    case CONST.SCHEDULED:
      template = fs.readFileSync('./template/scheduled.html').toString();
      break;
    case CONST.PREGAME:
      template = fs.readFileSync('./template/pregame.html').toString();
      //TODO: We should sort the captains to the top.
      var a = match.away.lineup;
      var h = match.home.lineup;
      a.sort(nameSort);
      h.sort(nameSort);

      const getIPR = (arr, i) => {
        if(!arr[i]) return 0;
        return arr[i].IPR || IPR.forName(arr[i].name) || 0;
      };

      // TODO: Add team sums to pregame view
      var nr = Math.max(a.length, h.length);
      for(var i = 0; i < nr; i++) {
        var ac = i < a.length ?
          match.away.hasCaptain(a[i].key) ?
          '(c) ' : '' : '';
        var hc = i < h.length ?
          match.home.hasCaptain(h[i].key) ?
          '(c) ' : '' : '';
        var asub = i < a.length ?
          a[i].sub ? ' (SUB)' : '' : '';
        var hsub = i < h.length ?
          h[i].sub ? ' (SUB)' : '' : '';
        var aRank = getIPR(a, i);
        var hRank = getIPR(h, i);
        rows.push({
          away: i < a.length ? ac + a[i].name + asub : '',
          away_rank: aRank,
          home: i < h.length ? hc + h[i].name + hsub : '',
          home_rank: hRank
        });
        away_ipr += aRank;
        home_ipr += hRank;
      }
      break;
    default:
      template = "Unknown match state! " +match.state;
      break;
  }

  var head = fs.readFileSync('./template/match_head.html').toString();

  var points = match.getPoints();

//console.log(points);

  var order = match.getOrder(params.round);
  var left  = order[0];
  var right = order[1];

  var p = points.rounds[match.round-1] || points;

//console.log("p: ",p);

  var lineup = [];
  if(team) lineup = team.lineup;
  lineup.sort(nameSort);
  var awayEPts = expectedPoints(match.away.lineup);
  var homeEPts = expectedPoints(match.home.lineup);
  var expected_points_to_tie = (awayEPts + homeEPts)/2;
  var expected_points_to_tie_A = expected_points_to_tie - (expectedBonus(match.away.lineup) + expectedHcp(match.away.lineup));
  var expected_points_to_tie_H = expected_points_to_tie - (expectedBonus(match.home.lineup) + expectedHcp(match.home.lineup));

  var html = mustache.render(base, {
    title: 'Match',
    match: match, //TODO: Some params need to be calc'd, but most stuff is in match.
    name: match.name || match.key,
    venue: venue.name,
    num_players: match.players.length, //TODO: Deprecate this
    key: match.key, //TODO: We should always use match_id in templates.
    match_id: match.key, //Sometimes you need a different keyname.
    redirect_url: '/matches/'+match.key,
    players: match.players, //TODO: Deprecate this
    week: match.week,
    round: round.n, //ROUND, where is it used.
    step: match.step || 0,
    games: games,
    // singles: ????
    doubles: (num == 4),
    shared: round.n == 5, //ROUND, using again.
    machines: JSON.stringify(venue.machines),
    lineup: JSON.stringify(lineup),
    editable: editable,
    canAdd: ukey == CONST.ROOT,
    canDraft: ukey == CONST.ROOT,
    canBegin: ukey == CONST.ROOT && match.players.length >= 16,
    canRemove: ukey == CONST.ROOT,
    canJoin: true,
    rows: rows,
    home: match.home,
    away: match.away,
    team_name: team_name,
    away_team: match.away.name,
    away_bonus: points.bonus.away.participation,
    away_hcp: points.bonus.away.handicap,
    away_points: p.away,
    away_total: points.away,
    away_ipr,
    home_team: match.home.name,
    home_points: p.home,
    home_bonus: points.bonus.home.participation,
    home_hcp: points.bonus.home.handicap,
    home_total: points.home,
    expected_points_to_tie: expected_points_to_tie,
    expected_points_to_tie_A: expected_points_to_tie_A,
    expected_points_to_tie_H: expected_points_to_tie_H,
    home_ipr,
    finished: state == CONST.PLAYING && round.done,
    isLeftCaptain: left.hasCaptain(ukey),
    isRightCaptain: right.hasCaptain(ukey),
    left_confirmed: round.left_confirmed,
    right_confirmed: round.right_confirmed,
    errors: errors,
    // TODO: sugs can almost certainly be removed from here, because I'm
    // pretty sure it's not used in any of the templates in this route.
    // BUT...because of the lack of test coverage, I'm kind of scared to
    // just remove it without deeper investigation.
    sugs: IPR.getNames(),
    labels: JSON.stringify(labels),
    rounds: points.rounds
  }, {
    head: head,
    content: template
  });

  return html;
}

//TODO These are redundant with matches.js
var NUM_GAMES   = [4,7,7,4,3];
var NUM_PLAYERS = [4,2,2,4,4];
var NUM_SCORES  = [4,2,2,4,2];
var GAME_TYPES  = ['Doubles','Singles','Singles','Doubles','Shared Tie Breaker'];

router.get('/games/:key.:round.:n',function(req,res) {
  console.log("GET /games ",req.params);
  var ukey = req.user.key || 'ANON';  //TODO: have users.js set ANON
  var match = matches.get(req.params.key);
  if(!match) { return res.redirect('/'); }
  var round = req.params.round;
  var n = req.params.n ? parseInt(req.params.n) : 1;
  var game = match.getGame(round,n);
  if(!game) { return res.redirect('/matches/'+req.params.key); }
  var template = fs.readFileSync('./template/game.html').toString();
  var css = fs.readFileSync('./template/game.css').toString();
  var script = fs.readFileSync('./template/game.js').toString();
  var venue = match.venue;

  var editable = match.canReport({
    ukey: ukey,
    round: round,
    n: n
  });

  var labels = labelsFor(match);

  var stem = '/games/'+req.params.key+'.'+round+'.';

  var machine = machines.get(game.machine);
  machine = machine ? machine.name : game.machine;

  var order = match.getOrder(req.params.round);
  var left  = order[0];
  var right = order[1];

  // This hack deals with a season 10 rule change.
  if(match.round === 5) {
    left  = n > 1 ? match.away : match.home;
    right = n > 1 ? match.home : match.away;
  }

  //NOTE: left and right players are for if a game needs to be edited.

  left.lineup.sort(nameSort);
  right.lineup.sort(nameSort);
  venue.machines.sort(nameSort); // TODO: Move inside venue logic.

  var left_players = [];
  for(i in left.lineup) {
    //TODO: Filter invalid choices?
    left_players.push(left.lineup[i].key);
  }

  var right_players = [];
  for(i in right.lineup) {
    right_players.push(right.lineup[i].key);
  }

  var prev = n > 1 ? stem + (n-1) : null;
  var next = n < NUM_GAMES[round-1] ? stem + (n+1) : null;
  var html = mustache.render(base, {
    redirect_url: '/games/'+req.params.key+'.'+round+'.'+n,
    title: 'Game',
    style: css,
    name: match.name,
    key: match.key,
    week: match.week,
    round: round,
    n: game.n,
    doubles: (NUM_SCORES[round-1] == 4),
    shared: round == 5,
    game: JSON.stringify(game),
    machines: JSON.stringify(venue.machines),
    left_players: JSON.stringify(left_players),
    right_players: JSON.stringify(right_players),
    machine: machine,
    score_13: 0 + (game.score_1 || 0) + (game.score_3 || 0),
    score_24: 0 + (game.score_2 || 0) + (game.score_4 || 0),
    points_13: 0 + (game.points_1 || 0) + (game.points_3 || 0),
    points_24: 0 + (game.points_2 || 0) + (game.points_4 || 0),
    type: GAME_TYPES[round-1],
    editable: editable,
    prev: prev,
    next: next,
    labels: JSON.stringify(labels)
  }, {
    content: template,
    script: script
  });

  res.send(html);
});

router.post('/games/:key.:round.:n/report', function(req,res) {
  console.log("POST /games... ",req.params);
  console.log("req.type:", req.get('Content-Type'));

  var match = matches.get(req.params.key);
  var round = req.params.round;
  var n = req.params.n ? parseInt(req.params.n) : 0;

  if(!match) {
    return res.send("Unknown match: "+req.params.key);
  }

  match.reportScores({
    ukey:   req.user.key,
    round:  req.params.round,
    n:      req.params.n,
    update: req.body
  }, function(err,m) {
    if(err) {
      return res.send(err);
    }
    var game = m.getGame(round,n);
//    res.redirect('/games/'+req.params.key+'.'+req.params.round+'.'+req.params.n);
    res.json(game);
  });
});

router.get('/pics/:pid',function(req,res) {
  var filename = UPLOADS_FOLDER + '/' +req.params.pid;
  console.log("Stephen: " + filename);
  if(util.fileExists(filename)) {
    res.sendFile(filename, {});
  }
  else {
    res.send("NOT FOUND");
  }
});

module.exports = router;
