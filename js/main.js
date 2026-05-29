/**
 * Click-to-copy email
 */
function initEmailCopy() {
  var btn = document.getElementById('copy-btn');
  var status = document.getElementById('copy-status');
  if (!btn) return;

  btn.addEventListener('click', function () {
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      if (status) status.textContent = 'Clipboard copy is not available in this browser.';
      return;
    }

    navigator.clipboard.writeText('ikarn.dev@gmail.com').then(function () {
      btn.textContent = 'copied!';
      if (status) status.textContent = 'Email address copied to clipboard.';
      setTimeout(function () {
        btn.textContent = 'copy';
      }, 1500);
    }).catch(function () {
      if (status) status.textContent = 'Unable to copy email address.';
    });
  });
}

/**
 * Dark mode toggle
 */
function initThemeToggle() {
  var toggle = document.getElementById('theme-toggle');
  if (!toggle) return;

  var saved = localStorage.getItem('theme');
  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  var isDark = saved ? saved === 'dark' : prefersDark;

  if (isDark) {
    document.documentElement.setAttribute('data-theme', 'dark');
    toggle.textContent = 'light';
  }

  toggle.addEventListener('click', function () {
    document.body.classList.add('theme-transitioning');
    var current = document.documentElement.getAttribute('data-theme');
    if (current === 'dark') {
      document.documentElement.removeAttribute('data-theme');
      toggle.textContent = 'dark';
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      toggle.textContent = 'light';
      localStorage.setItem('theme', 'dark');
    }
    setTimeout(function () {
      document.body.classList.remove('theme-transitioning');
    }, 350);
  });
}

/**
 * Project category filtering
 */
function initProjectFilters() {
  var filterBtns = document.querySelectorAll('.filter-btn');
  var projectCards = document.querySelectorAll('.project-card');

  if (!filterBtns.length || !projectCards.length) return;

  filterBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      filterBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');

      var filterValue = btn.getAttribute('data-filter');

      projectCards.forEach(function (card) {
        if (filterValue === 'all') {
          card.classList.remove('hidden');
        } else {
          if (card.getAttribute('data-category') === filterValue) {
            card.classList.remove('hidden');
          } else {
            card.classList.add('hidden');
          }
        }
      });
    });
  });
}

/**
 * GitHub Contributions Heatmap
 * - Prefetches current year on script load (before DOM ready)
 * - Caches in sessionStorage (1 hour TTL)
 * - Smart tooltip positioning to avoid edge cropping
 */
var heatmapState = { activeYear: null, requestId: 0 };
var CACHE_TTL = 3600000;
var GITHUB_LOGINS = ['ikarn-dev', 'Karan-OffPay'];
var LEVEL_MAP = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };
var CONTRIBUTIONS_QUERY = 'query($from: DateTime!, $to: DateTime!) {\n' +
  GITHUB_LOGINS.map(function (login, i) {
    return '  user' + i + ': user(login: "' + login + '") {\n' +
      '    contributionsCollection(from: $from, to: $to) {\n' +
      '      contributionCalendar {\n' +
      '        totalContributions\n' +
      '        weeks { contributionDays { contributionCount contributionLevel date } }\n' +
      '      }\n' +
      '      totalCommitContributions\n' +
      '      totalPullRequestContributions\n' +
      '      totalPullRequestReviewContributions\n' +
      '      totalIssueContributions\n' +
      '    }\n' +
      '  }';
  }).join('\n') + '\n}';
var twitterScriptPromise = null;

function getCacheKey(year) { return 'gh_contrib_' + year; }

function getCachedData(year) {
  try {
    var raw = sessionStorage.getItem(getCacheKey(year));
    if (!raw) return null;
    var cached = JSON.parse(raw);
    if (Date.now() - cached.timestamp > CACHE_TTL) {
      sessionStorage.removeItem(getCacheKey(year));
      return null;
    }
    return cached.data;
  } catch (_) { return null; }
}

