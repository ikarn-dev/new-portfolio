/**
 * Local development server
 * - Serves static files from the project root
 * - Routes /api/contributions to the Vercel serverless function
 * - Loads .env.local for the GITHUB_TOKEN
 */

var http = require('http');
var fs = require('fs');
var path = require('path');

var PORT = process.env.PORT || 3000;

// Load .env.local
(function loadEnv() {
  var envPath = path.join(__dirname, '.env.local');
  if (!fs.existsSync(envPath)) return;
  var lines = fs.readFileSync(envPath, 'utf8').split('\n');
  lines.forEach(function (line) {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    var idx = line.indexOf('=');
    if (idx === -1) return;
    var key = line.substring(0, idx).trim();
    var val = line.substring(idx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  });
})();

var MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.jfif': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm'
};

// Import the serverless function handler
var contributionsHandler = require('./api/contributions');

function createMockRes(httpRes) {
  var statusCode = 200;
  var headers = {};

  return {
    status: function (code) {
      statusCode = code;
      return this;
    },
    setHeader: function (key, value) {
      headers[key] = value;
    },
    json: function (data) {
      headers['Content-Type'] = 'application/json';
      httpRes.writeHead(statusCode, headers);
      httpRes.end(JSON.stringify(data));
    }
  };
}

var server = http.createServer(function (req, res) {
  var reqUrl = new URL(req.url, 'http://localhost:' + PORT);
  var pathname = reqUrl.pathname;

  // Handle API route
  if (pathname === '/api/contributions') {
    var query = {};
    reqUrl.searchParams.forEach(function (value, key) { query[key] = value; });
    var mockReq = { query: query };
    var mockRes = createMockRes(res);

    // CORS headers for local dev
    res.setHeader('Access-Control-Allow-Origin', '*');

    contributionsHandler(mockReq, mockRes);
    return;
  }

  // Serve static files
  var filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);

  // Security: prevent directory traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, function (err, stats) {
    if (err || !stats.isFile()) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }

    var ext = path.extname(filePath).toLowerCase();
    var contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, function () {
  console.log('');
  console.log('  Local dev server running at:');
  console.log('  → http://localhost:' + PORT);
  console.log('');
  console.log('  GITHUB_TOKEN: ' + (process.env.GITHUB_TOKEN ? 'loaded ✓' : 'MISSING ✗'));
  console.log('');
});
