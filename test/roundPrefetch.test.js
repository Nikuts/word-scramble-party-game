import { describe, it, expect } from 'vitest';
import { prefetchNextRoundData } from '../game/services/roundService.js';
import { QUESTIONS_PER_ROUND } from '../src/lib/config.js';

describe('Round Pre-fetching System', () => {
    it('should initiate prefetch for the next round index', () => {
        const mockGame = {
            id: 'TEST',
            currentRound: 1,
            language: 'en',
            theme: 'Space Adventure',
            sillyMode: false,
            is18PlusMode: false,
            geminiApiErrorCount: 0,
            players: [
                { id: 'p1', name: 'Alice' },
                { id: 'p2', name: 'Bob' },
                { id: 'p3', name: 'Charlie' }
            ]
        };

        prefetchNextRoundData(mockGame);

        expect(mockGame.prefetchedRoundPromise).toBeDefined();
    });

    it('should not prefetch if current round exceeds total rounds', () => {
        const mockGame = {
            id: 'TEST2',
            currentRound: QUESTIONS_PER_ROUND.length,
            language: 'en',
            theme: 'Space Adventure',
            players: [{ id: 'p1' }, { id: 'p2' }]
        };

        prefetchNextRoundData(mockGame);

        expect(mockGame.prefetchedRoundPromise).toBeUndefined();
    });
});
