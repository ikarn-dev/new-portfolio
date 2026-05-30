/**
 * GitHub Activity API
 * Fetches recent activity data: last commit time, recent/pinned repos with languages.
 * Deployed as a Vercel serverless function at /api/activity
 */

var ACTIVITY_QUERY = [
  'query($login: String!) {',
  '  user(login: $login) {',
  '    contributionsCollection {',
  '      contributionCalendar { totalContributions }',
  '      totalCommitContributions',
  '    }',
  '    repositories(first: 6, orderBy: {field: PUSHED_AT, direction: DESC}, ownerAffiliations: [OWNER, ORGANIZATION_MEMBER], isFork: false, privacy: PUBLIC) {',
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
  '  }',
  '}'
].join('\n');

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
      body: JSON.stringify({
        query: ACTIVITY_QUERY,
        variables: { login: 'ikarn-dev' }
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

    var user = json.data.user;
    var collection = user.contributionsCollection;

    var recentRepos = user.repositories.nodes || [];
    var lastPushedAt = recentRepos.length > 0 ? recentRepos[0].pushedAt : null;

    var pinnedRepos = user.pinnedItems.nodes || [];
    var displayRepos = pinnedRepos.length > 0 ? pinnedRepos : recentRepos;

    var repos = displayRepos.map(function (repo) {
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
    });

    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=86400');
    res.status(200).json({
      lastCommit: lastPushedAt,
      totalCommits: collection.totalCommitContributions,
      totalContributions: collection.contributionCalendar.totalContributions,
      repos: repos
    });
  } catch (_) {
    res.status(502).json({ error: 'github_fetch_failed' });
  }
};
