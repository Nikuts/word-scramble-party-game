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

    it('populates Tier 2 only with unused earlier-round chunks strictly for different players who never saw them', () => {
        const answerHistory = [
            { round: 1, playerId: 'p2', answer: 'spectacular velvet submarine, Mysterious goldencompass' }
        ];
        const chunks = collectAnswerChunks({}, answerHistory);
        expect(chunks).toHaveLength(2);
        const usedChunk = chunks[0];   // 'spectacular velvet submarine'
        const unusedChunk = chunks[1]; // 'Mysterious goldencompass'

        const schedule = [
            { id: 'b1', competitors: ['p1', 'p3'], prompt: 'Round 2 battle:' }
        ];

        // p1 was shown both chunks in Round 1 and used 'submarine'; p3 never saw either chunk
        const result = generateWordBanksDirectly({
            language: 'en',
            players: [{ id: 'p1', name: 'Alice' }, { id: 'p2', name: 'Bob' }, { id: 'p3', name: 'Charlie' }],
            playerAnswers: {
                p1: { questions: [{ answer: 'Fresh Alice words for Charlie' }] },
                p2: { questions: [{ answer: 'Fresh Bob extra words' }] },
                p3: { questions: [{ answer: 'Fresh Charlie words for Alice' }] }
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
        const bankP3 = result.battleScheduleWithBanks[0].wordBanks.p3;
        const p1Bundles = new Set(bankP1.map(t => t.bundleId).filter(Boolean));
        const p3Bundles = new Set(bankP3.map(t => t.bundleId).filter(Boolean));

        // p1 must NEVER receive a chunk they already saw in Round 1 (even unusedChunk)
        expect(p1Bundles.has(unusedChunk.bundleId)).toBe(false);
        expect(p1Bundles.has(usedChunk.bundleId)).toBe(false);

        // p3 did NOT see unusedChunk in Round 1 and no content word was used -> p3 receives it in Tier 2
        expect(p3Bundles.has(unusedChunk.bundleId)).toBe(true);
        const tier2Toks = bankP3.filter(t => t.bundleId === unusedChunk.bundleId);
        expect(tier2Toks.every(t => t.tier === 2)).toBe(true);

        // usedChunk ('submarine' was used globally) stays retired for p3 as well
        expect(p3Bundles.has(usedChunk.bundleId)).toBe(false);
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

    it('globally retires clauses used in a past battle answer so other players never receive them in later rounds', () => {
        const answerHistory = [
            { round: 1, playerId: 'p1', answer: 'radioactive squirrel invasion, enchanted crystal pancake' },
            { round: 1, playerId: 'p2', answer: 'supersonic narwhal symphony, mysterious velvet telescope' }
        ];
        const r1Chunks = collectAnswerChunks({}, answerHistory);
        const usedP1Chunk = r1Chunks.find(c => c.chunkText.includes('squirrel'));
        const unusedP1Chunk = r1Chunks.find(c => c.chunkText.includes('pancake'));

        // In Round 1, p2 saw usedP1Chunk and used it in a battle answer.
        // In Round 2, p3 (who never saw usedP1Chunk in Round 1!) competes against p4.
        // p3 must NOT receive usedP1Chunk in Tier 1 or Tier 2 because it was already used in a battle!
        const r2Schedule = [
            { id: 'b-2-0', competitors: ['p3', 'p4'], prompt: 'Round 2 showdown:' }
        ];
        const result = generateWordBanksDirectly({
            language: 'en',
            players: mockPlayers,
            playerAnswers: {
                p1: { questions: [{ answer: 'fresh round two alpha clause' }] },
                p2: { questions: [{ answer: 'fresh round two beta clause' }] },
                p3: { questions: [{ answer: 'fresh round two gamma clause' }] },
                p4: { questions: [{ answer: 'fresh round two delta clause' }] }
            },
            answerHistory,
            battleSchedule: r2Schedule,
            preGeneratedFallbackWords: [],
            currentRound: 2,
            playerSeenChunks: {
                p2: [usedP1Chunk.bundleId]
            },
            playerUsedBundles: {
                p2: [usedP1Chunk.bundleId]
            },
            battleHistory: [
                {
                    id: 'b-1-0',
                    competitors: ['p2', 'p3'],
                    answers: {
                        p2: 'radioactive squirrel invasion today'
                    }
                }
            ]
        });

        const bankP3 = result.battleScheduleWithBanks[0].wordBanks.p3;
        const bankP4 = result.battleScheduleWithBanks[0].wordBanks.p4;
        const allR2BundleIds = new Set([
            ...bankP3.map(t => t.bundleId).filter(Boolean),
            ...bankP4.map(t => t.bundleId).filter(Boolean)
        ]);

        // The clause used by p2 in Round 1 is globally retired and never given to p3 or p4 in Round 2
        expect(allR2BundleIds.has(usedP1Chunk.bundleId)).toBe(false);
        // Meanwhile, the unused clause from Round 1 is still eligible to be distributed
        expect(allR2BundleIds.has(unusedP1Chunk.bundleId)).toBe(true);
    });

    it('avoids repeating previously shown or battle-used fallback words to players in subsequent rounds', () => {
        const r1Schedule = [
            { id: 'b-1-0', competitors: ['p1', 'p2'], prompt: 'Round 1 duel:' }
        ];
        const r1Result = generateWordBanksDirectly({
            language: 'en',
            players: [mockPlayers[0], mockPlayers[1]],
            playerAnswers: {
                p1: { questions: [{ answer: 'tiny alpha word' }] },
                p2: { questions: [{ answer: 'tiny beta word' }] }
            },
            answerHistory: [],
            battleSchedule: r1Schedule,
            preGeneratedFallbackWords: [],
            currentRound: 1,
            playerSeenChunks: {},
            battleHistory: []
        });

        const r1BankP1 = r1Result.battleScheduleWithBanks[0].wordBanks.p1;
        const r1FallbacksP1 = r1BankP1
            .filter(t => t.source === 'fallback' && !isStopwordOrConnector(t.text, 'en'))
            .map(t => t.text.toLowerCase());
        expect(r1FallbacksP1.length).toBeGreaterThan(0);

        // Suppose p1 used the first fallback word in their Round 1 battle answer
        const usedFallbackWord = r1FallbacksP1[0];

        const r2Schedule = [
            { id: 'b-2-0', competitors: ['p1', 'p2'], prompt: 'Round 2 duel:' }
        ];
        const r2Result = generateWordBanksDirectly({
            language: 'en',
            players: [mockPlayers[0], mockPlayers[1]],
            playerAnswers: {
                p1: { questions: [{ answer: 'second round alpha phrase' }] },
                p2: { questions: [{ answer: 'second round beta phrase' }] }
            },
            answerHistory: [],
            battleSchedule: r2Schedule,
            preGeneratedFallbackWords: [],
            currentRound: 2,
            playerSeenChunks: r1Result.updatedPlayerSeenChunks,
            battleHistory: [
                {
                    id: 'b-1-0',
                    competitors: ['p1', 'p2'],
                    answers: {
                        p1: `${usedFallbackWord} forever`,
                        p2: 'nothing special'
                    },
                    wordBanks: r1Result.battleScheduleWithBanks[0].wordBanks
                }
            ]
        });

        const r2BankP1 = r2Result.battleScheduleWithBanks[0].wordBanks.p1;
        const r2BankP2 = r2Result.battleScheduleWithBanks[0].wordBanks.p2;
        const r2FallbacksP1 = new Set(
            r2BankP1
                .filter(t => t.source === 'fallback' && !isStopwordOrConnector(t.text, 'en'))
                .map(t => t.text.toLowerCase())
        );
        const r2FallbacksP2 = new Set(
            r2BankP2
                .filter(t => t.source === 'fallback' && !isStopwordOrConnector(t.text, 'en'))
                .map(t => t.text.toLowerCase())
        );

        // Neither p1 nor p2 should get the fallback word that was used in a Round 1 battle answer
        expect(r2FallbacksP1.has(usedFallbackWord)).toBe(false);
        expect(r2FallbacksP2.has(usedFallbackWord)).toBe(false);

        // And p1 should receive fresh fallback words in Round 2 without repeating their Round 1 fallback pool
        const overlapCount = r1FallbacksP1.filter(w => r2FallbacksP1.has(w)).length;
        expect(overlapCount).toBe(0);
    });

    it('keeps unused duplicate-phrase instances (written by different players or in separate answers by the same player) eligible after one instance is used', () => {
        // Case A: Same phrase written by different players (p1_0_0 and p2_0_0)
        // Case B: Same phrase written by the same player in two separate answers (p1_0_0 and p1_1_0)
        const answerHistory = [
            { round: 1, playerId: 'p1', answer: 'radioactive pancake wizard' }, // p1_0_0
            { round: 1, playerId: 'p1', answer: 'radioactive pancake wizard' }, // p1_1_0
            { round: 1, playerId: 'p2', answer: 'radioactive pancake wizard' }  // p2_0_0
        ];
        const chunks = collectAnswerChunks({}, answerHistory);
        expect(chunks.map(c => c.bundleId)).toEqual(['p1_0_0', 'p1_1_0', 'p2_0_0']);

        // In Round 1, p3 saw ONLY p1_0_0 and used it in a battle answer.
        // p1_1_0 (Alice's second answer) and p2_0_0 (Bob's answer) have distinct bundleIds and were never used.
        const r2Schedule = [
            { id: 'b-2-0', competitors: ['p3', 'p4'], prompt: 'Round 2 showdown:' }
        ];
        const result = generateWordBanksDirectly({
            language: 'en',
            players: mockPlayers,
            playerAnswers: {},
            answerHistory,
            battleSchedule: r2Schedule,
            preGeneratedFallbackWords: [],
            currentRound: 2,
            playerSeenChunks: {
                p3: ['p1_0_0']
            },
            playerUsedBundles: {
                p3: ['p1_0_0']
            },
            battleHistory: [
                {
                    id: 'b-1-0',
                    competitors: ['p3', 'p4'],
                    answers: {
                        p3: 'radioactive pancake wizard'
                    }
                }
            ]
        });

        const allR2BundleIds = new Set([
            ...result.battleScheduleWithBanks[0].wordBanks.p3.map(t => t.bundleId).filter(Boolean),
            ...result.battleScheduleWithBanks[0].wordBanks.p4.map(t => t.bundleId).filter(Boolean)
        ]);

        // Only the specific bundleId that was used (p1_0_0) is retired
        expect(allR2BundleIds.has('p1_0_0')).toBe(false);
        // The identical-text second answer by the same player (p1_1_0) and by another player (p2_0_0) remain eligible
        expect(allR2BundleIds.has('p1_1_0')).toBe(true);
        expect(allR2BundleIds.has('p2_0_0')).toBe(true);
    });

    it('never assigns two identical-text clauses (different bundleIds) to the same player across two slots in the same round', () => {
        const answerHistory = [
            { round: 1, playerId: 'p1', answer: 'radioactive pancake wizard' },
            { round: 1, playerId: 'p2', answer: 'radioactive pancake wizard' },
            { round: 1, playerId: 'p4', answer: 'turbocharged flamingo submarine' },
            { round: 1, playerId: 'p4', answer: 'intergalactic pickles on toast' },
        ];

        const r2Schedule = [
            { id: 'b-2-0', competitors: ['p3', 'p4'], prompt: 'Battle 1:' },
            { id: 'b-2-1', competitors: ['p3', 'p1'], prompt: 'Battle 2:' },
        ];

        const result = generateWordBanksDirectly({
            language: 'en',
            players: mockPlayers,
            playerAnswers: {},
            answerHistory,
            battleSchedule: r2Schedule,
            preGeneratedFallbackWords: ['banana', 'cactus', 'disco', 'elbow', 'ferret', 'goblin', 'hammer', 'igloo', 'jester', 'kazoo', 'llama', 'muffin', 'noodle', 'octopus'],
            currentRound: 2,
            playerSeenChunks: {},
            playerUsedBundles: {},
            battleHistory: [],
        });

        const getBundleTextsForPlayer = (playerId) => {
            const texts = [];
            for (const b of result.battleScheduleWithBanks) {
                if (!b.wordBanks[playerId]) continue;
                const seenBundlesInSlot = new Set();
                const byBundle = new Map();
                for (const tok of b.wordBanks[playerId]) {
                    if (!tok.bundleId) continue;
                    if (!byBundle.has(tok.bundleId)) byBundle.set(tok.bundleId, []);
                    byBundle.get(tok.bundleId).push(tok.text);
                }
                for (const [bId, words] of byBundle.entries()) {
                    seenBundlesInSlot.add(bId);
                    texts.push(words.join(' ').trim().toLowerCase());
                }
            }
            return texts;
        };

        const p3ClauseTexts = getBundleTextsForPlayer('p3');
        const duplicateMatches = p3ClauseTexts.filter(t => t === 'radioactive pancake wizard');
        expect(duplicateMatches.length).toBeLessThanOrEqual(1);
    });

    it('avoids stacking near-identical content-word clauses from different authors into the same bank', () => {
        const answers = {
            p1: { questions: [{ answer: 'radioactive pancake wizard comet' }] },
            p2: { questions: [{ answer: 'radioactive pancake wizard nova' }] },
            p3: { questions: [{ answer: 'velvet chainsaw pickle orchestra' }] },
            p4: { questions: [{ answer: 'haunted espresso toaster parade' }] }
        };

        const result = generateWordBanksDirectly({
            language: 'en',
            players: mockPlayers,
            playerAnswers: answers,
            answerHistory: [],
            battleSchedule: JSON.parse(JSON.stringify(mockBattleSchedule)),
            preGeneratedFallbackWords: ['spark', 'drift', 'chaos', 'goblin', 'velvet', 'comet', 'lantern', 'mango', 'thunder', 'pocket'],
            currentRound: 1,
            playerSeenChunks: {}
        });

        // For every battle slot belonging to p3 or p4, p1's and p2's near-identical pancake wizard answers must not stack in the same bank
        result.battleScheduleWithBanks.forEach(battle => {
            ['p3', 'p4'].forEach(pid => {
                if (!battle.wordBanks?.[pid]) return;
                const p1Tokens = battle.wordBanks[pid].filter(t => t.authorId === 'p1');
                const p2Tokens = battle.wordBanks[pid].filter(t => t.authorId === 'p2');
                expect(p1Tokens.length > 0 && p2Tokens.length > 0).toBe(false);
            });
        });
    });

    it('refuses to stack heavy content-word duplicates into an already-seeded bank even when chunks > slots', () => {
        const answers = {
            p1: {
                questions: [
                    { answer: 'turbo squirrel cheese pizza galaxy' },
                    { answer: 'velvet saxophone waffle astronaut' }
                ]
            },
            p2: {
                questions: [
                    { answer: 'turbo squirrel cheese pizza nebula' },
                    { answer: 'cosmic trampoline pickle orchestra' }
                ]
            },
            p3: {
                questions: [
                    { answer: 'magnetic hamster banjo tornado' },
                    { answer: 'disco flamingo toaster volcano' }
                ]
            },
            p4: {
                questions: [
                    { answer: 'quantum pretzel octopus safari' },
                    { answer: 'neon kangaroo pancakes circus' }
                ]
            }
        };

        const result = generateWordBanksDirectly({
            language: 'en',
            players: mockPlayers,
            playerAnswers: answers,
            answerHistory: [],
            battleSchedule: JSON.parse(JSON.stringify(mockBattleSchedule)),
            preGeneratedFallbackWords: ['spark', 'drift', 'chaos', 'lantern', 'mango', 'thunder', 'pocket', 'comet', 'velvet', 'bubble'],
            currentRound: 1,
            playerSeenChunks: {}
        });

        result.battleScheduleWithBanks.forEach(battle => {
            ['p1', 'p2', 'p3', 'p4'].forEach(pid => {
                if (!battle.wordBanks?.[pid]) return;
                const p1Dup = battle.wordBanks[pid].filter(t => t.authorId === 'p1' && t.text.toLowerCase() === 'squirrel');
                const p2Dup = battle.wordBanks[pid].filter(t => t.authorId === 'p2' && t.text.toLowerCase() === 'squirrel');
                expect(p1Dup.length > 0 && p2Dup.length > 0).toBe(false);
            });
        });
    });

    it('includes versatile Ukrainian glue connectors in ESSENTIAL_CONNECTORS.uk', () => {
        expect(ESSENTIAL_CONNECTORS.uk).toEqual(expect.arrayContaining(['не', 'як', 'що', 'вже', 'ще', 'все', 'коли', 'хто', 'наче', 'ніби', 'тому', 'зате']));
    });
});
