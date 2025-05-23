// Set production mode to enable global module resolution
process.env.NODE_ENV = 'production';

console.log('Starting server in production mode...');
console.log('Node executable path:', process.execPath);

// Start the server
try {
  require('./server.js');
} catch (error) {
  console.error('Failed to start server:', error);
  console.error('Node version:', process.version);
  console.error('Platform:', process.platform);
}