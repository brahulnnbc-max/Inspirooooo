import path from 'path';
import fs from 'fs';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import app from './src/apiApp.ts';

const PORT = Number(process.env.PORT) || 3000;

// Start Express server and mount Vite middleware
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`inspiro LIVE CBT Server running on http://0.0.0.0:${PORT}`);
  });
}

// In standard Node or dev server, launch listen loop.
// On Vercel, serverless function runner imports app without calling app.listen().
if (!process.env.VERCEL) {
  startServer();
}

export default app;
