var LEVEL_MAP = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4
};

var GITHUB_LOGINS = ['ikarn-dev', 'Karan-OffPay'];

/**
 * Build a GraphQL query with aliases for multiple users.
 * e.g. user0: user(login: "ikarn-dev") { ... }
 *      user1: user(login: "Karan-OffPay") { ... }
 */
function buildQuery(logins) {
  var fragments = logins.map(function (login, i) {
    return [
      '  user' + i + ': user(login: "' + login + '") {',
      '    contributionsCollection(from: $from, to: $to) {',
      '      contributionCalendar {',
      '        totalContributions',
      '        weeks { contributionDays { contributionCount contributionLevel date } }',
      '      }',
      '      totalCommitContributions',
      '      totalPullRequestContributions',
      '      totalPullRequestReviewContributions',
      '      totalIssueContributions',
      '    }',
      '  }'
    ].join('\n');
  });

  return 'query($from: DateTime!, $to: DateTime!) {\n' + fragments.join('\n') + '\n}';
}

var CONTRIBUTIONS_QUERY = buildQuery(GITHUB_LOGINS);

/**
 * Merge contribution data from multiple users.
 * - Heatmap: sum counts per day, take max level
 * - Stats: sum all counters
 */
function mergeContributions(users) {
  var dayMap = {};
  var totalContributions = 0;
  var stats = { commits: 0, pullRequests: 0, reviews: 0, issues: 0 };

  users.forEach(function (user) {
    if (!user) return;
    var collection = user.contributionsCollection;
    var calendar = collection.contributionCalendar;

    totalContributions += calendar.totalContributions;
    stats.commits += collection.totalCommitContributions;
    stats.pullRequests += collection.totalPullRequestContributions;
    stats.reviews += collection.totalPullRequestReviewContributions;
    stats.issues += collection.totalIssueContributions;

    calendar.weeks.forEach(function (week) {
      week.contributionDays.forEach(function (day) {
        var level = LEVEL_MAP[day.contributionLevel] || 0;
        if (dayMap[day.date]) {
          dayMap[day.date].count += day.contributionCount;
          if (level > dayMap[day.date].level) {
            dayMap[day.date].level = level;
          }
        } else {
          dayMap[day.date] = {
            count: day.contributionCount,
            level: level,
            date: day.date
          };
        }
      });
    });
  });

  // Rebuild weeks structure from merged dayMap
  var sortedDays = Object.keys(dayMap).sort().map(function (date) { return dayMap[date]; });

  // Recalculate levels based on merged counts
  var maxCount = 0;
  sortedDays.forEach(function (d) { if (d.count > maxCount) maxCount = d.count; });
  if (maxCount > 0) {
    sortedDays.forEach(function (d) {
      var ratio = d.count / maxCount;
      if (d.count === 0) d.level = 0;
      else if (ratio <= 0.25) d.level = 1;
      else if (ratio <= 0.50) d.level = 2;
      else if (ratio <= 0.75) d.level = 3;
      else d.level = 4;
    });
  }

  // Group into weeks (7 days each)
  var weeks = [];
  for (var i = 0; i < sortedDays.length; i += 7) {
    weeks.push(sortedDays.slice(i, i + 7));
  }

  return {
    totalContributions: totalContributions,
    weeks: weeks,
    stats: stats
  };
}

module.exports = async function handler(req, res) {
  var year = parseInt(req.query.year, 10);
  var currentYear = new Date().getUTCFullYear();

  if (!year || year < 2022 || year > currentYear) {
    res.status(400).json({ error: 'invalid_year' });
    return;
  }

  if (!process.env.GITHUB_TOKEN) {
    res.status(503).json({ error: 'missing_config' });
    return;
  }

  var from = year + '-01-01T00:00:00Z';
  var to = year + '-12-31T23:59:59Z';

  try {
    var response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + process.env.GITHUB_TOKEN,
        'Content-Type': 'application/json',
        'User-Agent': 'ikarn-dev-portfolio'
      },
      body: JSON.stringify({
        query: CONTRIBUTIONS_QUERY,
        variables: { from: from, to: to }
      })
    });

    if (!response.ok) {
      res.status(response.status).json({ error: 'github_api_error' });
      return;
    }

    var json = await response.json();

    if (json.errors || !json.data) {
      res.status(502).json({ error: 'github_query_error' });
      return;
    }

    // Collect all user results (skip null users — e.g. if account doesn't exist)
    var users = GITHUB_LOGINS.map(function (_, i) {
      return json.data['user' + i] || null;
    }).filter(Boolean);

    if (users.length === 0) {
      res.status(502).json({ error: 'no_user_data' });
      return;
    }

    var merged = mergeContributions(users);

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json(merged);
  } catch (_) {
    res.status(502).json({ error: 'github_fetch_failed' });
  }
};
