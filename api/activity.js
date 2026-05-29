/**
 * GitHub Activity API — merged from multiple accounts
 * Fetches recent activity data: last commit time, recent/pinned repos with languages.
 * Deployed as a Vercel serverless function at /api/activity
 */

var GITHUB_LOGINS = ['ikarn-dev', 'Karan-OffPay'];

/**
 * Build a GraphQL query with aliases for multiple users.
 */
function buildQuery(logins) {
  var fragments = logins.map(function (login, i) {
    return [
      '  user' + i + ': user(login: "' + login + '") {',
      '    contributionsCollection {',
      '      contributionCalendar { totalContributions }',
      '      totalCommitContributions',
      '    }',
      '    repositories(first: 6, orderBy: {field: PUSHED_AT, direction: DESC}, ownerAffiliations: OWNER, isFork: false, privacy: PUBLIC) {',
      '      nodes {',
      '        name',
      '        nameWithOwner',
      '        description',
      '        url',
      '        pushedAt',
      '        primaryLanguage { name color }',
      '        stargazerCount',
      '      }',
      '    }',
      '    pinnedItems(first: 6, types: REPOSITORY) {',
      '      nodes {',
      '        ... on Repository {',
      '          name',
      '          nameWithOwner',
      '          description',
      '          url',
      '          pushedAt',
      '          primaryLanguage { name color }',
      '          stargazerCount',
      '        }',
      '      }',
      '    }',
      '  }'
    ].join('\n');
  });

  return 'query {\n' + fragments.join('\n') + '\n}';
}

var ACTIVITY_QUERY = buildQuery(GITHUB_LOGINS);

function mapRepo(repo) {
  return {
    name: repo.name,
    fullName: repo.nameWithOwner,
    description: repo.description || '',
    url: repo.url,
    language: repo.primaryLanguage ? repo.primaryLanguage.name : null,
    languageColor: repo.primaryLanguage ? repo.primaryLanguage.color : null,
    stars: repo.stargazerCount,
    pushedAt: repo.pushedAt
  };
}

module.exports = async function handler(req, res) {
  if (!process.env.GITHUB_TOKEN) {
    res.status(503).json({ error: 'missing_config' });
    return;
  }

  try {
    var response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + process.env.GITHUB_TOKEN,
        'Content-Type': 'application/json',
        'User-Agent': 'ikarn-dev-portfolio'
      },
      body: JSON.stringify({ query: ACTIVITY_QUERY })
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

    var totalCommits = 0;
    var totalContributions = 0;
    var lastCommit = null;
    var allRecentRepos = [];
    var allPinnedRepos = [];

    GITHUB_LOGINS.forEach(function (_, i) {
      var user = json.data['user' + i];
      if (!user) return;

      var collection = user.contributionsCollection;
      totalCommits += collection.totalCommitContributions;
      totalContributions += collection.contributionCalendar.totalContributions;

      var recentRepos = user.repositories.nodes || [];
      var pinnedRepos = user.pinnedItems.nodes || [];

      recentRepos.forEach(function (r) { allRecentRepos.push(r); });
      pinnedRepos.forEach(function (r) { allPinnedRepos.push(r); });

      // Track most recent push across all accounts
      if (recentRepos.length > 0) {
        var pushed = recentRepos[0].pushedAt;
        if (!lastCommit || pushed > lastCommit) {
          lastCommit = pushed;
        }
      }
    });

    // Sort all recent repos by pushedAt descending, take top 6
    allRecentRepos.sort(function (a, b) {
      return new Date(b.pushedAt) - new Date(a.pushedAt);
    });

    // Use pinned repos if available, otherwise recent
    var displayRepos = allPinnedRepos.length > 0 ? allPinnedRepos : allRecentRepos;
    var repos = displayRepos.slice(0, 6).map(mapRepo);

    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=86400');
    res.status(200).json({
      lastCommit: lastCommit,
      totalCommits: totalCommits,
      totalContributions: totalContributions,
      repos: repos
    });
  } catch (_) {
    res.status(502).json({ error: 'github_fetch_failed' });
  }
};