function setCachedData(year, data) {
  try {
    sessionStorage.setItem(getCacheKey(year), JSON.stringify({
      timestamp: Date.now(),
      data: data
    }));
  } catch (_) { /* silently ignore */ }
}

function isLocalPreview() {
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
}

function getLocalGitHubToken() {
  if (typeof window.GITHUB_TOKEN === 'string' && window.GITHUB_TOKEN) {
    return window.GITHUB_TOKEN;
  }

  try {
    return localStorage.getItem('github_token') || '';
  } catch (_) {
    return '';
  }
}

function normalizeContributionData(json) {
  var dayMap = {};
  var totalContributions = 0;
  var stats = { commits: 0, pullRequests: 0, reviews: 0, issues: 0 };

  GITHUB_LOGINS.forEach(function (_, i) {
    var user = json.data['user' + i];
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
          if (level > dayMap[day.date].level) dayMap[day.date].level = level;
        } else {
          dayMap[day.date] = { count: day.contributionCount, level: level, date: day.date };
        }
      });
    });
  });

  // Recalculate levels based on merged counts
  var sortedDays = Object.keys(dayMap).sort().map(function (d) { return dayMap[d]; });
  var maxCount = 0;
  sortedDays.forEach(function (d) { if (d.count > maxCount) maxCount = d.count; });
  if (maxCount > 0) {
    sortedDays.forEach(function (d) {
      var r = d.count / maxCount;
      if (d.count === 0) d.level = 0;
      else if (r <= 0.25) d.level = 1;
      else if (r <= 0.50) d.level = 2;
      else if (r <= 0.75) d.level = 3;
      else d.level = 4;
    });
  }

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

function fetchServerContributions(year) {
  return fetch('/api/contributions?year=' + year, {
    headers: {
      'Accept': 'application/json'
    }
  })
    .then(function (res) {
      if (!res.ok) {
        var err = new Error('API error');
        err.status = res.status;
        throw err;
      }
      return res.json();
    });
}

function fetchBrowserContributions(year, token) {
  var from = year + '-01-01T00:00:00Z';
  var to = year + '-12-31T23:59:59Z';

  return fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: CONTRIBUTIONS_QUERY,
      variables: {
        from: from,
        to: to
      }
    })
  })
    .then(function (res) {
      if (!res.ok) {
        var err = new Error('GitHub API error');
        err.status = res.status;
        throw err;
      }
      return res.json();
    })
    .then(function (json) {
      if (json.errors || !json.data) {
        throw new Error('GitHub query error');
      }
      return normalizeContributionData(json);
    });
}

function fetchContributions(year) {
  var cached = getCachedData(year);
  if (cached) return Promise.resolve(cached);

  return fetchServerContributions(year)
    .catch(function (err) {
      if ((err.status === 404 || err.status === 503) && isLocalPreview()) {
        var token = getLocalGitHubToken();
        if (token) {
          return fetchBrowserContributions(year, token);
        }
        err.code = 'local_preview_needs_token';
      }
      throw err;
    })
    .then(function (json) {
      setCachedData(year, json);
      return json;
    });
}

/* Prefetch — fires immediately on script load, before DOM ready */
(function () {
  var y = new Date().getFullYear();
  if (!getCachedData(y)) {
    fetchContributions(y).catch(function () {});
  }
})();

function initGitHubHeatmap() {
  var container = document.getElementById('github-heatmap');
  if (!container) return;

  var currentYear = new Date().getFullYear();
  loadContributions(currentYear);
}


function setHeatmapPanelState(mode, message) {
  var panel = document.getElementById('heatmap-panel');
  var status = document.getElementById('heatmap-status');
  if (!panel || !status) return;

  panel.classList.remove('is-loading', 'is-error');

  if (!mode) {
    status.hidden = true;
    status.textContent = '';
    panel.setAttribute('aria-busy', 'false');
    return;
  }

  panel.classList.add(mode === 'loading' ? 'is-loading' : 'is-error');
  panel.setAttribute('aria-busy', mode === 'loading' ? 'true' : 'false');
  status.textContent = message || '';
  status.hidden = false;
}

