/**
 * Component Loader (v3 — inlined)
 *
 * All component HTML is now inlined directly in index.html for instant
 * rendering with zero layout shift. This script simply fires the
 * 'components-loaded' event so main.js initializers run at the right time.
 */

document.addEventListener('DOMContentLoaded', function () {
  document.dispatchEvent(new Event('components-loaded'));
});
