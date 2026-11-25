<!-- src/lib/dev/DevHarness.svelte -->
<script>
    import { onMount } from 'svelte';
    import confetti from 'canvas-confetti';
    import DevToolbar from './DevToolbar.svelte';
    import {
        gameState,
        currentPlayer,
        language as appLanguage,
        tvMode,
        isHostDisplay,
        showBattleHistory
    } from '../../stores.js';
    import {
        MOCK_PLAYERS_3_LOW_SCORE,
        MOCK_PLAYERS_6,
        MOCK_PLAYERS_14,
        MOCK_WORD_BANK_EN,
        MOCK_WORD_BANK_UA,
        MOCK_SUPERLATIVES_OBJECT,
        MOCK_ACTIVE_BATTLE_REVEAL,
        createMockGameState
    } from './mockData.js';

    // Import Views
    import PlayerLobby from '../views/PlayerLobby.svelte';
    import PlayerAvatarSelect from '../views/PlayerAvatarSelect.svelte';
    import PlayerGameView from '../views/player_game/PlayerGameView.svelte';
    import HostLobby from '../views/HostLobby.svelte';
    import HostGameView from '../views/HostGameView.svelte';
    import AvatarGalleryView from './AvatarGalleryView.svelte';
    import Instructions from '../views/Instructions.svelte';
    import ArcadeToastContainer from '../shared/ArcadeToastContainer.svelte';

    // URL Query Params parser
    const KNOWN_SCREENS = new Set([
        'player_lobby', 'player_avatar', 'player_question', 'player_battle_single',
        'player_battle_movie', 'player_voting', 'player_reveal', 'player_results',
        'player_history', 'host_lobby', 'host_question', 'host_game_question',
        'host_answering', 'host_voting', 'host_reveal', 'host_podium',
        'instructions', 'avatar_gallery'
    ]);
    const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    const rawDebugScreen = urlParams.get('debug') || urlParams.get('screen');
    let activeScreen = (rawDebugScreen && KNOWN_SCREENS.has(rawDebugScreen)) ? rawDebugScreen : 'player_question';
    let playerCount = parseInt(urlParams.get('players')) || 6;
    let playerIndex = parseInt(urlParams.get('pIndex')) || 0;
    let language = urlParams.get('lang') || 'en';
    let viewport = urlParams.get('viewport') || (activeScreen.startsWith('host_') ? 'full' : 'mobile');
    let hideToolbar = urlParams.get('hideToolbar') === '1' || urlParams.get('hideToolbar') === 'true';
    let isGeneratingThemes = urlParams.get('generatingThemes') === '1';
    let mockColorTheme = urlParams.get('colorTheme') || 'arcade';
    let forceCompetitors = parseInt(urlParams.get('competitors')) || 0;

    let tileCount = parseInt(urlParams.get('tiles')) || 35;
    let isTvMode = urlParams.get('tvMode') === '1' || urlParams.get('tvMode') === 'true';
    let previewIframe = null;
    let iframeSrc = '';

    function buildAnswerMap(competitors, isUkrainian) {
        const samples = isUkrainian
            ? [
                'лазерна картопля кричить у подушку',
                'пухнастий борсук викрав усю піцу',
                'ніколи не вибачатися за сир',
                'турбо качки захопили всесвіт'
            ]
            : [
                'nut ammo for his revolution',
                'screaming fluffy badger disco champion',
                'never apologize with hot pizzas',
                'unleash turbo ducks across the universe'
            ];
        const map = {};
        competitors.forEach((cid, idx) => {
            map[cid] = samples[idx % samples.length];
        });
        return map;
    }

    function setupMockStores() {
        appLanguage.set(language);
        tvMode.set(isTvMode);
        isHostDisplay.set(activeScreen.startsWith('host_'));
        showBattleHistory.set(activeScreen === 'player_history');
        if (typeof document !== 'undefined') {
            document.body.dataset.theme = mockColorTheme;
        }

        const isUkrainian = language === 'ua' || language === 'uk';
        const baseBank = isUkrainian ? MOCK_WORD_BANK_UA : MOCK_WORD_BANK_EN;
        const slicedBank = baseBank.slice(0, tileCount);
        const bankTokens = slicedBank.map((item, i) => ({
            id: `wb-${i}`,
            text: item.word ?? item.text ?? String(item),
            authorId: item.authorId || 'p2',
            isPrompt: false
        }));

        const selectedPlayers = playerCount === 3 ? MOCK_PLAYERS_3_LOW_SCORE : (playerCount === 14 ? MOCK_PLAYERS_14 : MOCK_PLAYERS_6);
        const pickedPlayer = selectedPlayers[playerIndex] || selectedPlayers[0];
        const activePlayer = {
            ...pickedPlayer,
            isHost: activeScreen.startsWith('host_') || Boolean(pickedPlayer?.isHost),
            isReady: true,
            isConnected: true,
            score: pickedPlayer?.score ?? 2800,
            hasUsedTimeBoost: false
        };

        currentPlayer.set(activePlayer);

        const isQuadBattle = forceCompetitors === 4 || (!forceCompetitors && playerCount >= 10);
        const isDuoBattle = forceCompetitors === 2;
        const targetCompetitorCount = isQuadBattle ? 4 : (isDuoBattle ? 2 : 3);

        let mockCompetitors;
        if (activeScreen === 'player_voting') {
            mockCompetitors = selectedPlayers
                .filter(p => p.id !== activePlayer.id)
                .slice(0, Math.min(targetCompetitorCount, Math.max(2, selectedPlayers.length - 1)))
                .map(p => p.id);
        } else {
            mockCompetitors = selectedPlayers.slice(0, targetCompetitorCount).map(p => p.id);
            if ((activeScreen === 'player_battle_single' || activeScreen === 'player_battle_movie' || activeScreen === 'player_reveal') && !mockCompetitors.includes(activePlayer.id)) {
                mockCompetitors[0] = activePlayer.id;
            }
        }

        const isBattleAnsweringScreen = activeScreen === 'player_battle_single' || activeScreen === 'player_battle_movie';
        const battleAnswers = buildAnswerMap(mockCompetitors, isUkrainian);
        if (isBattleAnsweringScreen) {
            delete battleAnswers[activePlayer.id];
        }

        const singleBattle = {
            id: 'b-1-0',
            prompt: isUkrainian ? 'Що войовнича білка вимагала в обмін на ключі від вашої машини:' : 'What the militant squirrel demanded in exchange for your car keys:',
            promptTokens: (isUkrainian
                ? ['Що', 'войовнича', 'білка', 'вимагала', 'в', 'обмін', 'на', 'ключі', 'від', 'вашої', 'машини:']
                : ['What', 'the', 'militant', 'squirrel', 'demanded', 'in', 'exchange', 'for', 'your', 'car', 'keys:']
            ).map((t, i) => ({ id: `pt-${i}`, text: t, isPrompt: true })),
            competitors: mockCompetitors,
            formatConfig: { type: 'single_line' },
            answers: battleAnswers,
            wordBanks: {
                [activePlayer.id]: bankTokens,
                p1: bankTokens
            },
            votes: activeScreen === 'player_voting'
                ? {}
                : { p1: ['p5'], p2: ['p6', 'p7'], p3: [], ...(isQuadBattle ? { p4: ['p8'] } : {}) },
            scores: { p1: 300, p2: 1200, p3: 0, ...(isQuadBattle ? { p4: 250 } : {}) },
            winnerIds: ['p2'],
            winningAnswer: isUkrainian ? 'пухнастий борсук викрав усю піцу' : 'screaming fluffy badger disco champion',
            wordBank: slicedBank
        };

        const movieGenre = isUkrainian ? 'Низькобюджетна фантастика' : 'Low-Budget Sci-Fi';
        const moviePremise = isUkrainian ? 'Дві ворогуючі бабусі беруть участь у підпільних перегонах на машинах часу.' : 'Two rival grandmas compete in an underground time-traveling street racing tournament.';
        const movieBattle = {
            ...singleBattle,
            id: 'b-3-0',
            genre: movieGenre,
            premise: moviePremise,
            promptTokens: (isUkrainian
                ? ['Дві', 'ворогуючі', 'бабусі', 'беруть', 'участь', 'у', 'підпільних', 'перегонах', 'на', 'машинах', 'часу.']
                : ['Two', 'rival', 'grandmas', 'compete', 'in', 'an', 'underground', 'time-traveling', 'street', 'racing', 'tournament.']
            ).map((t, i) => ({ id: `pt-m-${i}`, text: t, isPrompt: true })),
            formatConfig: {
                formatType: 'multi_line',
                genre: movieGenre,
                premise: moviePremise,
                labels: isUkrainian ? ['Назва фільму', 'Слоган'] : ['Movie Title', 'Tagline']
            }
        };

        let phase = 'lobby';
        if (activeScreen === 'player_question' || activeScreen === 'host_question' || activeScreen === 'host_game_question') phase = 'question';
        else if (activeScreen === 'host_answering' || activeScreen === 'player_battle_single' || activeScreen === 'player_battle_movie') phase = 'battle_answering';
        else if (activeScreen === 'host_voting' || activeScreen === 'player_voting' || activeScreen.includes('voting')) phase = 'battle_voting';
        else if (activeScreen === 'host_reveal' || activeScreen === 'player_reveal' || activeScreen.includes('reveal')) phase = 'battle_result_reveal';
        else if (activeScreen.includes('results') || activeScreen.includes('podium') || activeScreen === 'host_podium' || activeScreen === 'player_history') phase = 'results';

        let currentBattle = activeScreen === 'player_battle_movie' ? movieBattle : singleBattle;
        if (activeScreen === 'host_reveal' || activeScreen === 'player_reveal' || activeScreen === 'player_history') {
            currentBattle = isUkrainian
                ? {
                    ...singleBattle,
                    annotatedAnswers: {
                        p1: {
                            words: [
                                { text: 'лазерна', authorIndex: 1 },
                                { text: 'картопля', authorIndex: 2 },
                                { text: 'кричить', authorIndex: 3 },
                                { text: 'у', authorIndex: 4 },
                                { text: 'подушку', authorIndex: 1 }
                            ]
                        },
                        p2: {
                            words: [
                                { text: 'пухнастий', authorIndex: 0 },
                                { text: 'борсук', authorIndex: 2 },
                                { text: 'викрав', authorIndex: 3 },
                                { text: 'усю', authorIndex: 0 },
                                { text: 'піцу', authorIndex: 2 }
                            ]
                        },
                        p3: {
                            words: [
                                { text: 'ніколи', authorIndex: 0 },
                                { text: 'не', authorIndex: 1 },
                                { text: 'вибачатися', authorIndex: 3 },
                                { text: 'за', authorIndex: 1 },
                                { text: 'сир', authorIndex: 4 }
                            ]
                        },
                        ...(isQuadBattle ? {
                            p4: {
                                words: [
                                    { text: 'турбо', authorIndex: 1 },
                                    { text: 'качки', authorIndex: 2 },
                                    { text: 'захопили', authorIndex: 0 },
                                    { text: 'всесвіт', authorIndex: 3 }
                                ]
                            }
                        } : {})
                    },
                    votes: { p4: 'p2', p5: 'p2', p6: 'p1' },
                    winnerId: 'p2',
                    pointsAwarded: {
                        ...MOCK_ACTIVE_BATTLE_REVEAL.pointsAwarded,
                        ...(isQuadBattle ? { p4: 250 } : {})
                    },
                    scoreBreakdown: {
                        ...MOCK_ACTIVE_BATTLE_REVEAL.scoreBreakdown,
                        ...(isQuadBattle ? { p4: { votes: 1, votePoints: 250, winBonus: 0, sweepBonus: 0, rainbowBonus: 0 } } : {})
                    },
                    royalties: [
                        { authorId: 'p1', authorName: 'Alice', points: 150 },
                        { authorId: 'p2', authorName: 'Bob', points: 200 }
                    ]
                }
                : {
                    ...singleBattle,
                    ...MOCK_ACTIVE_BATTLE_REVEAL,
                    competitors: mockCompetitors,
                    answers: {
                        ...MOCK_ACTIVE_BATTLE_REVEAL.answers,
                        ...(isQuadBattle ? { p4: 'unleash turbo ducks across the universe' } : {})
                    },
                    annotatedAnswers: {
                        ...MOCK_ACTIVE_BATTLE_REVEAL.annotatedAnswers,
                        ...(isQuadBattle ? {
                            p4: {
                                words: [
                                    { text: 'unleash', authorIndex: 1 },
                                    { text: 'turbo', authorIndex: 2 },
                                    { text: 'ducks', authorIndex: 0 },
                                    { text: 'across', authorIndex: 3 },
                                    { text: 'the', authorIndex: 1 },
                                    { text: 'universe', authorIndex: 4 }
                                ]
                            }
                        } : {})
                    },
                    pointsAwarded: {
                        ...MOCK_ACTIVE_BATTLE_REVEAL.pointsAwarded,
                        ...(isQuadBattle ? { p4: 250 } : {})
                    },
                    scoreBreakdown: {
                        ...MOCK_ACTIVE_BATTLE_REVEAL.scoreBreakdown,
                        ...(isQuadBattle ? { p4: { votes: 1, votePoints: 250, winBonus: 0, sweepBonus: 0, rainbowBonus: 0 } } : {})
                    },
                    royalties: [
                        { authorId: 'p1', authorName: 'Alice', points: 150 },
                        { authorId: 'p2', authorName: 'Bob', points: 200 }
                    ]
                };
        }

        const mockQuestions = [
            { id: 'q1', text: isUkrainian ? "Яке правило №1 у групі підтримки для людей, які не можуть відкрити пакети?" : "What is the #1 rule in a support group for people who can't open plastic bags?", answer: "" },
            { id: 'q2', text: isUkrainian ? "Що ви кричите, коли босою ногою наступаєте на лего в темряві?" : "What do you scream when you accidentally drop your phone in the toilet?", answer: "" },
            { id: 'q3', text: isUkrainian ? "Яку таємницю приховує ваш холодильник пізно вночі?" : "What is the most suspicious excuse for arriving 2 hours late to a party?", answer: "" }
        ];

        const playerAnswers = {
            p1: { questions: [{ answer: 'a' }, { answer: 'b' }, { answer: 'c' }], rerollsLeft: 1 },
            p2: { questions: [{ answer: 'a' }, { answer: 'b' }, { answer: '' }], rerollsLeft: 1 },
            p3: { questions: [{ answer: '' }, { answer: '' }, { answer: '' }], rerollsLeft: 1 },
            p4: { questions: [{ answer: 'a' }, { answer: 'b' }, { answer: 'c' }], rerollsLeft: 1 },
            p5: { questions: [{ answer: 'a' }, { answer: '' }, { answer: '' }], rerollsLeft: 1 },
            p6: { questions: [{ answer: '' }, { answer: '' }, { answer: '' }], rerollsLeft: 1 }
        };
        if (activeScreen === 'player_question') {
            playerAnswers[activePlayer.id] = { questions: mockQuestions, rerollsLeft: 1 };
        }

        gameState.set(createMockGameState({
            phase,
            language,
            colorTheme: mockColorTheme,
            players: selectedPlayers,
            theme: isGeneratingThemes ? '' : (isUkrainian ? 'Звичайні речі, епічні передісторії' : 'Everyday Objects, Epic Backstories'),
            isGeneratingThemes,
            ...(isGeneratingThemes ? { preGeneratedThemes: { en: [], uk: [] } } : {}),
            currentRound: activeScreen.includes('movie') || activeScreen.includes('podium') ? 3 : 1,
            battleSchedule: [currentBattle],
            battleHistory: [currentBattle],
            currentVotingBattleIndex: 0,
            currentBattleIndex: 0,
            activeBattle: currentBattle,
            superlatives: MOCK_SUPERLATIVES_OBJECT,
            phaseTimer: activeScreen.includes('question') ? 80 : (activeScreen.includes('voting') ? 30 : 65),
            playerAnswers
        }));
    }

    function buildIframeSrc() {
        const params = new URLSearchParams({
            debug: activeScreen,
            players: String(playerCount),
            pIndex: String(playerIndex),
            lang: language,
            tiles: String(tileCount),
            tvMode: isTvMode ? '1' : '0',
            colorTheme: mockColorTheme,
            generatingThemes: isGeneratingThemes ? '1' : '0',
            viewport: 'full',
            hideToolbar: '1'
        });
        if (forceCompetitors) {
            params.set('competitors', String(forceCompetitors));
        }
        return `/?${params.toString()}`;
    }

    function postToPreviewIframe(payload) {
        if (!useIframe || !previewIframe?.contentWindow || typeof window === 'undefined') return;
        previewIframe.contentWindow.postMessage(payload, window.location.origin);
    }

    function syncIframeState() {
        postToPreviewIframe({
            type: 'DEV_HARNESS_SYNC',
            state: {
                activeScreen,
                playerCount,
                playerIndex,
                language,
                tileCount,
                isTvMode,
                mockColorTheme,
                forceCompetitors,
                isGeneratingThemes
            }
        });
    }

    function handleResetState() {
        if (useIframe) {
            postToPreviewIframe({ type: 'DEV_HARNESS_RESET' });
        } else {
            setupMockStores();
        }
    }

    function handleTriggerConfetti() {
        if (useIframe) {
            postToPreviewIframe({ type: 'DEV_HARNESS_CONFETTI' });
            return;
        }
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });
    }

    $: useIframe = !hideToolbar && (viewport === 'mobile' || viewport === 'tablet');
    $: if (useIframe && !iframeSrc) {
        iframeSrc = buildIframeSrc();
    } else if (!useIframe && iframeSrc) {
        iframeSrc = '';
    }

    $: {
        activeScreen;
        playerCount;
        playerIndex;
        language;
        tileCount;
        viewport;
        isTvMode;
        mockColorTheme;
        if (useIframe) {
            syncIframeState();
        } else {
            setupMockStores();
        }
    }

    onMount(() => {
        if (!useIframe) {
            setupMockStores();
        }
        if (typeof window === 'undefined' || !hideToolbar) return;

        const handleMessage = (event) => {
            if (event.origin !== window.location.origin) return;
            const msg = event.data;
            if (!msg || typeof msg !== 'object') return;

            if (msg.type === 'DEV_HARNESS_SYNC' && msg.state) {
                const s = msg.state;
                if (s.activeScreen && KNOWN_SCREENS.has(s.activeScreen)) activeScreen = s.activeScreen;
                if (typeof s.playerCount === 'number') playerCount = s.playerCount;
                if (typeof s.playerIndex === 'number') playerIndex = s.playerIndex;
                if (typeof s.language === 'string') language = s.language;
                if (typeof s.tileCount === 'number') tileCount = s.tileCount;
                if (typeof s.isTvMode === 'boolean') isTvMode = s.isTvMode;
                if (typeof s.mockColorTheme === 'string') mockColorTheme = s.mockColorTheme;
                if (typeof s.forceCompetitors === 'number') forceCompetitors = s.forceCompetitors;
                if (typeof s.isGeneratingThemes === 'boolean') isGeneratingThemes = s.isGeneratingThemes;
            } else if (msg.type === 'DEV_HARNESS_RESET') {
                setupMockStores();
            } else if (msg.type === 'DEV_HARNESS_CONFETTI') {
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 }
                });
            }
        };

        window.addEventListener('message', handleMessage);
        return () => {
            window.removeEventListener('message', handleMessage);
        };
    });

    function handleScreenChange(e) {
        activeScreen = e.detail;
        if (activeScreen.startsWith('host_')) {
            viewport = 'full';
        } else if (viewport === 'full') {
            viewport = 'mobile';
        }
    }
