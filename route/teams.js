const fs = require('fs');
const mustache = require('mustache');
const { Router } = require('express');
const router = Router();

const makeKey = require('../lib/make-key');
const venues = require('../model/venues');
const seasons = require('../model/seasons');
const matches = require('../model/matches'); //For standings
const stats = require('../model/stats');
const IPR = require('../model/ratings');
const { ROOT } = require('../constants');
const config = require('../config');

// TODO: Look into getSuggestions in the context of rosters.
//  There appears to be some match specific filtering built in
//  that should be abstracted out.
// const { getSuggestions } = require('../model/suggestions');

// TODO: It might be good to verify eligibility of a player to be added.
const getSuggestions = () => IPR.getNames();


const base = fs.readFileSync('./template/base.html').toString();

const byName = (a,b) => [a.name, b.name].sort()[0] === a.name ? -1 : 1;

const admins = [
  ROOT,
  // TODO: What bad happens if the env doesn't exist?
  // TODO: What if there are no admins (empty string)?
  // My guess is that the first call to teams.js would crash
  // the server.
  ...config.LEAGUE_ADMINS
];

router.use(function(req,res,next) {
  req.user.isLeagueAdmin = !!admins.find(k => k === req.user.key);
  next();
});

router.get('/teams',function(req,res) {
  const season = seasons.get();
  const template = fs.readFileSync('./template/teams.html').toString();

  const list = [];
  for(k in season.teams) {
    const team = season.teams[k];
    const venue = venues.get(team.venue);
    list.push({
      key: team.key,
      name: team.name,
      venue: venue ? venue.name : 'MISSING ' + team.venue,
    });
  }

  // sort by name
  list.sort(byName);

  const html = mustache.render(base,{
    title: 'Teams',
    teams: list
  },{
    content: template
  });

  res.send(html);
});

function getTeam(key) {
  const season = seasons.get(); //TODO Allow other seasons.
  const team = season.teams[key];
  return team;
}

function getGroup(groupKey) {
  const season = seasons.get(); //TODO Allow other seasons.
  return season.groups[groupKey]
}

function getTeamsInGroup(groupKey) {
  const group = getGroup(groupKey);
  return group.teams;
}

function getGroupForTeam(teamKey) {
  const season = seasons.get(); //TODO Allow other seasons.
  for (const [key, value] of Object.entries(season.groups)) {
    if (value.teams.includes(teamKey)) {
      return value;
    }
  }
  return undefined;
}

router.get('/teams/:team_id',function(req,res) {
  if(req.params.team_id==="BYE") {
    res.redirect('/teams');
    return;
  }
  
  console.log('GET team', req.params.team_id, req.user);
  const template = fs.readFileSync('./template/team.html').toString();

  //Does the team exist in the season.
  const team = getTeam(req.params.team_id);
  if(!team) { return res.redirect('/teams'); }

  const group = getGroupForTeam(team.key).name;
  const venue = venues.get(team.venue);
  const vname = venue ? venue.name : team.venue;

  let teamRating = 0;

  const lineup = team.roster.map(p => {
    const rating = IPR.forName(p.name) || 0;
    // TODO: Handle cases where rating == undefined, instead of default to 0.
    teamRating += parseInt(rating);

    const pk = makeKey(p.name); //TODO: UGLY makeKey call.
    // TODO: What divisions to show? Thinking either all or the div of the team.
    const ps = stats.get(pk).divisions.all;
    const pops = ps ? ps.points.won / ps.points.of : 0;
    return {
      key: pk,
      name: p.name,
      rating: rating,
      pops: ps.pops,
      points: ps.points.won,
      num_matches: ps.num_matches,
      ppm: ps.ppm
    };
  }).sort(byName);

  const weeks = team.schedule.map(w => {
    const isHome = w.side == 'vs';
    const match = matches.get(w.match_key);
    let result = null;
    if(match) {
      const points = match.getPoints();
      //result -> '(W|L) team.score - opp.score'
      if(match.isDone()) {
        if(points.home == points.away) {
          result = 'T'
        } else {
          result = isHome ?
            ((points.home > points.away) ? 'W' : 'L') :
            ((points.away > points.home) ? 'W' : 'L');
        }
      }
      else {
        result = 'R' + match.round;
      }
      result += ' ';
      const ts = isHome ? points.home : points.away;
      const os = isHome ? points.away : points.home;
      result += ts + '-' +os;
    }

    const [year, month, day] = [
      w.date.slice(0, 4),
      w.date.slice(4, 6),
      w.date.slice(6, 8),
    ];

    return {
      week: w.week,
      date: `${month}-${day}-${year}`,
      side: w.side,
      opp:  w.opp,
      key: w.match_key,
      result: result
    };
  });

  let teamHandicap = expectedHcp(teamRating, lineup);

  const html = mustache.render(base,{
    canAdd: req.user.isLeagueAdmin,
    canRemove: req.user.isLeagueAdmin,
    team_id: team.key,
    title: team.name,
    name: team.name,
    group: group,
    venue: vname,
    captain: team.captain,
    co_captain: team.co_captain,
    team_rating: teamRating,
    team_handicap: teamHandicap,
    roster: lineup,
    schedule: weeks,
    sugs: JSON.stringify(getSuggestions(), null, 2),
  }, {
    content: template
  });

  res.send(html);
});

