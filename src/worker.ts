let running = true;

function shutdown(signal: string) {
  if (!running) return;
  running = false;
  console.log(`worker shutting down (${signal})`);
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

console.log('worker up');

// Scheduler logic — WP-10
// Keep process alive until signal
setInterval(() => {
  if (!running) return;
}, 60_000);