</script>

<div class="h-[100dvh] max-h-[100dvh] w-full flex flex-col items-center justify-center {viewport === 'full' || hideToolbar ? 'p-0' : 'p-2'} relative overflow-hidden font-sans">
    <!-- Active Viewport Frame -->
    <div class="transition-all duration-300 relative z-10 w-full h-full flex justify-center items-center">
        {#if useIframe}
            <!-- True viewport iframe inside phone/tablet bezel so responsive breakpoints & fixed overlays match real devices -->
            <div class="{viewport === 'mobile'
                ? 'w-[424px] h-[882px] rounded-[44px] p-3 border-[5px]'
                : 'w-[812px] h-[940px] rounded-[36px] p-4 border-[6px]'
            } max-w-[calc(100vw-24px)] max-h-[calc(100dvh-16px)] bg-black border-gray-800 shadow-[0_0_50px_rgba(217,70,239,0.25)] flex flex-col relative overflow-hidden transition-all duration-300">
                {#if viewport === 'mobile'}
                    <div class="w-28 h-4 bg-gray-900 rounded-full mx-auto mb-2 flex-shrink-0"></div>
                {/if}
                <div class="flex-1 w-full min-h-0 overflow-hidden {viewport === 'mobile' ? 'rounded-[32px]' : 'rounded-[24px]'} flex flex-col relative bg-[#0a0914]">
                    <iframe
                        bind:this={previewIframe}
                        src={iframeSrc}
                        on:load={syncIframeState}
                        title={viewport === 'mobile' ? 'Mobile Preview (390px)' : 'Tablet Preview (768px)'}
                        data-testid="dev-device-frame"
                        class="w-full h-full border-0 bg-transparent"
                    ></iframe>
                </div>
                {#if viewport === 'mobile'}
                    <div class="w-32 h-1 bg-gray-700 rounded-full mx-auto mt-2 flex-shrink-0"></div>
                {/if}
            </div>
        {:else}
            <!-- Direct Full Screen / Playwright Unframed Render -->
            <div class="w-full h-full max-h-screen flex flex-col overflow-hidden">
                {#if activeScreen === 'host_lobby'}
                    <HostLobby />
                {:else if activeScreen.startsWith('host_')}
                    <HostGameView />
                {:else if activeScreen === 'instructions'}
                    <Instructions />
                {:else if activeScreen === 'avatar_gallery'}
                    <div class="w-full h-full overflow-y-auto">
                        <AvatarGalleryView />
                    </div>
                {:else if activeScreen === 'player_lobby'}
                    <PlayerLobby />
                {:else if activeScreen === 'player_avatar'}
                    <PlayerAvatarSelect />
                {:else}
                    <PlayerGameView />
                {/if}
            </div>
        {/if}
    </div>

    <!-- Floating Dev Toolbar -->
    <DevToolbar
        bind:activeScreen
        bind:playerCount
        bind:playerIndex
        bind:language
        bind:viewport
        bind:tileCount
        bind:isTvMode
        bind:colorTheme={mockColorTheme}
        bind:hideToolbar
        on:changeScreen={handleScreenChange}
        on:changePlayerCount={(e) => playerCount = e.detail}
        on:changePlayerIndex={(e) => playerIndex = e.detail}
        on:changeLang={(e) => language = e.detail}
        on:changeViewport={(e) => viewport = e.detail}
        on:changeTileCount={(e) => tileCount = e.detail}
        on:changeTheme={(e) => mockColorTheme = e.detail}
        on:toggleTvMode={(e) => isTvMode = e.detail}
        on:triggerConfetti={handleTriggerConfetti}
        on:resetState={handleResetState}
    />
    {#if !useIframe}
        <ArcadeToastContainer />
    {/if}
</div>
