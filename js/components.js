/**
 * Component Loader
 * Fetches HTML partials from /components/ and injects them into
 * placeholder elements in index.html. After all components load,
 * dispatches 'components-loaded' so main.js can safely init.
 */

var componentMap = [
  { id: 'comp-header',        path: './components/header.html' },
  { id: 'comp-about',         path: './components/about.html' },
  { id: 'comp-skills',        path: './components/skills.html' },
  { id: 'comp-contributions', path: './components/contributions.html' },
  { id: 'comp-projects',      path: './components/projects.html' },
  { id: 'comp-achievements',  path: './components/achievements.html' },
  { id: 'comp-meme',          path: './components/meme.html' },
  { id: 'comp-contact',       path: './components/contact.html' },
  { id: 'comp-footer',        path: './components/footer.html' }
];

function loadComponent(entry) {
  // Add a timestamp query parameter to forcefully bypass browser caches
  var url = entry.path + '?v=' + new Date().getTime();
  return fetch(url, { cache: 'no-store' })
    .then(function (res) {
      if (!res.ok) throw new Error('Failed to load ' + entry.path);
      return res.text();
    })
    .then(function (html) {
      var el = document.getElementById(entry.id);
      if (el) el.innerHTML = html;
    })
    .catch(function () {
      // Silent fail
    });
}

document.addEventListener('DOMContentLoaded', function () {
  Promise.all(componentMap.map(loadComponent)).then(function () {
    document.dispatchEvent(new Event('components-loaded'));
  });
});