function loadContributions(year) {
  var container = document.getElementById('github-heatmap');
  var statsEl = document.getElementById('heatmap-stats');
  if (!container) return;

  var requestId = ++heatmapState.requestId;
  setHeatmapPanelState('loading', 'Loading contributions...');

  if (!container.children.length) {
    container.innerHTML = '<div class="heatmap-loading">loading...</div>';
  }

  if (statsEl && !statsEl.children.length) {
    renderStats({
      commits: 0,
      pullRequests: 0,
      reviews: 0,
      issues: 0
    }, statsEl);
  }

  fetchContributions(year)
    .then(function (data) {
      if (requestId !== heatmapState.requestId) return;

      renderHeatmap(data, container);
      if (statsEl && data.stats) renderStats(data.stats, statsEl);
      setHeatmapPanelState(null);
    })
    .catch(function (err) {
      if (requestId !== heatmapState.requestId) return;

      var message = err.status === 503 ? 'missing config' : 'unable to load';

      if (err.code === 'local_preview_needs_token') {
        message = 'run with vercel dev or set localStorage.github_token';
      }

      if (!container.querySelector('.heatmap-cell')) {
        container.innerHTML = '<div class="heatmap-loading">' + message + '</div>';
        setHeatmapPanelState('error', message);
        return;
      }

      setHeatmapPanelState('error', message);
    });
}

function initSkillsLayout() {
  var wrap = document.querySelector('.skills-grid-wrap');
  var grid = wrap && wrap.querySelector('.skills-grid');
  if (!wrap || !grid) return;

  function applySkillsScale() {
    grid.style.transform = '';
    grid.style.transformOrigin = '';
    wrap.style.height = '';
    wrap.style.overflow = '';

    if (window.innerWidth > 600) return;

    var availableWidth = wrap.clientWidth;
    var naturalWidth = grid.scrollWidth;
    var naturalHeight = grid.scrollHeight;

    if (!availableWidth || !naturalWidth) return;

    var scale = Math.min(1, availableWidth / naturalWidth);

    if (scale < 1) {
      grid.style.transform = 'scale(' + scale + ')';
      grid.style.transformOrigin = 'top center';
      wrap.style.height = Math.ceil(naturalHeight * scale) + 'px';
      wrap.style.overflow = 'hidden';
    }
  }

  applySkillsScale();
  window.addEventListener('resize', applySkillsScale);
}

function initTwitterEmbeds() {
  var target = document.querySelector('.achievement-tweet');
  if (!target) return;

  function hydrateTwitter() {
    if (window.twttr && window.twttr.widgets && typeof window.twttr.widgets.load === 'function') {
      window.twttr.widgets.load(target);
    }
  }

  if (window.twttr && typeof window.twttr.ready === 'function') {
    window.twttr.ready(function () {
      hydrateTwitter();
    });
    return;
  }

  if (!twitterScriptPromise) {
    twitterScriptPromise = new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = 'https://platform.twitter.com/widgets.js';
      script.async = true;
      script.charset = 'utf-8';
      script.onload = resolve;
      script.onerror = reject;
      document.body.appendChild(script);
    });
  }

  twitterScriptPromise
    .then(function () {
      if (window.twttr && typeof window.twttr.ready === 'function') {
        window.twttr.ready(function () {
          hydrateTwitter();
        });
        return;
      }
      hydrateTwitter();
    })
    .catch(function () {});
}

