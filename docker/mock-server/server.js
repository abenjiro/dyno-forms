import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 4000;

function readJsonFile(filename) {
  const filePath = path.join(__dirname, 'data', filename);
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (err) {
    console.error(`Error reading ${filename}:`, err);
    return null;
  }
}

const server = http.createServer((req, res) => {
  // CORS Headers for seamless local development
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  res.setHeader('Content-Type', 'application/json');

  if (pathname === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    return;
  }

  if (pathname === '/api/countries') {
    const countries = readJsonFile('countries.json') || [];
    res.writeHead(200);
    res.end(JSON.stringify(countries));
    return;
  }

  if (pathname === '/api/states') {
    const countryParam = parsedUrl.searchParams.get('country') || 'US';
    const allStates = readJsonFile('states.json') || {};
    const states = allStates[countryParam.toUpperCase()] || [];
    res.writeHead(200);
    res.end(JSON.stringify(states));
    return;
  }

  if (pathname === '/api/industries') {
    const industries = readJsonFile('industries.json') || {};
    res.writeHead(200);
    res.end(JSON.stringify(industries));
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Endpoint not found', available: ['/health', '/api/countries', '/api/states', '/api/industries'] }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Dyno Mock API Server] running on http://0.0.0.0:${PORT}`);
});
