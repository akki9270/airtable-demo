const fs = require('fs');
const path = require('path');

// In Docker, vars are injected via docker-compose env_file/environment.
// Locally, fall back to reading the root .env file.
function loadEnvFile() {
  const candidates = [
    path.resolve(__dirname, '../../.env'), // local dev: project root
    path.resolve(__dirname, '../.env'),    // fallback: ui root
  ];
  for (const envPath of candidates) {
    if (fs.existsSync(envPath)) {
      fs.readFileSync(envPath, 'utf8')
        .split('\n')
        .forEach(line => {
          const [key, ...rest] = line.split('=');
          if (key && !key.startsWith('#') && rest.length && !(key.trim() in process.env)) {
            process.env[key.trim()] = rest.join('=').trim();
          }
        });
      return;
    }
  }
}

loadEnvFile();

const clientId = process.env.AIRTABLE_CLIENT_ID || '';
const redirectUri = process.env.AIRTABLE_REDIRECT_URI || '';

if (!clientId || !redirectUri) {
  console.error('Missing AIRTABLE_CLIENT_ID or AIRTABLE_REDIRECT_URI');
  process.exit(1);
}

const devEnv = `export const environment = {
  production: false,
  airtable: {
    clientId: '${clientId}',
    redirectUri: '${redirectUri}',
    scopes: 'data.records:read schema.bases:read user.email:read',
    authUrl: 'https://airtable.com/oauth2/v1/authorize',
    tokenUrl: 'https://airtable.com/oauth2/v1/token',
    apiBaseUrl: 'https://api.airtable.com/v0',
  },
};
`;

const prodEnv = `export const environment = {
  production: true,
  airtable: {
    clientId: '${clientId}',
    redirectUri: '${redirectUri}',
    scopes: 'data.records:read schema.bases:read user.email:read',
    authUrl: 'https://airtable.com/oauth2/v1/authorize',
    tokenUrl: 'https://airtable.com/oauth2/v1/token',
    apiBaseUrl: 'https://api.airtable.com/v0',
  },
};
`;

const envDir = path.resolve(__dirname, '../src/environments');
fs.writeFileSync(path.join(envDir, 'environment.ts'), devEnv);
fs.writeFileSync(path.join(envDir, 'environment.prod.ts'), prodEnv);

console.log('Environment files generated');
