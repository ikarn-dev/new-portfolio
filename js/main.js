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
  if (!btn) return;

  btn.addEventListener('click', function () {
    navigator.clipboard.writeText('ikarn.dev@gmail.com').then(function () {
      btn.textContent = 'copied!';
      setTimeout(function () {
        btn.textContent = 'copy';
      }, 1500);
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
var GITHUB_LOGIN = 'ikarn-dev';
var LEVEL_MAP = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };
var heatmapState = { activeYear: null };
var CACHE_TTL = 3600000;

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

function fetchContributions(year) {
  if (typeof GITHUB_TOKEN === 'undefined' || !GITHUB_TOKEN) {
    return Promise.reject(new Error('no token'));
  }
  var cached = getCachedData(year);
  if (cached) return Promise.resolve(cached);

  var from = year + '-01-01T00:00:00Z';
  var to = year + '-12-31T23:59:59Z';

  return fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + GITHUB_TOKEN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: CONTRIBUTIONS_QUERY,
      variables: { login: GITHUB_LOGIN, from: from, to: to }
    })
  })
    .then(function (res) {
      if (!res.ok) throw new Error('API error');
      return res.json();
    })
    .then(function (json) {
      if (json.errors) throw new Error('query error');
      var collection = json.data.user.contributionsCollection;
      var calendar = collection.contributionCalendar;
      var data = {
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
      setCachedData(year, data);
      return data;
    });
}

/* Prefetch — fires immediately on script load, before DOM ready */
(function () {
  var y = new Date().getFullYear();
  if (typeof GITHUB_TOKEN !== 'undefined' && GITHUB_TOKEN && !getCachedData(y)) {
    fetchContributions(y);
  }
})();

function initGitHubHeatmap() {
  var container = document.getElementById('github-heatmap');
  var yearsContainer = document.getElementById('heatmap-years');
  if (!container || !yearsContainer) return;

  if (typeof GITHUB_TOKEN === 'undefined' || !GITHUB_TOKEN) {
    container.innerHTML = '<div class="heatmap-loading">missing config</div>';
    return;
  }

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

function loadContributions(year) {
  var container = document.getElementById('github-heatmap');
  var totalEl = document.getElementById('heatmap-total');
  var statsEl = document.getElementById('heatmap-stats');
  if (!container) return;

  container.innerHTML = '<div class="heatmap-loading">loading...</div>';
  if (totalEl) totalEl.textContent = '';
  if (statsEl) statsEl.innerHTML = '';

  fetchContributions(year)
    .then(function (data) {
      renderHeatmap(data, container);
      if (totalEl) totalEl.textContent = data.totalContributions + ' contributions in ' + year;
      if (statsEl && data.stats) renderStats(data.stats, statsEl);
    })
    .catch(function () {
      container.innerHTML = '<div class="heatmap-loading">unable to load</div>';
    });
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

  // Month labels
  var monthsEl = document.getElementById('heatmap-months');
  if (monthsEl) {
    monthsEl.innerHTML = '';
    var monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var lastMonth = -1;
    data.weeks.forEach(function (week, wi) {
      var fd = week[0];
      if (fd) {
        var m = parseInt(fd.date.split('-')[1], 10) - 1;
        if (m !== lastMonth) {
          var span = document.createElement('span');
          span.className = 'heatmap-month-label';
          span.textContent = monthNames[m];
          span.style.gridColumnStart = wi + 1;
          monthsEl.appendChild(span);
          lastMonth = m;
        }
      }
    });
  }

  // Cells with month separators and smart tooltips
  var totalWeeks = data.weeks.length;
  var prevMonth = -1;

  data.weeks.forEach(function (week, wi) {
    // Detect month boundary for separator
    var firstDay = week[0];
    var isNewMonth = false;
    if (firstDay) {
      var curMonth = parseInt(firstDay.date.split('-')[1], 10);
      if (curMonth !== prevMonth) {
        isNewMonth = prevMonth !== -1; // don't add gap before first month
        prevMonth = curMonth;
      }
    }

    week.forEach(function (day, di) {
      var cell = document.createElement('div');
      cell.className = 'heatmap-cell';
      cell.setAttribute('data-level', day.level);

      // Short tooltip: "3 · Mar 27"
      var parts = day.date.split('-');
      var monthAbbr = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      var shortDate = monthAbbr[parseInt(parts[1], 10) - 1] + ' ' + parseInt(parts[2], 10);
      cell.setAttribute('data-tooltip', day.count + ' · ' + shortDate);

      // Month separator — add gap on first cell of new month column
      if (isNewMonth && di === 0) cell.classList.add('month-start');

      // Smart tooltip positioning
      if (wi < 4) cell.classList.add('tooltip-right');
      else if (wi > totalWeeks - 4) cell.classList.add('tooltip-left');
      if (di <= 1) cell.classList.add('tooltip-below');
      else if (di >= 5) cell.classList.add('tooltip-above');

      container.appendChild(cell);
    });
  });

  // Scroll to Jan (start) — not Dec
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
  initProjectFilters();
  initGitHubHeatmap();

  // Re-render Twitter embeds after dynamic injection
  if (window.twttr && window.twttr.widgets) {
    window.twttr.widgets.load();
  }
});
