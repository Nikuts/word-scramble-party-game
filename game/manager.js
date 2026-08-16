// game/manager.js
import os from 'os';
import v8 from 'v8';
import { monitorEventLoopDelay } from 'perf_hooks';
import { MAX_CONCURRENT_GAMES, MAX_MEMORY_THRESHOLD_MB } from '../src/lib/config.js';

let games = {}; // Stores all active games { gameId: gameData }
let gcInterval = null;

let eventLoopMonitor = null;
if (typeof monitorEventLoopDelay === 'function') {
    try {
        eventLoopMonitor = monitorEventLoopDelay({ resolution: 20 });
        eventLoopMonitor.enable();
    } catch (e) {
        eventLoopMonitor = null;
    }
}

/**
 * Dynamically evaluates host hardware limits (RAM, CPU cores, Event Loop lag)
 * and returns current real-time health metrics.
 */
export const getServerHealthMetrics = () => {
    let rssMb = 0;
    let maxMemoryMb = 512;
    let eventLoopLagMs = 0;
    let cpuCores = 1;

    if (typeof process !== 'undefined' && process.memoryUsage) {
        const mem = process.memoryUsage();
        rssMb = Math.round(mem.rss / (1024 * 1024));
    }

    if (typeof os !== 'undefined') {
        try {
            cpuCores = os.cpus()?.length || 1;
            const totalMemMb = Math.round(os.totalmem() / (1024 * 1024));
            let heapLimitMb = totalMemMb;
            if (typeof v8 !== 'undefined' && v8.getHeapStatistics) {
                heapLimitMb = Math.round(v8.getHeapStatistics().heap_size_limit / (1024 * 1024));
            }
            // 85% of effective memory ceiling
            maxMemoryMb = Math.round(Math.min(totalMemMb, heapLimitMb) * 0.85);
        } catch (e) {
            maxMemoryMb = 512;
        }
    }

    if (eventLoopMonitor) {
        // Convert nanoseconds to milliseconds
        eventLoopLagMs = Math.round((eventLoopMonitor.mean || 0) / 1e6);
        if (eventLoopMonitor.reset) eventLoopMonitor.reset();
    }

    // Use environment variable override if explicitly defined, otherwise use dynamic auto-detection
    const configuredMaxMemory = MAX_MEMORY_THRESHOLD_MB || maxMemoryMb;
    const configuredMaxGames = MAX_CONCURRENT_GAMES || Math.max(15, Math.min(Math.floor(configuredMaxMemory / 3), cpuCores * 35));

    return {
        rssMb,
        maxMemoryMb: configuredMaxMemory,
        maxGames: configuredMaxGames,
        eventLoopLagMs,
        activeGamesCount: Object.keys(games).length
    };
};

/**
 * Checks if the server has sufficient resources to host a new game session
 * based on dynamic hardware discovery and real-time event loop metrics.
 * @returns {{ allowed: boolean, reason?: string, metrics?: object }}
 */
export const checkServerCapacity = () => {
    const metrics = getServerHealthMetrics();

    // 1. Concurrent room capacity check
    if (metrics.activeGamesCount >= metrics.maxGames) {
        console.warn(`[Capacity Guard] Blocked new game creation: games capacity reached (${metrics.activeGamesCount}/${metrics.maxGames})`);
        return {
            allowed: false,
            reason: 'max_games_reached',
            metrics
        };
    }

    // 2. Event loop CPU lag check (> 350ms average latency)
    if (metrics.eventLoopLagMs > 350) {
        console.warn(`[Capacity Guard] Blocked new game creation due to high CPU event loop lag: ${metrics.eventLoopLagMs}ms`);
        return {
            allowed: false,
            reason: 'cpu_overloaded',
            metrics
        };
    }

    // 3. Memory ceiling check
    if (metrics.rssMb >= metrics.maxMemoryMb) {
        // Attempt emergency garbage collection of inactive rooms
        cleanupStaleGames(10 * 60 * 1000);
        const updatedRssMb = Math.round(process.memoryUsage().rss / (1024 * 1024));
        if (updatedRssMb >= metrics.maxMemoryMb) {
            console.warn(`[Capacity Guard] Blocked new game creation due to high memory: ${updatedRssMb}MB / ${metrics.maxMemoryMb}MB threshold`);
            return {
                allowed: false,
                reason: 'high_memory',
                metrics: { ...metrics, rssMb: updatedRssMb }
            };
        }
    }

    return { allowed: true, metrics };
};

export const getGames = () => games;
export const getGame = (gameId) => {
    const game = games[gameId];
    if (game) {
        game.lastActivityAt = Date.now();
    }
    return game;
};

export const addGame = (gameId, game) => {
    game.createdAt = game.createdAt || Date.now();
    game.lastActivityAt = game.lastActivityAt || Date.now();
    games[gameId] = game;
};

export const deleteGame = (gameId) => {
    const game = games[gameId];
    if (game) {
        if (game.phaseTimerId) {
            clearTimeout(game.phaseTimerId.serverTimeout);
            clearInterval(game.phaseTimerId.broadcastInterval);
        }
        if (game.hostReassignmentTimerId) {
            clearTimeout(game.hostReassignmentTimerId);
        }
        if (game.playerReconnectionTimers) {
            Object.values(game.playerReconnectionTimers).forEach(t => clearTimeout(t));
        }
        delete games[gameId];
    }
};

/**
 * Finds the game object associated with a given socket.
 * @param {import('socket.io').Socket} socket The socket instance.
 * @returns {object|undefined} The game object or undefined if not found.
 */
export const getGameFromSocket = (socket) => {
    const gameId = socket.data?.gameId || Array.from(socket.rooms || []).find(room => room !== socket.id);
    return getGame(gameId);
};

/**
 * Sweeps and cleans up abandoned games older than maxAgeMs with no active connections.
 * @param {number} maxAgeMs Maximum inactivity period (default 2 hours).
 * @returns {number} The number of games cleaned up.
 */
export const cleanupStaleGames = (maxAgeMs = 2 * 60 * 60 * 1000) => {
    const now = Date.now();
    let cleanedCount = 0;

    Object.entries(games).forEach(([gameId, game]) => {
        const lastActive = game.lastActivityAt || game.createdAt || now;
        const isInactive = (now - lastActive) > maxAgeMs;
        const hasNoConnections = !game.hostDisplaySocketId && (game.players || []).every(p => !p.socketId);

        if (isInactive && hasNoConnections) {
            console.log(`[GC] Cleaning up stale inactive game ${gameId} (Inactive for ${Math.round((now - lastActive) / 60000)}m)`);
            deleteGame(gameId);
            cleanedCount++;
        }
    });

    return cleanedCount;
};

/**
 * Starts periodic room garbage collection.
 * @param {number} intervalMs Sweep interval in milliseconds (default 30 minutes).
 */
export const startGarbageCollector = (intervalMs = 30 * 60 * 1000) => {
    if (gcInterval) clearInterval(gcInterval);
    gcInterval = setInterval(() => {
        cleanupStaleGames();
    }, intervalMs);
    if (gcInterval && typeof gcInterval.unref === 'function') {
        gcInterval.unref(); // Don't hold Node process open solely for GC
    }
};

export const stopGarbageCollector = () => {
    if (gcInterval) {
        clearInterval(gcInterval);
        gcInterval = null;
    }
};
