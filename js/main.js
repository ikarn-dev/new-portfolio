/**
 * Random meme on page load
 */
function initMeme() {
  const memeImages = [
    './assets/memes/meme-1.jpeg',
    './assets/memes/meme-2.jfif',
    './assets/memes/meme-3.jpg',
    './assets/memes/meme-4.jpg',
    './assets/memes/meme-5.jfif',
    './assets/memes/meme-6.jpeg'
  ];
  const el = document.getElementById('meme-img');
  if (el) {
    el.src = memeImages[Math.floor(Math.random() * memeImages.length)];
  }
}

/**
 * Click-to-copy email
 */
function initEmailCopy() {
  const btn = document.getElementById('copy-btn');
  if (!btn) return;

  btn.addEventListener('click', () => {
    navigator.clipboard.writeText('ikarn.dev@gmail.com').then(() => {
      btn.textContent = 'copied!';
      setTimeout(() => {
        btn.textContent = 'copy';
      }, 1500);
    });
  });
}

/**
 * Dark mode toggle
 */
function initThemeToggle() {
  const toggle = document.getElementById('theme-toggle');
  if (!toggle) return;

  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = saved ? saved === 'dark' : prefersDark;

  if (isDark) {
    document.documentElement.setAttribute('data-theme', 'dark');
    toggle.textContent = 'light';
  }

  toggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
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
 * Boot
 */
document.addEventListener('DOMContentLoaded', () => {
  initThemeToggle();
  initMeme();
  initEmailCopy();
});
