import { describe, it, expect } from 'vitest';
import {
    collectAnswerChunks,
    distributeChunksToPlayers_New,
    distributeChunksToPlayers_Current,
    splitPlayerChunksIntoBattleSets,
    generateWordBanksDirectly,
    ESSENTIAL_CONNECTORS
} from '../game/services/wordBankEngine.js';

describe('Word Bank Engine Optimization & Distribution', () => {
    const mockPlayers = [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
        { id: 'p3', name: 'Charlie' },
        { id: 'p4', name: 'Dave' }
    ];

    const mockPlayerAnswers = {
        p1: {
            questions: [
                { answer: 'I love eating spicy tacos because they are amazing.' },
                { answer: 'Running through the mysterious dark forest.' }
            ]
        },
        p2: {
            questions: [
                { answer: 'Never trust a talking raccoon with a laser gun.' },
                { answer: 'Dancing in the summer rain while singing loudly.' }
            ]
        },
        p3: {
            questions: [
                { answer: 'The ancient wizard forgot his enchanted magical spellbook.' },
                { answer: 'Flying over the golden mountains into the clouds.' }
            ]
        },
        p4: {
            questions: [
                { answer: 'Building a giant robot out of cardboard boxes.' },
                { answer: 'Secretly drinking all the cold apple cider.' }
            ]
        }
    };

    const mockBattleSchedule = [
        { id: 'b1', competitors: ['p1', 'p2'], prompt: 'The secret to happiness is: ____' },
        { id: 'b2', competitors: ['p3', 'p4'], prompt: 'My absolute biggest fear is: ____' },
        { id: 'b3', competitors: ['p1', 'p3'], prompt: 'Never go outside without: ____' },
        { id: 'b4', competitors: ['p2', 'p4'], prompt: 'The weirdest thing in space: ____' }
    ];

    it('collects answer chunks correctly from current and history answers', () => {
        const history = [
            { playerId: 'p1', answer: 'Old round answer from previous turn.' }
        ];
        const chunks = collectAnswerChunks(mockPlayerAnswers, history);
        expect(chunks.length).toBeGreaterThan(0);
        expect(chunks.some(c => c.authorId === 'p1' && c.isCurrentRound)).toBe(true);
        expect(chunks.some(c => c.authorId === 'p1' && !c.isCurrentRound)).toBe(true);
    });

    it('strictly guarantees 0% self-authored words for each player', () => {
        const chunks = collectAnswerChunks(mockPlayerAnswers, []);
        const seenMap = new Map();
        mockPlayers.forEach(p => seenMap.set(p.id, new Set()));

        const allotted = distributeChunksToPlayers_New(chunks, mockPlayers, seenMap);

        mockPlayers.forEach(player => {
            const playerChunks = allotted[player.id] || [];
            playerChunks.forEach(chunk => {
                expect(chunk.authorId).not.toBe(player.id);
            });
        });
    });

    it('generates complete word banks within configured size limits directly in-process', () => {
        const startTime = performance.now();
        const result = generateWordBanksDirectly({
            language: 'en',
            players: mockPlayers,
            playerAnswers: mockPlayerAnswers,
            answerHistory: [],
            battleSchedule: JSON.parse(JSON.stringify(mockBattleSchedule)),
            preGeneratedFallbackWords: [],
            currentRound: 1,
            playerSeenChunks: {}
        });
        const duration = performance.now() - startTime;

        expect(duration).toBeLessThan(50); // Sub-50ms execution
        expect(result.battleScheduleWithBanks).toHaveLength(mockBattleSchedule.length);

        result.battleScheduleWithBanks.forEach(battle => {
            expect(battle.promptTokens.length).toBeGreaterThan(0);
            battle.competitors.forEach(cId => {
                const bank = battle.wordBanks[cId];
                expect(bank).toBeDefined();
                expect(bank.length).toBeGreaterThanOrEqual(30);
                expect(bank.length).toBeLessThanOrEqual(50);
                
                // Verify all bank words have valid structure
                bank.forEach(token => {
                    expect(token.text).toBeDefined();
                    expect(typeof token.text).toBe('string');
                    expect(['answer', 'fallback', 'connector']).toContain(token.source);
                    if (token.source === 'answer') {
                        expect(token.authorId).not.toBe(cId); // 0% self words
                    }
                });
            });
        });
    });

    it('guarantees minimum essential connectors via Smart Word Bank Balance Guard', () => {
        const result = generateWordBanksDirectly({
            language: 'en',
            players: mockPlayers,
            playerAnswers: {
                p1: { questions: [{ answer: 'Cat dog fox bear tiger lion wolf eagle.' }] }, // Zero connectors
                p2: { questions: [{ answer: 'Apple orange banana grape cherry lemon.' }] },
                p3: { questions: [{ answer: 'Table chair desk bed couch lamp door.' }] },
                p4: { questions: [{ answer: 'Red green blue yellow purple orange.' }] }
            },
            answerHistory: [],
            battleSchedule: JSON.parse(JSON.stringify(mockBattleSchedule)),
            preGeneratedFallbackWords: [],
            currentRound: 1,
            playerSeenChunks: {}
        });

        result.battleScheduleWithBanks.forEach(battle => {
            battle.competitors.forEach(cId => {
                const bank = battle.wordBanks[cId];
                const connectors = bank.filter(tok => 
                    ESSENTIAL_CONNECTORS.en.includes(tok.text.toLowerCase())
                );
                expect(connectors.length).toBeGreaterThanOrEqual(4);
            });
        });
    });

    it('splits player chunks evenly across multiple assigned battles in a round', () => {
        const dummyAllotted = {
            p1: [{ chunkText: 'c1' }, { chunkText: 'c2' }, { chunkText: 'c3' }, { chunkText: 'c4' }]
        };
        const schedule = [
            { competitors: ['p1', 'p2'] },
            { competitors: ['p1', 'p3'] }
        ];
        const sets = splitPlayerChunksIntoBattleSets(dummyAllotted, schedule);
        expect(sets.p1).toHaveLength(2);
        expect(sets.p1[0].length + sets.p1[1].length).toBe(4);
    });

    it('supports Ukrainian language and fallback enrichment', () => {
        const ukPlayerAnswers = {
            p1: { questions: [{ answer: 'Я люблю смачну гарячу піцу з сиром.' }] },
            p2: { questions: [{ answer: 'Таємничий космічний корабель летить далеко.' }] }
        };
        const ukSchedule = [
            { id: 'uk1', competitors: ['p1', 'p2'], prompt: 'Найкраща порада у житті: ____' }
        ];
        const result = generateWordBanksDirectly({
            language: 'uk',
            players: [mockPlayers[0], mockPlayers[1]],
            playerAnswers: ukPlayerAnswers,
            answerHistory: [],
            battleSchedule: ukSchedule,
            preGeneratedFallbackWords: [],
            currentRound: 1,
            playerSeenChunks: {}
        });

        expect(result.battleScheduleWithBanks[0].wordBanks.p1.length).toBeGreaterThanOrEqual(30);
        expect(result.battleScheduleWithBanks[0].wordBanks.p2.length).toBeGreaterThanOrEqual(30);

        // Check Ukrainian connectors from expanded essential connector set
        const ukConnectors = result.battleScheduleWithBanks[0].wordBanks.p1.filter(tok =>
            ESSENTIAL_CONNECTORS.uk.includes(tok.text.toLowerCase())
        );
        expect(ukConnectors.length).toBeGreaterThanOrEqual(4);
    });

    it('correctly tokenizes Ukrainian words with different apostrophe formats (ASCII, curly, typographic modifier ʼ)', async () => {
        const { tokenizeText } = await import('../game/helpers.js');
        const textWithApostrophes = "мʼясо зв’язок ім'я п'ять сімʼї";
        const tokens = tokenizeText(textWithApostrophes);
        expect(tokens).toEqual(['мʼясо', 'зв’язок', "ім'я", "п'ять", 'сімʼї']);
    });
});
