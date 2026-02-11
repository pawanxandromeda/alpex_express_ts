const https = require('https');

const url = 'https://qp9xab89g8.execute-api.ap-south-1.amazonaws.com/api/auth/login';
const u = new URL(url);

const options = {
  method: 'OPTIONS',
  hostname: u.hostname,
  path: u.pathname + u.search,
  headers: {
    'Origin': 'https://www.thealpex.com',
    'Access-Control-Request-Method': 'POST',
    'User-Agent': 'node-preflight-test'
  },
};

const req = https.request(options, (res) => {
  console.log('statusCode:', res.statusCode);
  console.log('headers:', res.headers);
  let body = '';
  res.on('data', (chunk) => (body += chunk));
  res.on('end', () => {
    console.log('body:', body);
  });
});

req.on('error', (err) => {
  console.error('request error:', err);
  process.exit(2);
});

req.end();
