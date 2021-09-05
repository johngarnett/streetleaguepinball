'use strict';

/**
  @param season Assumed to be the season format.
  @param matches key-match object
*/
module.exports = function(season, matches) {
  // TODO: Add season model validation/assertion.

  const teams = Object.keys(season.teams)
    .map(tk => {
      const team = season.teams[tk];
      return {
        key: team.key,
        name: team.name,
        wins: [],
        losses: [],
        ties: [],
        points: 0,
        division: team.division
      };
    })
    .reduce((map, team) => {
      map[team.key] = team;
      return map;
    }, {});

  function getGroupForTeam(teamKey) {
    const season = seasons.get(); //TODO Allow other seasons.
    for (const [key, value] of Object.entries(season.groups)) {
      if (value.teams.includes(teamKey)) {
        return value;
      }
    }
    return undefined;
  }

  season.weeks
    .filter(week => !week.isSpecial && !week.isPlayoffs)
    .reduce((list, week) => {
      week.matches.forEach(m => list.push(m.match_key));
      return list;
    }, [])
    // We have an array of all the matches in the schedule here.
    .map(key => matches.get(key))
    .filter(m => !!m) // Only matches that exist (because scheduled matches might not)
    .forEach(match => {
      const { home, away } = match;
      const hk = home.key;
      const ak = away.key;
      const hr = teams[hk];
      const ar = teams[ak];
      const p = match.getPoints();
      if (! match.isDone() ) {
        console.log("--------------match NOT done: ", ar.name, "-", p.home, "  ", hr.name, "-", p.away);
      } else {
        console.log("match done: ", ar.name, "-", p.home, "  ", hr.name, "-", p.away);
        if(p.home > p.away) {
          hr.wins.push(ak);
          ar.losses.push(hk);
        }
        else if(p.away > p.home) {
          ar.wins.push(hk);
          hr.losses.push(ak);
        }
        else {
          ar.ties.push(hk);
          hr.ties.push(ak );
          console.log("Tie between ", ar.name, " and ", hr.name);
        }
        hr.points += p.home;
        ar.points += p.away;
      }
    });

  //We need a 2 dim array: first index is the group, second index to the team within the group
  var standingsGroups = new Array();
  for (const [key, value] of Object.entries(season.groups)) {
    var teamsInGroup = new Array();
    value.teams.forEach( teamKey => {
      teamsInGroup.push(teams[teamKey]);
    });
    standingsGroups.push(teamsInGroup);
  }

  standingsGroups.forEach(group => {
    group.sort((a, b) => {
      // The addition of Tie changes the sorting calculation.
      // Win counts as 2
      // Tie counts as 1
      // Loss counts as 0
      const aWLT = (a.wins.length * 2) + (a.ties.length);
      const bWLT = (b.wins.length * 2) + (b.ties.length);

      if(aWLT > bWLT) { return -1; }
      if(bWLT > aWLT) { return  1; }
      //else need points tie-breaker.
      if(a.points > b.points) { return -1; }
      if(b.points > a.points) { return  1; }
      //else need head's up tie-breaker
      if(a.wins.indexOf(b.key) != -1) { return -1; }
      if(b.wins.indexOf(a.key) != -1) { return  1; }
      //else Teams did not play each other.
      //TODO: Record vs common opponents
      //TODO: else Points vs common
      return [a.name, b.name].sort()[0] === a.name ? -1 : 1;
    });
    group.forEach((team, i) => {
      team.n = i + 1;
    });
  });


  console.log(">>>>>>>>>>");
  console.log(standingsGroups);
  console.log("<<<<<<<<<<")
  return standingsGroups;
}
