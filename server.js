import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { initAiClient } from './geminiService.js';
import { registerEventHandlers } from './game/handlers.js';
import { getLocalIpAddress } from './game/helpers.js';
import { startGarbageCollector } from './game/manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize the AI client (supports GEMINI_API_KEY and API_KEY)
initAiClient();

// Start periodic inactive game cleanup (runs every 30 minutes)
startGarbageCollector(30 * 60 * 1000);

const app = express();

// Enable Gzip/Deflate compression for all HTTP responses
app.use(compression({
    filter: (req, res) => {
        if (req.headers['x-no-compression']) return false;
        return compression.filter(req, res);
    },
    threshold: 1024 // Only compress responses > 1KB
}));

const server = http.createServer(app);
const io = new SocketIOServer(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    transports: ['websocket', 'polling'],
    perMessageDeflate: false // Disable per-message deflate to eliminate CPU compression overhead on frequent timer/vote packets
});

// Register all socket.io event handlers
io.on('connection', (socket) => {
    registerEventHandlers(io, socket);
});

const isProduction = process.env.NODE_ENV === 'production';
const distPath = path.join(__dirname, 'dist');
const distExists = fs.existsSync(distPath);

if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa'
    });
    app.use(vite.middlewares);
} else if (distExists) {
    app.use(express.static(distPath, {
        maxAge: '1y',
        immutable: true,
        setHeaders: (res, filePath) => {
            if (filePath.endsWith('index.html')) {
                res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            }
        }
    }));
    app.get('*', (req, res) => {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.sendFile(path.join(distPath, 'index.html'));
    });
} else {
    console.warn("[Server] Production mode requested but dist/ not found. Falling back to Vite dev middleware.");
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa'
    });
    app.use(vite.middlewares);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
