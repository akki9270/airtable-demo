import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { connectDB } from './db';
import { syncRouter } from './routes/sync.routes';

const app = express();
const PORT = process.env['PORT'] ?? 3000;

app.use(cors());
app.use(express.json());

// Request logger
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} → ${res.statusCode} (${ms}ms)`);
  });
  next();
});

app.use('/api/sync', syncRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`[Server] Listening on port ${PORT}`));
  })
  .catch(err => {
    console.error('[Server] Failed to connect to MongoDB', err);
    process.exit(1);
  });