function renderStats(stats, container) {
  container.innerHTML = '';
  var items = [
    { value: stats.commits, label: 'commits' },
    { value: stats.pullRequests, label: 'PRs' },
    { value: stats.reviews, label: 'reviews' },
    { value: stats.issues, label: 'issues' }
  ];
  items.forEach(function (item) {
    var el = document.createElement('div');
    el.className = 'heatmap-stat-item';
    el.innerHTML =
      '<span class="heatmap-stat-value">' + (item.value || 0) + '</span>' +
      '<span class="heatmap-stat-label">' + item.label + '</span>';
    container.appendChild(el);
  });
}

function renderHeatmap(data, container) {
  container.innerHTML = '';
  if (!data.weeks || !data.weeks.length) {
    container.innerHTML = '<div class="heatmap-loading">no data</div>';
    return;
  }

  var monthsEl = document.getElementById('heatmap-months');
  var monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  if (monthsEl) {
    monthsEl.innerHTML = '';
  }

  var totalWeeks = data.weeks.length;
  var prevMonth = -1;

  data.weeks.forEach(function (week, wi) {
    var firstDay = week[0];
    var currentMonth = firstDay ? parseInt(firstDay.date.split('-')[1], 10) : prevMonth;
    var isNewMonth = currentMonth !== prevMonth;
    var needsMonthGap = wi > 0 && isNewMonth;

    if (monthsEl) {
      var monthSlot = document.createElement('div');
      monthSlot.className = 'heatmap-month-slot';
      if (needsMonthGap) monthSlot.classList.add('month-start');

      if (isNewMonth && currentMonth > 0) {
        var label = document.createElement('span');
        label.className = 'heatmap-month-label';
        label.textContent = monthNames[currentMonth - 1];
        monthSlot.appendChild(label);
      }

      monthsEl.appendChild(monthSlot);
    }

    var weekEl = document.createElement('div');
    weekEl.className = 'heatmap-week';
    if (needsMonthGap) weekEl.classList.add('month-start');

    week.forEach(function (day, di) {
      var cell = document.createElement('div');
      cell.className = 'heatmap-cell';
      cell.setAttribute('data-level', day.level);

      var parts = day.date.split('-');
      var monthAbbr = monthNames;
      var shortDate = monthAbbr[parseInt(parts[1], 10) - 1] + ' ' + parseInt(parts[2], 10);
      cell.setAttribute('data-tooltip', day.count + ' · ' + shortDate);

      if (wi < 4) cell.classList.add('tooltip-right');
      else if (wi > totalWeeks - 4) cell.classList.add('tooltip-left');
      if (di <= 1) cell.classList.add('tooltip-below');
      else if (di >= 5) cell.classList.add('tooltip-above');

      weekEl.appendChild(cell);
    });

    container.appendChild(weekEl);
    prevMonth = currentMonth;
  });

  var scrollArea = container.closest('.heatmap-scroll-area');
  if (scrollArea) scrollArea.scrollLeft = 0;
}

/**
 * Relative time helper
 */
function timeAgo(isoDate) {
  var seconds = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  var minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes + (minutes === 1 ? ' minute ago' : ' minutes ago');
  var hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + (hours === 1 ? ' hour ago' : ' hours ago');
  var days = Math.floor(hours / 24);
  if (days < 30) return days + (days === 1 ? ' day ago' : ' days ago');
  var months = Math.floor(days / 30);
  return months + (months === 1 ? ' month ago' : ' months ago');
}

/**
 * GitHub Activity — last commit, total commits, recent repos
 */
var ACTIVITY_CACHE_KEY = 'gh_activity';
var ACTIVITY_CACHE_TTL = 1800000; // 30 minutes

