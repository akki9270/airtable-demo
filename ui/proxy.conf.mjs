const backendUrl = process.env['BACKEND_URL'] ?? 'http://localhost:3000';

export default {
  '/airtable-token': {
    target: 'https://airtable.com',
    secure: true,
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/airtable-token/, '/oauth2/v1/token'),
  },
  '/api': {
    target: backendUrl,
    secure: false,
    changeOrigin: true,
  },
};
