<!-- src/lib/dev/DevHarness.svelte -->
<script>
    import { onMount } from 'svelte';
    import DevToolbar from './DevToolbar.svelte';
    import {
        gameState,
        currentPlayer,
        language as appLanguage,
        tvMode
    } from '../../stores.js';
    import {
        MOCK_PLAYERS_3_LOW_SCORE,
        MOCK_PLAYERS_6,
        MOCK_PLAYERS_14,
        MOCK_PLAYERS,
        MOCK_WORD_BANK_EN,
        MOCK_WORD_BANK_UA,
        MOCK_SUPERLATIVES_OBJECT,
        MOCK_SUPERLATIVES,
        MOCK_ACTIVE_BATTLE_REVEAL,
        createMockGameState
    } from './mockData.js';

    // Import Views
    import PlayerLobby from '../views/PlayerLobby.svelte';
    import PlayerAvatarSelect from '../views/PlayerAvatarSelect.svelte';
    import PlayerQuestionView from '../views/player_game/PlayerQuestionView.svelte';
    import PlayerBattleAnsweringView from '../views/player_game/PlayerBattleAnsweringView.svelte';
    import PlayerBattleVotingView from '../views/player_game/PlayerBattleVotingView.svelte';
    import PlayerBattleRevealView from '../views/player_game/PlayerBattleRevealView.svelte';
    import PlayerResultsView from '../views/player_game/PlayerResultsView.svelte';
    import HostLobby from '../views/HostLobby.svelte';
    import HostGameView from '../views/HostGameView.svelte';
    import AvatarGalleryView from './AvatarGalleryView.svelte';
    import Instructions from '../views/Instructions.svelte';
    // URL Query Params parser
    const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    let activeScreen = urlParams.get('debug') || urlParams.get('screen') || 'player_question';
    let playerCount = parseInt(urlParams.get('players')) || 6;
    let playerIndex = parseInt(urlParams.get('pIndex')) || 0;
    let language = urlParams.get('lang') || 'en';
    let viewport = urlParams.get('viewport') || (activeScreen.startsWith('host_') ? 'full' : 'mobile');
    let hideToolbar = urlParams.get('hideToolbar') === '1' || urlParams.get('hideToolbar') === 'true';

    $: activePlayerObj = (playerCount === 3 ? MOCK_PLAYERS_3_LOW_SCORE : (playerCount === 14 ? MOCK_PLAYERS_14 : MOCK_PLAYERS_6))[playerIndex] || (playerCount === 3 ? MOCK_PLAYERS_3_LOW_SCORE[0] : MOCK_PLAYERS_6[0]);
    let tileCount = 35;
    let isTvMode = false;

    let mockTimer = 45;
    let mockQuestions = [];
    let mockBattlesToAnswer = [];
    let mockActiveBattle = null;

    function setupMockStores() {
        appLanguage.set(language);
        tvMode.set(isTvMode);

        const isUkrainian = language === 'ua' || language === 'uk';
        const baseBank = isUkrainian ? MOCK_WORD_BANK_UA : MOCK_WORD_BANK_EN;
        const slicedBank = baseBank.slice(0, tileCount);

        const activePlayer = {
            id: 'p1',
            name: 'Alice',
            avatar: '🦊',
            isHost: activeScreen.startsWith('host_'),
            isReady: true,
            isConnected: true,
            score: 2800,
            hasUsedTimeBoost: false
        };

        currentPlayer.set(activePlayer);

        const singleBattle = {
            id: 'b-1-0',
            prompt: isUkrainian ? 'Що войовнича білка вимагала в обмін на ключі від вашої машини:' : 'What the militant squirrel demanded in exchange for your car keys:',
            promptTokens: (isUkrainian 
                ? ['Що', 'войовнича', 'білка', 'вимагала', 'в', 'обмін', 'на', 'ключі', 'від', 'вашої', 'машини:'] 
                : ['What', 'the', 'militant', 'squirrel', 'demanded', 'in', 'exchange', 'for', 'your', 'car', 'keys:']
            ).map((t, i) => ({ id: `pt-${i}`, text: t, isPrompt: true })),
            competitors: ['p1', 'p2', 'p3'],
            formatConfig: { type: 'single_line' },
            answers: {
                p1: isUkrainian ? 'лазерна картопля кричить у подушку' : 'nut ammo for his revolution',
                p2: isUkrainian ? 'пухнастий борсук викрав усю піцу' : 'screaming fluffy badger disco champion',
                p3: isUkrainian ? 'ніколи не вибачатися за сир' : 'never apologize with hot pizzas'
            },
            wordBanks: {
                p1: [
                    'nut', 'ammo', 'pistol', 'truck', 'cage', 'seed', 'for', 'his',
                    'revolution', 'branch', 'squirrel', 'militant', 'exchange', 'keys', 'your'
                ].map((w, i) => ({ id: `wb-${i}`, text: w, authorId: 'p2', isPrompt: false }))
            },
            votes: { p1: ['p4'], p2: ['p5', 'p6'], p3: [] },
            scores: { p1: 300, p2: 1200, p3: 0 },
            winnerIds: ['p2'],
            winningAnswer: isUkrainian ? 'пухнастий борсук викрав усю піцу' : 'screaming fluffy badger disco champion',
            wordBank: slicedBank
        };

        const movieBattle = {
            ...singleBattle,
            id: 'b-3-0',
            formatConfig: { type: 'multi_line', labels: isUkrainian ? ['Назва фільму', 'Слоган'] : ['Movie Title', 'Tagline'] },
            moviePrompt: {
                genre: isUkrainian ? 'Низькобюджетна фантастика' : 'Low-Budget Sci-Fi',
                premise: isUkrainian ? 'Дві ворогуючі бабусі беруть участь у підпільних перегонах на машинах часу.' : 'Two rival grandmas compete in an underground time-traveling street racing tournament.'
            }
        };

        let phase = 'lobby';
        if (activeScreen === 'player_question' || activeScreen === 'host_question' || activeScreen === 'host_game_question') phase = 'question';
        else if (activeScreen === 'host_answering' || activeScreen === 'player_battle_single' || activeScreen === 'player_battle_movie') phase = 'battle_answering';
        else if (activeScreen === 'host_voting' || activeScreen === 'player_voting' || activeScreen.includes('voting')) phase = 'battle_voting';
        else if (activeScreen === 'host_reveal' || activeScreen === 'player_reveal' || activeScreen.includes('reveal')) phase = 'battle_result_reveal';
        else if (activeScreen.includes('results') || activeScreen.includes('podium') || activeScreen === 'host_podium') phase = 'results';

        let currentBattle = activeScreen === 'player_battle_movie' ? movieBattle : singleBattle;
        if (activeScreen === 'host_reveal' || activeScreen === 'player_reveal') {
            currentBattle = {
                ...singleBattle,
                ...MOCK_ACTIVE_BATTLE_REVEAL,
                royalties: [
                    { authorName: 'Alice', points: 150 },
                    { authorName: 'Bob', points: 200 }
                ]
            };
        }
        mockActiveBattle = currentBattle;
        mockBattlesToAnswer = [currentBattle];

        mockQuestions = [
            { id: 'q1', text: isUkrainian ? "Яке правило №1 у групі підтримки для людей, які не можуть відкрити пакети?" : "What is the #1 rule in a support group for people who can't open plastic bags?", answer: "" },
            { id: 'q2', text: isUkrainian ? "Що ви кричите, коли босою ногою наступаєте на лего в темряві?" : "What do you scream when you accidentally drop your phone in the toilet?", answer: "" },
            { id: 'q3', text: isUkrainian ? "Яку таємницю приховує ваш холодильник пізно вночі?" : "What is the most suspicious excuse for arriving 2 hours late to a party?", answer: "" }
        ];

        const selectedPlayers = playerCount === 3 ? MOCK_PLAYERS_3_LOW_SCORE : (playerCount === 14 ? MOCK_PLAYERS_14 : MOCK_PLAYERS_6);

        gameState.set(createMockGameState({
            phase,
            language,
            players: selectedPlayers,
            theme: isUkrainian ? 'Звичайні речі, епічні передісторії' : 'Everyday Objects, Epic Backstories',
            currentRound: activeScreen.includes('movie') || activeScreen.includes('podium') ? 3 : 1,
            battleSchedule: [currentBattle],
            currentVotingBattleIndex: 0,
            currentBattleIndex: 0,
            activeBattle: currentBattle,
            superlatives: MOCK_SUPERLATIVES_OBJECT,
            phaseTimer: activeScreen.includes('question') ? 80 : (activeScreen.includes('voting') ? 30 : 65),
            playerAnswers: {
                p1: { questions: [{ answer: 'a' }, { answer: 'b' }, { answer: 'c' }] },
                p2: { questions: [{ answer: 'a' }, { answer: 'b' }] },
                p3: { questions: [] },
                p4: { questions: [{ answer: 'a' }, { answer: 'b' }, { answer: 'c' }] },
                p5: { questions: [{ answer: 'a' }] },
                p6: { questions: [] }
            }
        }));
    }

    $: activeScreen, playerCount, language, tileCount, viewport, isTvMode, setupMockStores();

    onMount(() => {
        setupMockStores();
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

<div class="h-screen max-h-screen w-full flex flex-col items-center justify-center {viewport === 'full' ? 'p-0' : 'p-2'} relative overflow-hidden font-sans">
    <!-- Active Viewport Frame -->
    <div class="transition-all duration-300 relative z-10 w-full h-full flex justify-center items-center">
        {#if viewport === 'mobile'}
            <!-- Mobile Phone Shell -->
            <div class="w-[390px] h-[810px] bg-black rounded-[44px] p-3 shadow-[0_0_50px_rgba(217,70,239,0.25)] border-[5px] border-gray-800 flex flex-col relative overflow-hidden">
                <!-- Phone Speaker / Dynamic Island -->
                <div class="w-28 h-4 bg-gray-900 rounded-full mx-auto mb-2 flex-shrink-0"></div>

                <!-- Screen Content Area -->
                <div class="flex-1 w-full overflow-y-auto rounded-[32px] flex flex-col relative">
                    <div class="synthwave-grid-background !absolute"></div>
                    <div class="relative z-10 flex-1 flex flex-col">
                    {#if activeScreen === 'player_lobby'}
                        <PlayerLobby />
                    {:else if activeScreen === 'player_avatar'}
                        <PlayerAvatarSelect />
                    {:else if activeScreen === 'player_question'}
                        <PlayerQuestionView timer={mockTimer} questions={mockQuestions} />
                    {:else if activeScreen === 'player_battle_single' || activeScreen === 'player_battle_movie'}
                        <PlayerBattleAnsweringView timer={mockTimer} battlesToAnswer={mockBattlesToAnswer} gameId="TEST" playerId="p1" />
                    {:else if activeScreen === 'player_voting'}
                        <PlayerBattleVotingView timer={mockTimer} battle={mockActiveBattle} player={{ id: 'p4', name: 'David', avatar: '💀' }} gameId="TEST" players={MOCK_PLAYERS} />
                    {:else if activeScreen === 'player_reveal'}
                        <PlayerBattleRevealView timer={mockTimer} battle={mockActiveBattle} player={{ id: 'p1', name: 'Alice', avatar: '🦊' }} players={MOCK_PLAYERS} />
                    {:else if activeScreen === 'player_results'}
                        <PlayerResultsView game={$gameState} player={activePlayerObj} />
                    {:else if activeScreen === 'avatar_gallery'}
                        <AvatarGalleryView />
                    {:else}
                        <PlayerQuestionView timer={mockTimer} questions={mockQuestions} />
                    {/if}
                    </div>
                </div>

                <!-- Home Bar -->
                <div class="w-32 h-1 bg-gray-700 rounded-full mx-auto mt-2 flex-shrink-0"></div>
            </div>
        {:else if viewport === 'tablet'}
            <!-- Tablet Shell -->
            <div class="w-[768px] h-[920px] bg-black rounded-[36px] p-4 shadow-[0_0_50px_rgba(217,70,239,0.25)] border-[6px] border-gray-800 flex flex-col relative overflow-hidden">
                <div class="flex-1 w-full overflow-y-auto rounded-[24px] flex flex-col relative">
                    <div class="synthwave-grid-background !absolute"></div>
                    <div class="relative z-10 flex-1 flex flex-col">
                    {#if activeScreen === 'player_lobby'}
                        <PlayerLobby />
                    {:else if activeScreen === 'player_avatar'}
                        <PlayerAvatarSelect />
                    {:else if activeScreen === 'player_question'}
                        <PlayerQuestionView timer={mockTimer} questions={mockQuestions} />
                    {:else if activeScreen === 'player_battle_single' || activeScreen === 'player_battle_movie'}
                        <PlayerBattleAnsweringView timer={mockTimer} battlesToAnswer={mockBattlesToAnswer} gameId="TEST" playerId="p1" />
                    {:else if activeScreen === 'player_voting'}
                        <PlayerBattleVotingView timer={mockTimer} battle={mockActiveBattle} player={{ id: 'p4', name: 'David', avatar: '💀' }} gameId="TEST" players={MOCK_PLAYERS} />
                    {:else if activeScreen === 'player_reveal'}
                        <PlayerBattleRevealView timer={mockTimer} battle={mockActiveBattle} player={{ id: 'p1', name: 'Alice', avatar: '🦊' }} players={MOCK_PLAYERS} />
                    {:else if activeScreen === 'player_results'}
                        <PlayerResultsView game={$gameState} player={activePlayerObj} />
                    {:else if activeScreen === 'instructions'}
                        <div class="overflow-y-auto h-full">
                            <Instructions />
                        </div>
                    {:else if activeScreen === 'avatar_gallery'}
                        <AvatarGalleryView />
                    {:else}
                        <PlayerBattleAnsweringView timer={mockTimer} battlesToAnswer={mockBattlesToAnswer} gameId="TEST" playerId="p1" />
                    {/if}
                    </div>
                </div>
            </div>
        {:else}
            <!-- Full Screen / Smart TV View -->
            <div class="w-full h-full max-h-screen flex flex-col overflow-hidden">
                {#if activeScreen === 'host_lobby'}
                    <HostLobby />
                {:else if activeScreen.startsWith('host_')}
                    <HostGameView />
                {:else if activeScreen === 'instructions'}
                    <Instructions />
                {:else if activeScreen === 'avatar_gallery'}
                    <AvatarGalleryView />
                {:else}
                    <div class="max-w-xl mx-auto w-full p-4">
                        {#if activeScreen === 'player_battle_single' || activeScreen === 'player_battle_movie'}
                            <PlayerBattleAnsweringView timer={mockTimer} battlesToAnswer={mockBattlesToAnswer} gameId="TEST" playerId="p1" />
                        {:else if activeScreen === 'player_question'}
                            <PlayerQuestionView timer={mockTimer} questions={mockQuestions} />
                        {:else if activeScreen === 'player_voting'}
                            <PlayerBattleVotingView timer={mockTimer} battle={mockActiveBattle} voterId="p4" allPlayers={MOCK_PLAYERS} />
                        {:else}
                            <PlayerLobby />
                        {/if}
                    </div>
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
        bind:hideToolbar
        on:changeScreen={handleScreenChange}
        on:changePlayerCount={(e) => playerCount = e.detail}
        on:changePlayerIndex={(e) => playerIndex = e.detail}
        on:changeLang={(e) => language = e.detail}
        on:changeViewport={(e) => viewport = e.detail}
        on:changeTileCount={(e) => tileCount = e.detail}
        on:resetState={setupMockStores}
    />
</div>