var ACTIVITY_QUERY = 'query {\n' +
  GITHUB_LOGINS.map(function (login, i) {
    return '  user' + i + ': user(login: "' + login + '") {\n' +
      '    contributionsCollection {\n' +
      '      contributionCalendar { totalContributions }\n' +
      '      totalCommitContributions\n' +
      '    }\n' +
      '    repositories(first: 6, orderBy: {field: PUSHED_AT, direction: DESC}, ownerAffiliations: OWNER, isFork: false, privacy: PUBLIC) {\n' +
      '      nodes {\n' +
      '        name\n' +
      '        nameWithOwner\n' +
      '        description\n' +
      '        url\n' +
      '        pushedAt\n' +
      '        primaryLanguage { name color }\n' +
      '        stargazerCount\n' +
      '      }\n' +
      '    }\n' +
      '    pinnedItems(first: 6, types: REPOSITORY) {\n' +
      '      nodes {\n' +
      '        ... on Repository {\n' +
      '          name\n' +
      '          nameWithOwner\n' +
      '          description\n' +
      '          url\n' +
      '          pushedAt\n' +
      '          primaryLanguage { name color }\n' +
      '          stargazerCount\n' +
      '        }\n' +
      '      }\n' +
      '    }\n' +
      '  }';
  }).join('\n') + '\n}';

function mapRepoObj(repo) {
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

function getCachedActivity() {
  try {
    var raw = sessionStorage.getItem(ACTIVITY_CACHE_KEY);
    if (!raw) return null;
    var cached = JSON.parse(raw);
    if (Date.now() - cached.timestamp > ACTIVITY_CACHE_TTL) {
      sessionStorage.removeItem(ACTIVITY_CACHE_KEY);
      return null;
    }
    return cached.data;
  } catch (_) { return null; }
}

function setCachedActivity(data) {
  try {
    sessionStorage.setItem(ACTIVITY_CACHE_KEY, JSON.stringify({
      timestamp: Date.now(),
      data: data
    }));
  } catch (_) { /* silently ignore */ }
}

function fetchActivityFromServer() {
  return fetch('/api/activity', {
    headers: { 'Accept': 'application/json' }
  })
    .then(function (res) {
      if (!res.ok) {
        var err = new Error('API error');
        err.status = res.status;
        throw err;
      }
      return res.json();
    });
}

function fetchActivityFromBrowser(token) {
  return fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: ACTIVITY_QUERY })
  })
    .then(function (res) {
      if (!res.ok) throw new Error('GitHub API error');
      return res.json();
    })
    .then(function (json) {
      if (json.errors || !json.data) throw new Error('GitHub query error');

      var totalCommits = 0;
      var totalContributions = 0;
      var lastCommit = null;
      var allRecentRepos = [];
      var allPinnedRepos = [];

      GITHUB_LOGINS.forEach(function (_, i) {
        var user = json.data['user' + i];
        if (!user) return;

        totalCommits += user.contributionsCollection.totalCommitContributions;
        totalContributions += user.contributionsCollection.contributionCalendar.totalContributions;

        var recentRepos = user.repositories.nodes || [];
        var pinnedRepos = user.pinnedItems.nodes || [];
        recentRepos.forEach(function (r) { allRecentRepos.push(r); });
        pinnedRepos.forEach(function (r) { allPinnedRepos.push(r); });

        if (recentRepos.length > 0) {
          var pushed = recentRepos[0].pushedAt;
          if (!lastCommit || pushed > lastCommit) lastCommit = pushed;
        }
      });

      allRecentRepos.sort(function (a, b) {
        return new Date(b.pushedAt) - new Date(a.pushedAt);
      });

      var displayRepos = allPinnedRepos.length > 0 ? allPinnedRepos : allRecentRepos;

      return {
        lastCommit: lastCommit,
        totalCommits: totalCommits,
        totalContributions: totalContributions,
        repos: displayRepos.slice(0, 6).map(mapRepoObj)
      };
    });
}

function fetchActivity() {
  var cached = getCachedActivity();
  if (cached) return Promise.resolve(cached);

  return fetchActivityFromServer()
    .catch(function (err) {
      if ((err.status === 404 || err.status === 503) && isLocalPreview()) {
        var token = getLocalGitHubToken();
        if (token) return fetchActivityFromBrowser(token);
      }
      throw err;
    })
    .then(function (data) {
      setCachedActivity(data);
      return data;
    });
}

