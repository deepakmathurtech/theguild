import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function apiDevRoutes() {
  return {
    name: 'api-dev-routes',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (!req.url || !req.url.startsWith('/api/')) {
          return next();
        }

        const pathname = new URL(req.url, 'http://localhost').pathname.replace(/^\/api\//, '');
        const handlers: Record<string, () => Promise<any>> = {
          'create-razorpay-order': () => import('./api/create-razorpay-order.ts'),
          'verify-razorpay-payment': () => import('./api/verify-razorpay-payment.ts'),
          'razorpay-webhook': () => import('./api/razorpay-webhook.ts'),
        };

        const loadHandler = handlers[pathname];
        if (!loadHandler) {
          res.statusCode = 404;
          res.end(JSON.stringify({ success: false, message: 'API route not found', error: 'NOT_FOUND' }));
          return;
        }

        let body: any = {};
        if (req.method && !['GET', 'HEAD'].includes(req.method)) {
          const chunks: Buffer[] = [];
          req.on('data', (chunk: Buffer | string) => {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          });
          req.on('end', async () => {
            try {
              body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
            } catch {
              body = {};
            }
            await dispatchHandler(req, res, body, loadHandler);
          });
          return;
        }

        await dispatchHandler(req, res, body, loadHandler);
      });
    },
  };
}

async function dispatchHandler(req: any, res: any, body: any, loadHandler: () => Promise<any>) {
  const handlerModule = await loadHandler();
  const handler = handlerModule?.default;
  if (!handler) {
    res.statusCode = 404;
    res.end(JSON.stringify({ success: false, message: 'API handler not found', error: 'HANDLER_NOT_FOUND' }));
    return;
  }

  const response = {
    statusCode: 200,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      res.statusCode = this.statusCode || 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(payload));
      return this;
    },
    send(payload: any) {
      res.statusCode = this.statusCode || 200;
      res.setHeader('Content-Type', 'text/plain');
      res.end(typeof payload === 'string' ? payload : JSON.stringify(payload));
      return this;
    },
    setHeader: res.setHeader.bind(res),
    end: res.end.bind(res),
  };

  await handler({ ...req, body, method: req.method || 'GET', headers: req.headers }, response);
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), apiDevRoutes()],
  build: {
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules/react')) return 'react'
          if (id.includes('node_modules/firebase')) return 'firebase'
          if (id.includes('node_modules/lucide')) return 'icons'
        }
      }
    }
  },
  server: {
    port: 5173,
    host: true,
  },
  preview: {
    port: 4173,
    host: true,
  }
})
