var LEVEL_MAP = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4
};

var CONTRIBUTIONS_QUERY = [
  'query($login: String!, $from: DateTime!, $to: DateTime!) {',
  '  user(login: $login) {',
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
  '  }',
  '}'
].join('\n');

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
        variables: {
          login: 'ikarn-dev',
          from: from,
          to: to
        }
      })
    });

    if (!response.ok) {
      res.status(response.status).json({ error: 'github_api_error' });
      return;
    }

    var json = await response.json();

    if (json.errors || !json.data || !json.data.user) {
      res.status(502).json({ error: 'github_query_error' });
      return;
    }

    var collection = json.data.user.contributionsCollection;
    var calendar = collection.contributionCalendar;

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json({
      totalContributions: calendar.totalContributions,
      weeks: calendar.weeks.map(function (week) {
        return week.contributionDays.map(function (day) {
          return {
            count: day.contributionCount,
            level: LEVEL_MAP[day.contributionLevel] || 0,
            date: day.date
          };
        });
      }),
      stats: {
        commits: collection.totalCommitContributions,
        pullRequests: collection.totalPullRequestContributions,
        reviews: collection.totalPullRequestReviewContributions,
        issues: collection.totalIssueContributions
      }
    });
  } catch (_) {
    res.status(502).json({ error: 'github_fetch_failed' });
  }
};
