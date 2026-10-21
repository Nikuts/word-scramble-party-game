import { describe, it, expect } from 'vitest';
import {
    collectAnswerChunks,
    countDistinctWords,
    extractCleanWords,
    isStopwordOrConnector,
    generateWordBanksDirectly,
    ESSENTIAL_CONNECTORS,
    GUARANTEED_PUNCTUATION
} from '../game/services/wordBankEngine.js';

describe('Word Bank Engine (4-Tier Slot-Balanced Algorithm, §6)', () => {
    const mockPlayers = [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
        { id: 'p3', name: 'Charlie' },
        { id: 'p4', name: 'Diana' }
    ];

    const mockPlayerAnswers = {
        p1: {
            questions: [
                { answer: 'I secretly love eating midnight pizza with extra pineapple.' },
                { answer: 'The giant robot attacked our peaceful garden yesterday!' }
            ]
        },
        p2: {
            questions: [
                { answer: 'Never trust a smiling cat holding a laser pointer.' },
                { answer: 'My boss thinks dancing on tables is professional.' }
            ]
        },
        p3: {
            questions: [
                { answer: 'Aliens stole my favorite socks because they were jealous.' },
                { answer: 'Always bring a waterproof umbrella to a volcano party.' }
            ]
        },
        p4: {
            questions: [
                { answer: 'Three angry penguins hijacked the luxury cruise ship.' },
                { answer: 'Suddenly the coffee machine started speaking ancient Latin.' }
            ]
        }
    };

    const mockAnswerHistory = [
        { round: 1, playerId: 'p1', answer: 'Historical dinosaur museum explosion.' },
        { round: 1, playerId: 'p2', answer: 'Flying spaghetti monster in space.' },
        { round: 1, playerId: 'p3', answer: 'Underwater basket weaving championship.' },
        { round: 1, playerId: 'p4', answer: 'Time traveling hamster detective.' }
    ];

    const mockBattleSchedule = [
        { id: 'b1', competitors: ['p1', 'p2'], prompt: 'The worst excuse for being late to work: ____' },
        { id: 'b2', competitors: ['p3', 'p4'], prompt: 'What the aliens really want from Earth: ____' },
        { id: 'b3', competitors: ['p1', 'p3'], prompt: 'A terrible slogan for a hospital: ____' },
        { id: 'b4', competitors: ['p2', 'p4'], prompt: 'Secret rule of the ninja club: ____' }
    ];

    it('collects answer chunks with deterministic per-author bundleIds across history and current round', () => {
        const chunks = collectAnswerChunks(mockPlayerAnswers, mockAnswerHistory);
        expect(chunks.length).toBeGreaterThan(0);
        expect(chunks.some(c => c.isCurrentRound)).toBe(true);
        expect(chunks.some(c => !c.isCurrentRound)).toBe(true);
        chunks.forEach(c => {
            expect(c.authorId).toBeDefined();
            expect(c.chunkText.length).toBeGreaterThan(0);
            expect(c.words.length).toBeGreaterThan(0);
            expect(c.bundleId).toMatch(/^p\d+_\d+_\d+$/);
        });
    });

    it('preserves identical bundleIds when current-round answers move into answerHistory in the next round', () => {
        const r1Chunks = collectAnswerChunks(
            { p1: { questions: [{ answer: 'Quantum laser shark, swimming fast' }] } },
            []
        );
        const r2Chunks = collectAnswerChunks(
            { p1: { questions: [{ answer: 'New round two answer here' }] } },
            [{ round: 1, playerId: 'p1', answer: 'Quantum laser shark, swimming fast' }]
        );

        const r2HistChunks = r2Chunks.filter(c => !c.isCurrentRound);
        expect(r2HistChunks.map(c => c.bundleId)).toEqual(r1Chunks.map(c => c.bundleId));
    });

    it('places Tier-1 words before Tier-2/3/4 words and orders sources strictly', () => {
        // Seed p1 with one previously seen & unused bundle from p2 ('p2_0_0')
        const histChunks = collectAnswerChunks({}, mockAnswerHistory);
        const p2HistBundle = histChunks.find(c => c.authorId === 'p2').bundleId;

        const result = generateWordBanksDirectly({
            language: 'en',
            players: mockPlayers,
            playerAnswers: mockPlayerAnswers,
            answerHistory: mockAnswerHistory,
            battleSchedule: JSON.parse(JSON.stringify(mockBattleSchedule)),
            preGeneratedFallbackWords: ['cosmic disco fever', 'turbo rocket boots', 'electric banana split'],
            currentRound: 1,
            playerSeenChunks: { p1: [p2HistBundle] },
            battleHistory: []
        });

        const sourceOrderRank = { answer: 1, fallback: 2, connector: 3, punctuation: 4 };

        result.battleScheduleWithBanks.forEach(battle => {
            expect(battle.promptTokens.length).toBeGreaterThan(0);
            battle.promptTokens.forEach((pt, idx) => {
                expect(pt.id).toBe(`p_${idx}`);
                expect(pt.source).toBe('prompt');
            });

            battle.competitors.forEach(cId => {
                const bank = battle.wordBanks[cId];
                expect(bank).toBeDefined();

                let maxSourceRank = 0;
                let maxTierSeen = 0;
                bank.forEach((tok, idx) => {
                    expect(tok.id).toBe(`b_${idx}`);
                    const rank = sourceOrderRank[tok.source];
                    expect(rank).toBeGreaterThanOrEqual(maxSourceRank);
                    maxSourceRank = rank;

                    if (tok.tier) {
                        expect(tok.tier).toBeGreaterThanOrEqual(maxTierSeen);
                        maxTierSeen = tok.tier;
                    }
                });
            });
        });
    });

    it('balances banks across slots within one clause by distinct words and meets the Round 1 minimum (25 distinct words)', () => {
        const result = generateWordBanksDirectly({
            language: 'en',
            players: mockPlayers,
            playerAnswers: mockPlayerAnswers,
            answerHistory: mockAnswerHistory,
            battleSchedule: JSON.parse(JSON.stringify(mockBattleSchedule)),
            preGeneratedFallbackWords: [
                'quantum taco explosion',
                'neon cybernetic flamingo',
                'radioactive cheese wheel',
                'turbocharged disco llama'
            ],
            currentRound: 1,
            playerSeenChunks: {}
        });

        // Verify Tier-1 distinct word counts across all slots differ by no more than 1 clause's worth of words
        const allChunks = collectAnswerChunks(mockPlayerAnswers, mockAnswerHistory);
        const maxClauseWords = Math.max(...allChunks.map(c => c.words.length));

        const tier1DistinctCounts = [];
        result.battleScheduleWithBanks.forEach(battle => {
            battle.competitors.forEach(cId => {
                const bank = battle.wordBanks[cId];
                const tier1Tokens = bank.filter(t => t.source === 'answer' && t.tier === 1);
                tier1DistinctCounts.push(countDistinctWords(tier1Tokens));

                // Total distinct vocabulary words (excluding punctuation) must meet Round 1 min (25)
                const distinctTotal = countDistinctWords(bank);
                expect(distinctTotal).toBeGreaterThanOrEqual(25);

                // Guaranteed punctuation at the end
                const puncTokens = bank.filter(t => t.source === 'punctuation');
                expect(puncTokens.map(p => p.text)).toEqual(GUARANTEED_PUNCTUATION);
            });
        });

        const minTier1 = Math.min(...tier1DistinctCounts);
        const maxTier1 = Math.max(...tier1DistinctCounts);
        expect(maxTier1 - minTier1).toBeLessThanOrEqual(maxClauseWords);
    });

    it('never cuts or trims a bank when Tier 1 words exceed WORD_BANK_SIZES.max', () => {
        // Generate an unusually long answer (> 65 distinct words) for p2 so p1's single battle bank exceeds Round 1 max (50)
        const sixtyWords = Array.from({ length: 62 }, (_, i) => `uniqueword${i + 1}`).join(' ');
        const schedule = [
            { id: 'b_long', competitors: ['p1', 'p2'], prompt: 'Long bank test:' }
        ];
        const result = generateWordBanksDirectly({
            language: 'en',
            players: [{ id: 'p1', name: 'Alice' }, { id: 'p2', name: 'Bob' }],
            playerAnswers: {
                p1: { questions: [{ answer: 'Short answer from Alice here' }] },
                p2: { questions: [{ answer: sixtyWords }] }
            },
            answerHistory: [],
            battleSchedule: schedule,
            preGeneratedFallbackWords: [],
            currentRound: 1,
            playerSeenChunks: {}
        });

        const bankP1 = result.battleScheduleWithBanks[0].wordBanks.p1;
        const answerTokens = bankP1.filter(t => t.source === 'answer');
        expect(answerTokens.length).toBe(62);
        expect(countDistinctWords(bankP1)).toBeGreaterThanOrEqual(62);
    });

    it('only marks bundleIds as seen if they actually ended up in a player bank (fixes W4 & W8)', () => {
        // Suppose p1 is not in any battle this round, while p2 and p3 compete; p4 authored extra chunks
        const schedule = [
            { id: 'b1', competitors: ['p2', 'p3'], prompt: 'Duel:' }
        ];
        const answers = {
            p1: { questions: [{ answer: 'Unrelated clause one, unrelated clause two' }] },
            p2: { questions: [{ answer: 'Bob clause alpha, Bob clause beta' }] },
            p3: { questions: [{ answer: 'Charlie clause gamma, Charlie clause delta' }] }
        };

        const result = generateWordBanksDirectly({
            language: 'en',
            players: mockPlayers,
            playerAnswers: answers,
            answerHistory: [],
            battleSchedule: schedule,
            preGeneratedFallbackWords: [],
            currentRound: 1,
            playerSeenChunks: {}
        });

        // p1 had no bank, so p1 saw nothing
        expect(result.updatedPlayerSeenChunks.p1).toEqual([]);

        // Every bundleId marked seen for p2 must actually appear in p2's bank
        const p2BankBundles = new Set(
            result.battleScheduleWithBanks[0].wordBanks.p2
                .map(t => t.bundleId)
                .filter(Boolean)
        );
        expect(new Set(result.updatedPlayerSeenChunks.p2)).toEqual(p2BankBundles);

        // Seen chunks are keyed by bundleId, not raw text
        result.updatedPlayerSeenChunks.p2.forEach(id => {
            expect(id).toMatch(/^p\d+_\d+_\d+$/);
        });
    });

    it('populates Tier 2 only with clauses shown before where the player used NONE of the non-connector words', () => {
        const answerHistory = [
            { round: 1, playerId: 'p2', answer: 'spectacular velvet submarine, Mysterious goldencompass' }
        ];
        const chunks = collectAnswerChunks({}, answerHistory);
        expect(chunks).toHaveLength(2);
        const usedChunk = chunks[0];   // 'spectacular velvet submarine'
        const unusedChunk = chunks[1]; // 'Mysterious goldencompass'

        const schedule = [
            { id: 'b1', competitors: ['p1', 'p2'], prompt: 'Round 2 battle:' }
        ];

        // p1 was shown both chunks in Round 1, and used the word 'submarine' in a Round 1 battle answer
        const result = generateWordBanksDirectly({
            language: 'en',
            players: [{ id: 'p1', name: 'Alice' }, { id: 'p2', name: 'Bob' }],
            playerAnswers: {
                p1: { questions: [{ answer: 'Fresh Alice words for Bob' }] },
                p2: { questions: [{ answer: 'Fresh Bob words for Alice' }] }
            },
            answerHistory,
            battleSchedule: schedule,
            preGeneratedFallbackWords: [],
            currentRound: 2,
            playerSeenChunks: {
                p1: [usedChunk.bundleId, unusedChunk.bundleId]
            },
            battleHistory: [
                {
                    id: 'b-1-0',
                    competitors: ['p1', 'p2'],
                    answers: {
                        p1: 'I saw a submarine yesterday'
                    }
                }
            ]
        });

        const bankP1 = result.battleScheduleWithBanks[0].wordBanks.p1;
        const p1Bundles = new Set(bankP1.map(t => t.bundleId).filter(Boolean));

        // Unused seen chunk is included in Tier 2
        expect(p1Bundles.has(unusedChunk.bundleId)).toBe(true);
        const tier2Toks = bankP1.filter(t => t.bundleId === unusedChunk.bundleId);
        expect(tier2Toks.every(t => t.tier === 2)).toBe(true);

        // Used seen chunk ('submarine' was used by p1) is excluded from Tier 2
        expect(p1Bundles.has(usedChunk.bundleId)).toBe(false);
    });

    it('never assigns the same clause (bundleId) to two banks in the same round, except identical text by different authors', () => {
        const answers = {
            p1: { questions: [{ answer: 'identical magic phrase' }] },
            p2: { questions: [{ answer: 'identical magic phrase' }] },
            p3: { questions: [{ answer: 'unique charlie phrase' }] },
            p4: { questions: [{ answer: 'unique diana phrase' }] }
        };

        const result = generateWordBanksDirectly({
            language: 'en',
            players: mockPlayers,
            playerAnswers: answers,
            answerHistory: [],
            battleSchedule: JSON.parse(JSON.stringify(mockBattleSchedule)),
            preGeneratedFallbackWords: [],
            currentRound: 1,
            playerSeenChunks: {}
        });

        const bundleSlotMap = new Map();
        const magicPhraseBundles = new Set();

        result.battleScheduleWithBanks.forEach((battle, bIdx) => {
            battle.competitors.forEach(cId => {
                const bank = battle.wordBanks[cId];
                const slotBundles = new Set(bank.map(t => t.bundleId).filter(Boolean));
                slotBundles.forEach(bId => {
                    // Each bundleId can appear in at most ONE slot across the entire round
                    expect(bundleSlotMap.has(bId)).toBe(false);
                    bundleSlotMap.set(bId, `${bIdx}_${cId}`);
                });

                bank.filter(t => t.text === 'identical').forEach(t => {
                    magicPhraseBundles.add(t.bundleId);
                });
            });
        });

        // Both p1's and p2's identical text clauses have distinct bundleIds and were both distributed
        expect(magicPhraseBundles.size).toBe(2);
    });

    it('never gives players their own words, deduplicates filler against bank words, and distributes AI helpers without replacement', () => {
        const aiHelpers = [
            'intergalactic waffle iron',
            'invisible ninja squirrel',
            'radioactive marshmallow cannon',
            'supersonic platypus brigade',
            'cybernetic accordion solo',
            'enchanted disco broccoli',
            'thermally unstableburrito',
            'quantum polka penguin',
            'velvet chainsaw diplomacy',
            'gravity defying somersault'
        ];

        const result = generateWordBanksDirectly({
            language: 'en',
            players: mockPlayers,
            playerAnswers: {
                p1: { questions: [{ answer: 'intergalactic waffle alpha' }] },
                p2: { questions: [{ answer: 'invisible ninja beta' }] },
                p3: { questions: [{ answer: 'radioactive marshmallow gamma' }] },
                p4: { questions: [{ answer: 'supersonic platypus delta' }] }
            },
            answerHistory: [],
            battleSchedule: JSON.parse(JSON.stringify(mockBattleSchedule)),
            preGeneratedFallbackWords: aiHelpers,
            currentRound: 1,
            playerSeenChunks: {}
        });

        result.battleScheduleWithBanks.forEach(battle => {
            battle.competitors.forEach(cId => {
                const bank = battle.wordBanks[cId];
                const answerWordsLower = new Set();
                const fallbackAndConnectorWordsLower = new Set();

                bank.forEach(tok => {
                    if (tok.source === 'answer') {
                        expect(tok.authorId).not.toBe(cId);
                        answerWordsLower.add(tok.text.toLowerCase());
                    } else if (tok.source === 'fallback' || tok.source === 'connector') {
                        expect(tok.authorId).toBeNull();
                        const lower = tok.text.toLowerCase();
                        // Filler/connectors must never duplicate an answer word or another filler/connector word in the same bank
                        expect(answerWordsLower.has(lower)).toBe(false);
                        expect(fallbackAndConnectorWordsLower.has(lower)).toBe(false);
                        fallbackAndConnectorWordsLower.add(lower);
                    }
                });
            });
        });
    });

    it('keeps duplicate answer tiles visible in the bank while counting each distinct word only once toward the minimum', () => {
        // p2 writes an answer repeating the word "banana" 8 times
        const schedule = [
            { id: 'b_dup', competitors: ['p1', 'p2'], prompt: 'Duplicate test:' }
        ];
        const result = generateWordBanksDirectly({
            language: 'en',
            players: [{ id: 'p1', name: 'Alice' }, { id: 'p2', name: 'Bob' }],
            playerAnswers: {
                p1: { questions: [{ answer: 'appleapple orangeorange pearpear grapegrape' }] },
                p2: { questions: [{ answer: 'banana banana banana banana banana banana banana banana' }] }
            },
            answerHistory: [],
            battleSchedule: schedule,
            preGeneratedFallbackWords: [],
            currentRound: 1,
            playerSeenChunks: {}
        });

        const bankP1 = result.battleScheduleWithBanks[0].wordBanks.p1;
        const bananaTiles = bankP1.filter(t => t.text.toLowerCase() === 'banana');
        // All 8 "banana" tiles stay visible
        expect(bananaTiles).toHaveLength(8);
        // Yet the bank still reaches at least 25 distinct words!
        expect(countDistinctWords(bankP1)).toBeGreaterThanOrEqual(25);
    });

    it('guarantees minimum essential connectors and supports Ukrainian language with apostrophes', () => {
        const ukPlayerAnswers = {
            p1: { questions: [{ answer: "Я люблю мʼясо, зв’язок, ім'я, п'ять сімʼї." }] },
            p2: { questions: [{ answer: 'Таємничий космічний корабель летить далеко.' }] }
        };
        const ukSchedule = [
            { id: 'uk1', competitors: ['p1', 'p2'], prompt: 'Найкраща порада у житті:' }
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

        const bankP1 = result.battleScheduleWithBanks[0].wordBanks.p1;
        const bankP2 = result.battleScheduleWithBanks[0].wordBanks.p2;

        expect(countDistinctWords(bankP1)).toBeGreaterThanOrEqual(25);
        expect(countDistinctWords(bankP2)).toBeGreaterThanOrEqual(25);

        const ukConnectors = bankP1.filter(tok =>
            ESSENTIAL_CONNECTORS.uk.includes(tok.text.toLowerCase())
        );
        expect(ukConnectors.length).toBeGreaterThanOrEqual(4);

        const puncP1 = bankP1.filter(t => t.source === 'punctuation');
        expect(puncP1.map(p => p.text)).toEqual(GUARANTEED_PUNCTUATION);

        expect(extractCleanWords("мʼясо зв’язок ім'я п'ять сімʼї")).toEqual([
            'мʼясо', 'зв’язок', "ім'я", "п'ять", 'сімʼї'
        ]);
        expect(isStopwordOrConnector('the', 'en')).toBe(true);
        expect(isStopwordOrConnector('spaceship', 'en')).toBe(false);
        expect(isStopwordOrConnector('але', 'ua')).toBe(true);
        expect(isStopwordOrConnector('корабель', 'ua')).toBe(false);
    });
});
