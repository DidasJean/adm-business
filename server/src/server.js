const { app } = require('./app');
const { port } = require('./config');
const { pool } = require('./db/pool');
const { ensureSchema } = require('./db/schema');
const http = require('http');
const { Server } = require('socket.io');
const { verifyToken } = require('./utils/token');

async function start() {
  await ensureSchema();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: '*'
    }
  });

  io.use((socket, next) => {
    try {
      const token = String(socket.handshake.auth?.token || socket.handshake.query?.token || '');
      if (!token) return next(new Error('unauthorized'));
      const payload = verifyToken(token);
      socket.user = payload;
      return next();
    } catch (_err) {
      return next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const role = socket.user?.role;
    const linkedClientId = socket.user?.linkedClientId;

    if (role === 'admin') {
      socket.join('admins');
    }
    if (role === 'client' && linkedClientId) {
      socket.join(`client:${linkedClientId}`);
    }
  });

  app.locals.io = io;

  server.listen(port, () => {
    console.log(`ADM API running on http://localhost:${port}`);
  });
}

start().catch(async (err) => {
  console.error('Failed to start server:', err);
  try {
    await pool.end();
  } catch (_e) {
    // ignore
  }
  process.exit(1);
});