function renderActivityRepos(repos, container) {
  container.innerHTML = '';
  repos.forEach(function (repo) {
    var a = document.createElement('a');
    a.className = 'activity-repo';
    a.href = repo.url;
    a.target = '_blank';
    a.rel = 'noopener';

    var prefix = document.createElement('span');
    prefix.className = 'activity-repo-prefix';
    prefix.textContent = '>';
    a.appendChild(prefix);

    var name = document.createElement('span');
    name.className = 'activity-repo-name';
    name.textContent = repo.fullName || repo.name;
    a.appendChild(name);

    if (repo.language) {
      var lang = document.createElement('span');
      lang.className = 'activity-repo-lang';
      lang.textContent = '[' + repo.language + ']';
      a.appendChild(lang);
    }

    if (repo.description) {
      var desc = document.createElement('span');
      desc.className = 'activity-repo-desc';
      desc.textContent = '— ' + repo.description;
      a.appendChild(desc);
    }

    container.appendChild(a);
  });
}

function initGitHubActivity() {
  var lastCommitEl = document.getElementById('activity-last-commit');
  var totalCommitsEl = document.getElementById('activity-total-commits');
  var reposContainer = document.getElementById('activity-repos');

  if (!lastCommitEl && !totalCommitsEl && !reposContainer) return;

  fetchActivity()
    .then(function (data) {
      if (lastCommitEl && data.lastCommit) {
        lastCommitEl.textContent = timeAgo(data.lastCommit);
      } else if (lastCommitEl) {
        lastCommitEl.textContent = '—';
      }

      if (totalCommitsEl) {
        totalCommitsEl.textContent = data.totalContributions || data.totalCommits || '—';
      }

      if (reposContainer && data.repos && data.repos.length) {
        renderActivityRepos(data.repos, reposContainer);
      }
    })
    .catch(function () {
      if (lastCommitEl) lastCommitEl.textContent = '—';
      if (totalCommitsEl) totalCommitsEl.textContent = '—';
    });
}

/* Prefetch activity data — fires immediately */
(function () {
  if (!getCachedActivity()) {
    fetchActivity().catch(function () {});
  }
})();

/**
 * Heatmap scroll buttons
 */
function initHeatmapScroll() {
  var scrollArea = document.getElementById('heatmap-scroll-area');
  var leftBtn = document.getElementById('heatmap-scroll-left');
  var rightBtn = document.getElementById('heatmap-scroll-right');
  if (!scrollArea || !leftBtn || !rightBtn) return;

  var scrollStep = 200;

  function updateButtons() {
    leftBtn.disabled = scrollArea.scrollLeft <= 0;
    rightBtn.disabled = scrollArea.scrollLeft >= scrollArea.scrollWidth - scrollArea.clientWidth - 1;
  }

  leftBtn.addEventListener('click', function () {
    scrollArea.scrollBy({ left: -scrollStep, behavior: 'smooth' });
  });

  rightBtn.addEventListener('click', function () {
    scrollArea.scrollBy({ left: scrollStep, behavior: 'smooth' });
  });

  scrollArea.addEventListener('scroll', updateButtons, { passive: true });

  // Initial state — defer slightly so heatmap has rendered
  setTimeout(updateButtons, 500);

  // Also update when heatmap renders
  var observer = new MutationObserver(function () {
    setTimeout(updateButtons, 50);
  });
  observer.observe(scrollArea, { childList: true, subtree: true });
}

/**
 * Boot
 */
document.addEventListener('components-loaded', function () {
  initThemeToggle();
  initEmailCopy();
  initSkillsLayout();
  initProjectFilters();
  initGitHubHeatmap();
  initHeatmapScroll();
  initGitHubActivity();
  initTwitterEmbeds();
});