router.post('/teams/:team_id/roster/add', function(req,res) {
  console.log('POST add', req.params, req.body);
  if(!req.user.isLeagueAdmin) {
    console.warn('No authorized to edit rosters:', req.user);
    // TODO: Include error msg with redirect
    res.redirect(`/teams/${req.params.team_id}`);
    return;
  }

  const team = getTeam(req.params.team_id);
  // TODO: It might be better to return a 500 or something, but since we
  //  are returning rendered html, that's not as good a model.
  if(!team) { return res.redirect('/teams'); }

  if(!req.body || !req.body.name || !req.body.role) {
    // TODO: redirect to /teams/:team_id, but with an error msg.
    console.log('Jacked up or missing body');
  }

  // TODO: Do we need to lookup the player in some way?
  //  If the player wasn't in the suggestions, it may be
  //  difficult to validate anyways.

  const { name, role } = req.body;

  switch(role) {
    case 'P':
      // No need to do anything special.
      break;
    case 'A':
      team.co_captain = name;
      break;
    case 'C':
      team.captain = name;
      break;
  }

  // Is the player already on the team?
  if(!team.roster.find(p => p.name === name)) {
    team.roster.push({ name });
  }

  seasons.get().save();

  // TODO: Redirect with a success msg (but first need to support messages)
  res.redirect(`/teams/${team.key}`);
});

router.post('/teams/:team_id/roster/remove', function(req,res) {
  console.log('POST remove', req.params, req.body);
  if(!req.user.isLeagueAdmin) {
    console.warn('No authorized to edit rosters:', req.user);
    // TODO: Include error msg with redirect
    res.redirect(`/teams/${req.params.team_id}`);
    return;
  }

  const team = getTeam(req.params.team_id);
  if(!team) { return res.redirect('/teams'); }

  if(!req.body || !req.body.key) {
    console.warn('Jacked up on roster/remove');
  }

  // Does the team even have this player?
  // TODO: This is a little funky, maybe cleanup/refactor
  const roster = team.roster.filter(p => makeKey(p.name) !== req.body.key);

  team.roster = roster;

  seasons.get().save();

  // TODO: Redirect with a success msg (but first need to support messages)
  res.redirect(`/teams/${team.key}`);
});

function iprForPlayer(player) {
  if (!player) {
    return 0;
  }
  if(Number.isFinite(player.IPR)) {
    return Math.max(1, player.IPR);
  }
  return Math.max(1, player.rating);
}

function expectedHcp(teamRating, lineup) {
  if(lineup.length == 10) {
    return Math.trunc((50-teamRating)/2);
  }

  lineup.sort((a, b) => iprForPlayer(b) - iprForPlayer(a));

  var teamIPR = 0;
  for(i in lineup) {
    var p = lineup[i];
    teamIPR += p.rating;
  }
  if(lineup.length == 9) {
    var p0 = iprForPlayer(lineup[0]);
    var p1 = iprForPlayer(lineup[1]);
    var p2 = iprForPlayer(lineup[2]);
    teamIPR += (p0 + p1 + p2)/3;
  }
  if(lineup.length == 8) {
    var p0 = iprForPlayer(lineup[0]);
    var p1 = iprForPlayer(lineup[1]);
    var p2 = iprForPlayer(lineup[2]);
    teamIPR += (p0 + p1 + p2)/3;
    var p3 = iprForPlayer(lineup[3]);
    var p4 = iprForPlayer(lineup[4]);
    var p5 = iprForPlayer(lineup[5]);
    teamIPR += (p3 + p4 + p5)/3;
  }

  return Math.trunc((50-teamIPR)/2);
}

module.exports = router;
