// game/handlers/gameplayHandlers.js
import * as manager from '../manager.js';
import * as battleService from '../services/battleService.js';
import * as helpers from '../helpers.js';

export function handleSubmitAnswer(io, socket, { gameId, playerId, questionId, answer }) {
    const game = manager.getGame(gameId);
    if (game?.phase !== 'question') return;

    const pa = game.playerAnswers[playerId];
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
    const player = game.players.find(p => p.id === playerId);
    if (!player) return;
    
    let key, data;
    switch (payload.type) {
        case 'question':
            if (game.phase !== 'question') return;
            key = payload.questionId;
            data = payload.text;
            break;
        case 'battle':
             if (game.phase !== 'battle_answering') return;
             key = `b-${payload.battleId}-${playerId}`;
             data = payload.answer;
             break;
        case 'final_battle':
            if (game.phase !== 'battle_answering') return;
            key = `b-${payload.battleId}-${playerId}`;
            data = { title: payload.title, tagline: payload.tagline };
            break;
        default:
            return;
    }
    if (key && data !== undefined) {
        game.partialAnswers[key] = data;
    }
}

export function handleSubmitBattleAnswer(io, socket, { gameId, playerId, battleId, answer }) {
    const game = manager.getGame(gameId);
    if (game?.phase !== 'battle_answering') return;

    const battle = game.battleSchedule.find(b => b.id === battleId);
    // Idempotency check: only update if answer doesn't exist.
    if (battle && battle.competitors.includes(playerId) && !battle.answers[playerId]) {
        battle.answers[playerId] = answer;
        
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

export function handleVote(io, socket, { gameId, playerId, battleId, voteForPlayerId }) {
    const game = manager.getGame(gameId);
    if (game?.phase !== 'battle_voting') return;

    const battle = game.battleSchedule.find(b => b.id === battleId);
    // Idempotency and validity checks
    if (!battle || battle.competitors.includes(playerId) || battle.votes[playerId]) return;

    battle.votes[playerId] = voteForPlayerId;

    const votersForThisBattle = game.players.filter(p => p.socketId && !battle.competitors.includes(p.id));
    const votesCastForThisBattle = Object.keys(battle.votes).length;
    
    if (votersForThisBattle.length === votesCastForThisBattle) {
        console.log(`[Game ${game.id}] All votes are in for battle ${battle.id}. Advancing.`);
        battleService.processVoteAndStartReveal(io, game, false);
    } else {
        helpers.broadcastGameState(io, gameId);
    }
}
