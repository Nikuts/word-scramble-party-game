// game/handlers/gameplayHandlers.js
import * as manager from '../manager.js';
import * as battleService from '../services/battleService.js';
import * as timerService from '../services/timerService.js';
import * as helpers from '../helpers.js';

export function handleSubmitAnswer(io, socket, { gameId, playerId, questionId, answer }) {
    const game = manager.getGame(gameId);
    if (game?.phase !== 'question') return;

    const player = helpers.getAuthenticatedPlayer(game, socket, playerId);
    if (!player) return;

    const pa = game.playerAnswers[player.id];
    if (!pa) return;
    
    const question = pa.questions.find(q => q.id === questionId);
    // Idempotency check: only update if answer hasn't been set.
    if (question && !question.answer) {
        question.answer = answer;
    } else {
        return; // Don't proceed if answer already exists
    }
    
    pa.submittedAll = pa.questions.every(q => !!q.answer);
    
    const participatingPlayerIds = Object.keys(game.playerAnswers);
    const allDone = participatingPlayerIds.length > 0 && participatingPlayerIds.every(id => game.playerAnswers[id]?.submittedAll);
        
    if (allDone) {
        battleService.prepareBattlePhase(io, game);
    } else {
        helpers.broadcastGameState(io, gameId);
    }
}

export function handleUpdatePartialAnswer(io, socket, { gameId, playerId, payload }) {
    const game = manager.getGame(gameId);
    if (!game) return;
    const player = helpers.getAuthenticatedPlayer(game, socket, playerId);
    if (!player) return;
    
    let key, data;
    switch (payload.type) {
        case 'question':
            if (game.phase !== 'question') return;
            if (!game.playerAnswers[player.id]?.questions?.some(q => q.id === payload.questionId)) return;
            key = payload.questionId;
            data = payload.text;
            break;
        case 'battle':
             if (game.phase !== 'battle_answering') return;
             key = `b-${payload.battleId}-${player.id}`;
             data = payload.tileIds !== undefined
                 ? (payload.answer !== undefined ? { tileIds: payload.tileIds, answer: payload.answer } : payload.tileIds)
                 : payload.answer;
             break;
        case 'final_battle':
            if (game.phase !== 'battle_answering') return;
            key = `b-${payload.battleId}-${player.id}`;
            data = payload.tileIds !== undefined
                ? { tileIds: payload.tileIds, title: payload.title || '', tagline: payload.tagline || '' }
                : { title: payload.title, tagline: payload.tagline };
            break;
        default:
            return;
    }
    if (key && data !== undefined) {
        game.partialAnswers[key] = data;
    }
}

export function handleSubmitBattleAnswer(io, socket, { gameId, playerId, battleId, tileIds, answer }) {
    const game = manager.getGame(gameId);
    if (game?.phase !== 'battle_answering') return;

    const player = helpers.getAuthenticatedPlayer(game, socket, playerId);
    if (!player) return;

    const battle = game.battleSchedule.find(b => b.id === battleId);
    // Idempotency check: only update if answer doesn't exist.
    if (battle && battle.competitors.includes(player.id) && !battle.answers[player.id]) {
        const resolved = battleService.resolveBattleSubmission(game, battle, player.id, { tileIds, answer });
        if (!resolved) return;

        battle.answers[player.id] = resolved.answer;
        if (!battle.answerTileIds) battle.answerTileIds = {};
        if (resolved.tileIds) {
            battle.answerTileIds[player.id] = resolved.tileIds;
        }
        battleService.recordPlayerUsedBundles(game, player.id, resolved.usedBundles);
        
        const allCompetitors = new Set(game.battleSchedule.flatMap(b => b.competitors));
        const allAnswered = [...allCompetitors].every(cId => 
            game.battleSchedule
                .filter(b => b.competitors.includes(cId))
                .every(b => !!b.answers[cId])
        );

        if (allAnswered) {
            battleService.startVotingGetReadyPhase(io, game);
        } else {
            helpers.broadcastGameState(io, gameId);
        }
    }
}

export function handleVote(io, socket, { gameId, playerId, battleId, voteForPlayerId, optionId }) {
    const game = manager.getGame(gameId);
    if (game?.phase !== 'battle_voting') return;

    const player = helpers.getAuthenticatedPlayer(game, socket, playerId);
    if (!player) return;

    const battle = game.battleSchedule.find(b => b.id === battleId);
    // Idempotency and validity checks
    if (!battle || battle.competitors.includes(player.id) || battle.votes[player.id]) return;

    const rawTarget = optionId || voteForPlayerId;
    let resolvedTargetId = null;
    const optMatch = typeof rawTarget === 'string' ? rawTarget.match(/^opt_(\d+)$/) : null;
    if (optMatch) {
        const idx = parseInt(optMatch[1], 10);
        const order = battle.optionOrder || battle.competitors || [];
        resolvedTargetId = order[idx] || null;
    } else if (battle.competitors.includes(rawTarget)) {
        resolvedTargetId = rawTarget;
    }
    if (!resolvedTargetId || !battle.competitors.includes(resolvedTargetId)) return;

    battle.votes[player.id] = resolvedTargetId;

    const votersForThisBattle = game.players.filter(p => p.socketId && !battle.competitors.includes(p.id));
    const votesCastForThisBattle = Object.keys(battle.votes).length;
    
    if (votersForThisBattle.length === votesCastForThisBattle) {
        console.log(`[Game ${game.id}] All votes are in for battle ${battle.id}. Advancing.`);
        io.to(game.id).emit('all-votes-in', { battleId: battle.id });
        battleService.processVoteAndStartReveal(io, game, false);
    } else {
        helpers.broadcastGameState(io, gameId);
    }
}

export function handleRerollQuestion(io, socket, { gameId, playerId, questionId }) {
    const game = manager.getGame(gameId);
    if (game?.phase !== 'question') return;

    const player = helpers.getAuthenticatedPlayer(game, socket, playerId);
    if (!player) return;

    const pa = game.playerAnswers[player.id];
    if (!pa || (pa.rerollsLeft || 0) <= 0) return;

    const question = pa.questions.find(q => q.id === questionId);
    if (!question || question.answer) return; // Cannot reroll answered question

    const reservePool = game.reserveQuestions?.[player.id] || [];
    let newQuestionText = reservePool.shift();

    if (!newQuestionText) {
        newQuestionText = 'What is the weirdest secret you would never tell your boss?';
    }

    question.text = newQuestionText;
    pa.rerollsLeft = Math.max(0, (pa.rerollsLeft || 1) - 1);

    // Clear partial answer draft for this question
    if (game.partialAnswers?.[questionId]) {
        delete game.partialAnswers[questionId];
    }

    helpers.broadcastGameState(io, gameId);
}

export function handleUseTimeBoost(io, socket, { gameId, playerId }) {
    const game = manager.getGame(gameId);
    if (!game) return;
    if (game.phase !== 'question' && game.phase !== 'battle_answering') return;

    const player = helpers.getAuthenticatedPlayer(game, socket, playerId);
    if (!player || player.hasUsedTimeBoost) return;

    player.hasUsedTimeBoost = true;
    timerService.extendPhaseTimer(io, game, 30);

    const remainingTime = game.phaseEndTime ? Math.max(0, Math.round((game.phaseEndTime - Date.now()) / 1000)) : 0;

    io.to(gameId).emit('time-boost-used', {
        playerId: player.id,
        playerName: player.name,
        avatar: player.avatar,
        phase: game.phase,
        remainingTime,
    });

    helpers.playSoundOnClients(io, game, 'sfx_time_boost');
}
