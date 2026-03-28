/**
 * Random meme on page load
 */
function initMeme() {
  var memeImages = [
    './assets/memes/meme-1.jpeg',
    './assets/memes/meme-2.jfif',
    './assets/memes/meme-3.jpg',
    './assets/memes/meme-4.jpg',
    './assets/memes/meme-5.jfif',
    './assets/memes/meme-6.jpeg'
  ];
  var el = document.getElementById('meme-img');
  if (el) {
    el.src = memeImages[Math.floor(Math.random() * memeImages.length)];
  }
}

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
var GITHUB_LOGIN = 'ikarn-dev';
var LEVEL_MAP = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };
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
  var collection = json.data.user.contributionsCollection;
  var calendar = collection.contributionCalendar;

  return {
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
        login: GITHUB_LOGIN,
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
      if (json.errors || !json.data || !json.data.user) {
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
  var yearsContainer = document.getElementById('heatmap-years');
  if (!container || !yearsContainer) return;

  var startYear = 2022;
  var currentYear = new Date().getFullYear();
  var years = [];
  for (var y = currentYear; y >= startYear; y--) { years.push(y); }

  yearsContainer.innerHTML = '';
  years.forEach(function (year) {
    var btn = document.createElement('button');
    btn.className = 'filter-btn';
    btn.textContent = year;
    btn.setAttribute('data-year', year);
    btn.addEventListener('click', function () {
      loadContributions(year);
      setActiveYearBtn(year);
    });
    yearsContainer.appendChild(btn);
  });

  loadContributions(currentYear);
  setActiveYearBtn(currentYear);
}

function setActiveYearBtn(year) {
  heatmapState.activeYear = year;
  var btns = document.querySelectorAll('#heatmap-years .filter-btn');
  btns.forEach(function (b) {
    b.classList.toggle('active', parseInt(b.getAttribute('data-year'), 10) === year);
  });
}

function setHeatmapYearButtonsDisabled(disabled) {
  var btns = document.querySelectorAll('#heatmap-years .filter-btn');
  btns.forEach(function (btn) {
    btn.disabled = disabled;
  });
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
  var totalEl = document.getElementById('heatmap-total');
  var statsEl = document.getElementById('heatmap-stats');
  if (!container) return;

  var requestId = ++heatmapState.requestId;
  setHeatmapYearButtonsDisabled(true);
  setHeatmapPanelState('loading', 'Loading ' + year + ' contributions...');

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
      if (totalEl) totalEl.textContent = data.totalContributions + ' contributions in ' + year;
      if (statsEl && data.stats) renderStats(data.stats, statsEl);
      setHeatmapPanelState(null);
      setHeatmapYearButtonsDisabled(false);
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
        setHeatmapYearButtonsDisabled(false);
        return;
      }

      setHeatmapPanelState('error', message);
      setHeatmapYearButtonsDisabled(false);
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
 * Boot
 */
document.addEventListener('components-loaded', function () {
  initThemeToggle();
  initMeme();
  initEmailCopy();
  initSkillsLayout();
  initProjectFilters();
  initGitHubHeatmap();
  initTwitterEmbeds();
});
