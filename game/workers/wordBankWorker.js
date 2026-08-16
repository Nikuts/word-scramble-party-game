// game/workers/wordBankWorker.js
import { workerData, parentPort } from 'worker_threads';
import { generateWordBanksDirectly } from '../services/wordBankEngine.js';

try {
    const result = generateWordBanksDirectly(workerData);
    parentPort.postMessage(result);
} catch (error) {
    parentPort.postMessage({ error: error.message, stack: error.stack });
}