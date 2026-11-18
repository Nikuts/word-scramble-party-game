// src/lib/battleRecapCanvas.js
import { TIMEOUT_ANSWER_PLACEHOLDER } from '../../shared/config.js';
import { resolveAvatarSrc } from './utils.js';
import { formatVotesLabel } from '../ui_text.js';

const AUTHOR_COLORS = ['#67e8f9', '#f9a8d4', '#6ee7b7', '#fcd34d', '#d8b4fe'];
const DEFAULT_TOKEN_COLOR = '#f1f5f9';

/**
 * Maps author index to the same rainbow palette used in HostReveal.
 * @param {number} authorIndex
 * @returns {string}
 */
export function getWordAuthorHex(authorIndex) {
    return (authorIndex >= 0 && authorIndex < AUTHOR_COLORS.length)
        ? AUTHOR_COLORS[authorIndex]
        : '#cbd5e1';
}

function readThemeColors() {
    if (typeof document === 'undefined') {
        return { bg: '#0a0914', surface: '#100e22', surface2: '#131126', border: '#332e59', primary: '#00e5ff', accent: '#facc15', secondary: '#ff2a85' };
    }
    const styles = getComputedStyle(document.documentElement);
    const getVar = (name, fallback) => styles.getPropertyValue(name)?.trim() || fallback;
    return {
        bg: getVar('--color-bg-base', '#0a0914'),
        surface: getVar('--color-surface', '#100e22'),
        surface2: getVar('--color-surface-2', '#131126'),
        border: '#332e59',
        primary: getVar('--color-primary', '#00e5ff'),
        accent: getVar('--color-warning', '#facc15'),
        secondary: getVar('--color-secondary', '#ff2a85')
    };
}

function drawVectorCrown(ctx, x, y, size, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y + size * 0.8);
    ctx.lineTo(x, y + size * 0.25);
    ctx.lineTo(x + size * 0.28, y + size * 0.5);
    ctx.lineTo(x + size * 0.5, y + size * 0.15);
    ctx.lineTo(x + size * 0.72, y + size * 0.5);
    ctx.lineTo(x + size, y + size * 0.25);
    ctx.lineTo(x + size, y + size * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(x, y + size * 0.84, size, size * 0.12);
    ctx.restore();
}

function traceChamferRect(ctx, x, y, w, h, cut = 10) {
    const c = Math.min(cut, w / 3, h / 3);
    ctx.beginPath();
    ctx.moveTo(x + c, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + h - c);
    ctx.lineTo(x + w - c, y + h);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x, y + c);
    ctx.closePath();
}

function wrapPlainText(ctx, text, maxWidth, font) {
    ctx.font = font;
    const paragraphs = String(text || '').split('\n');
    const lines = [];
    for (const para of paragraphs) {
        const words = para.split(/\s+/).filter(Boolean);
        if (words.length === 0) {
            lines.push('');
            continue;
        }
        let line = '';
        for (const word of words) {
            const candidate = line ? `${line} ${word}` : word;
            if (ctx.measureText(candidate).width <= maxWidth) {
                line = candidate;
            } else {
                if (line) lines.push(line);
                // Break overly long unbroken words safely
                if (ctx.measureText(word).width > maxWidth) {
                    let slice = '';
                    for (const ch of word) {
                        if (ctx.measureText(slice + ch).width > maxWidth && slice) {
                            lines.push(slice);
                            slice = ch;
                        } else {
                            slice += ch;
                        }
                    }
                    line = slice;
                } else {
                    line = word;
                }
            }
        }
        if (line) lines.push(line);
    }
    return lines.length > 0 ? lines : [''];
}

function buildStyledLines(ctx, battle, competitorId, dict, maxWidth, font, theme) {
    ctx.font = font;
    const annotated = battle?.annotatedAnswers?.[competitorId];
    const rawAnswer = battle?.answers?.[competitorId];

    const pushTokenStream = (runs, linesOut, prefixRuns = []) => {
        let currentLine = [...prefixRuns];
        let currentWidth = currentLine.reduce((w, r) => w + ctx.measureText(r.text).width, 0);

        for (let i = 0; i < runs.length; i++) {
            const tok = runs[i];
            const needsSpace = currentLine.length > 0 && !/^[.,!?:;…]+$/.test(tok.text) && !currentLine[currentLine.length - 1].noSpaceAfter;
            const piece = (needsSpace ? ' ' : '') + tok.text;
            const pieceWidth = ctx.measureText(piece).width;

            if (currentWidth + pieceWidth <= maxWidth || currentLine.length === 0) {
                currentLine.push({ text: piece, color: tok.color });
                currentWidth += pieceWidth;
            } else {
                linesOut.push(currentLine);
                const freshPiece = tok.text;
                currentLine = [{ text: freshPiece, color: tok.color }];
                currentWidth = ctx.measureText(freshPiece).width;
            }
        }
        if (currentLine.length > 0) linesOut.push(currentLine);
    };

    if (annotated) {
        const lines = [];
        if (annotated.isFinal) {
            const titleRuns = (annotated.title || []).map(t => ({ text: t.text, color: getWordAuthorHex(t.authorIndex) }));
            const tagRuns = (annotated.tagline || []).map(t => ({ text: t.text, color: getWordAuthorHex(t.authorIndex) }));
            if (titleRuns.length > 0) {
                pushTokenStream(titleRuns, lines, [{ text: `${dict.title || 'Title'}: `, color: theme.primary, noSpaceAfter: true }]);
            }
            if (tagRuns.length > 0) {
                pushTokenStream(tagRuns, lines, [{ text: `${dict.tagline || 'Tagline'}: `, color: theme.primary, noSpaceAfter: true }]);
            }
        } else if (Array.isArray(annotated.words) && annotated.words.length > 0) {
            pushTokenStream(
                annotated.words.map(t => ({ text: t.text, color: getWordAuthorHex(t.authorIndex) })),
                lines
            );
        }
        if (lines.length > 0) return lines;
    }

    let plain = '';
    if (typeof rawAnswer === 'string') {
        plain = rawAnswer === TIMEOUT_ANSWER_PLACEHOLDER ? `(${dict.noAnswerSubmitted || 'No answer submitted'})` : rawAnswer;
    } else if (rawAnswer && typeof rawAnswer === 'object' && (rawAnswer.title || rawAnswer.tagline)) {
        const title = rawAnswer.title === TIMEOUT_ANSWER_PLACEHOLDER ? `(${dict.noAnswerSubmitted || 'No answer'})` : (rawAnswer.title || '...');
        const tagline = (!rawAnswer.tagline || rawAnswer.tagline === TIMEOUT_ANSWER_PLACEHOLDER) ? '...' : rawAnswer.tagline;
        plain = `${dict.title || 'Title'}: ${title}\n${dict.tagline || 'Tagline'}: ${tagline}`;
    } else {
        plain = `(${dict.noAnswerSubmitted || 'No answer submitted'})`;
    }

    return wrapPlainText(ctx, plain, maxWidth, font).map(line => [{ text: line, color: DEFAULT_TOKEN_COLOR }]);
}

async function loadAvatarImage(src) {
    if (typeof Image === 'undefined') return null;
    return new Promise(resolve => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
    });
}

/**
 * Renders a self-contained pure HTML5 Canvas PNG recap card for a historical battle.
 * Preserves chamfered corners, offline fonts, full unclipped names, avatars, and rainbow attribution.
 */
export async function renderBattleRecapCanvas({ battle, players = [], gameId = '', roundLabel = '', dict = {}, lang = 'en', orientation = 'vertical' }) {
    if (typeof document === 'undefined') {
        throw new Error('Canvas export requires a browser environment');
    }

    try {
        await document.fonts?.ready;
    } catch {
        // Proceed with loaded fallback fonts if fonts API rejects
    }

    const theme = readThemeColors();
    const isLandscape = orientation === 'landscape';
    const cardWidth = isLandscape ? 960 : 540;
    const outerPad = 24;
    const innerPad = 20;
    const contentWidth = cardWidth - outerPad * 2;

    const competitors = (battle?.competitors || [])
        .map(id => players.find(p => p.id === id))
        .filter(Boolean);

    const avatarImages = await Promise.all(
        competitors.map(p => loadAvatarImage(resolveAvatarSrc(p.avatar)))
    );

    const measureCanvas = document.createElement('canvas');
    const mctx = measureCanvas.getContext('2d');

    const displayFontFamily = '"Russo One", system-ui, sans-serif';
    const monoFontFamily = '"JetBrains Mono", ui-monospace, monospace';
    const sansFontFamily = 'system-ui, -apple-system, sans-serif';

    const promptFont = `800 20px ${displayFontFamily}`;
    const genreFont = `700 13px ${displayFontFamily}`;
    const answerFont = `700 15px ${monoFontFamily}`;
    const nameFont = `700 16px ${displayFontFamily}`;

    const isFinalRound = Boolean(battle?.genre);
    const promptText = isFinalRound ? (battle.premise || battle.prompt || '') : (battle.prompt || '');
    const promptLines = wrapPlainText(mctx, promptText, contentWidth - innerPad * 2, promptFont);
    const promptLineHeight = 27;

    const cols = isLandscape ? (competitors.length === 3 ? 3 : 2) : 1;
    const colGap = 14;
    const colWidth = (contentWidth - colGap * (cols - 1)) / cols;
    const answerBoxInnerW = colWidth - 36;
    const answerLineHeight = 22;

    const competitorLayouts = competitors.map((comp, idx) => {
        const lines = buildStyledLines(mctx, battle, comp.id, dict, answerBoxInnerW, answerFont, theme);
        const answerBoxH = Math.max(54, lines.length * answerLineHeight + 22);
        const totalH = 14 + 42 + 12 + answerBoxH + 10 + 22 + 12; // header + gap + answer + footer + padding
        return { comp, idx, lines, answerBoxH, totalH };
    });

    // Balance row heights in multi-column grids
    const rows = [];
    for (let i = 0; i < competitorLayouts.length; i += cols) {
        const rowSlice = competitorLayouts.slice(i, i + cols);
        const maxH = Math.max(...rowSlice.map(r => r.totalH));
        rowSlice.forEach(r => { r.rowH = maxH; });
        rows.push({ items: rowSlice, height: maxH });
    }

    const headerTopH = roundLabel ? 32 : 0;
    const genreBoxH = isFinalRound ? 26 : 0;
    const promptBlockH = (isFinalRound ? 22 : 12) + headerTopH + genreBoxH + promptLines.length * promptLineHeight + 20;
    const gridTotalH = rows.reduce((sum, r) => sum + r.height, 0) + Math.max(0, rows.length - 1) * colGap;
    const footerH = 32;
    const cardHeight = outerPad * 2 + promptBlockH + gridTotalH + footerH;

    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = cardWidth * scale;
    canvas.height = cardHeight * scale;
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    // Outer background
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, cardWidth, cardHeight);

    // Main outer chamfered panel
    const panelX = 10;
    const panelY = 10;
    const panelW = cardWidth - 20;
    const panelH = cardHeight - 20;
    traceChamferRect(ctx, panelX, panelY, panelW, panelH, 14);
    ctx.fillStyle = theme.surface;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = theme.primary;
    ctx.stroke();

    let cursorY = outerPad;

    // Optional Round / Tag Crest
    if (roundLabel) {
        const labelText = String(roundLabel).toUpperCase();
        ctx.font = `700 12px ${displayFontFamily}`;
        const badgeW = ctx.measureText(labelText).width + 24;
        const badgeX = (cardWidth - badgeW) / 2;
        traceChamferRect(ctx, badgeX, cursorY, badgeW, 24, 6);
        ctx.fillStyle = theme.surface2;
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = theme.primary;
        ctx.stroke();
        ctx.fillStyle = theme.primary;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, cardWidth / 2, cursorY + 12);
        cursorY += 34;
    }

    // Prompt Header Box
    if (isFinalRound) {
        ctx.font = genreFont;
        ctx.fillStyle = theme.accent;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(battle.genre).toUpperCase(), cardWidth / 2, cursorY + 10);
        cursorY += 26;
    }

    ctx.font = promptFont;
    ctx.fillStyle = isFinalRound ? '#f8fafc' : theme.primary;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    promptLines.forEach(line => {
        ctx.fillText(line, cardWidth / 2, cursorY + promptLineHeight / 2);
        cursorY += promptLineHeight;
    });
    cursorY += 16;

    // Competitor Cards
    rows.forEach((row) => {
        row.items.forEach((item, colIdx) => {
            const x = outerPad + colIdx * (colWidth + colGap);
            const y = cursorY;
            const comp = item.comp;
            const isSoloWinner = battle.winnerId === comp.id;
            const isTieWinner = !battle.winnerId && (battle.scoreBreakdown?.[comp.id]?.winBonus ?? 0) > 0;
            const isWin = isSoloWinner || isTieWinner;

            traceChamferRect(ctx, x, y, colWidth, item.rowH, 10);
            ctx.fillStyle = theme.bg;
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = isWin ? theme.accent : theme.border;
            ctx.stroke();

            // Header row: Avatar + Name + Badge
            const pad = 12;
            const avSize = 38;
            const avImg = avatarImages[item.idx];
            if (avImg) {
                ctx.save();
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(avImg, x + pad, y + pad, avSize, avSize);
                ctx.restore();
            }

            const badgeLabel = isSoloWinner
                ? (dict.winner || 'WINNER').toUpperCase()
                : (isTieWinner ? (dict.tie || 'TIE').toUpperCase() : '');

            let badgeReserved = 0;
            if (badgeLabel) {
                ctx.font = `700 11px ${displayFontFamily}`;
                const crownPad = isSoloWinner ? 15 : 0;
                const bW = ctx.measureText(badgeLabel).width + 18 + crownPad;
                const bH = 24;
                const bX = x + colWidth - pad - bW;
                const bY = y + pad + (avSize - bH) / 2;
                badgeReserved = bW + 8;

                traceChamferRect(ctx, bX, bY, bW, bH, 6);
                ctx.fillStyle = theme.accent;
                ctx.fill();

                if (isSoloWinner) {
                    drawVectorCrown(ctx, bX + 8, bY + 6, 12, '#090814');
                }
                ctx.fillStyle = '#090814';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(badgeLabel, bX + crownPad + (bW - crownPad) / 2, bY + bH / 2 + 1);
            }

            // Competitor name (never clipped vertically!)
            const nameX = x + pad + (avImg ? avSize + 10 : 0);
            const maxNameW = colWidth - pad * 2 - (avImg ? avSize + 10 : 0) - badgeReserved;
            ctx.font = nameFont;
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            let displayName = comp.name || '';
            while (displayName.length > 3 && ctx.measureText(`${displayName}…`).width > maxNameW) {
                displayName = displayName.slice(0, -1);
            }
            if (displayName !== (comp.name || '')) displayName += '…';
            ctx.fillText(displayName, nameX, y + pad + avSize / 2 + 1);

            // Answer Inner Box
            const ansX = x + pad;
            const ansY = y + pad + avSize + 10;
            const ansW = colWidth - pad * 2;
            const ansH = item.rowH - (pad + avSize + 10 + 36);

            traceChamferRect(ctx, ansX, ansY, ansW, ansH, 6);
            ctx.fillStyle = theme.surface2;
            ctx.fill();
            ctx.lineWidth = 1;
            ctx.strokeStyle = theme.border;
            ctx.stroke();

            ctx.font = answerFont;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            const textStartY = ansY + 12 + answerLineHeight / 2;
            item.lines.forEach((lineRuns, lineIdx) => {
                let runX = ansX + 10;
                const lineY = textStartY + lineIdx * answerLineHeight;
                for (const run of lineRuns) {
                    ctx.fillStyle = run.color || DEFAULT_TOKEN_COLOR;
                    ctx.fillText(run.text, runX, lineY);
                    runX += ctx.measureText(run.text).width;
                }
            });

            // Footer metrics: Votes + +PTS
            const pts = battle.pointsAwarded?.[comp.id] || 0;
            const voteCount = battle.scoreBreakdown?.[comp.id]?.votes
                ?? Object.values(battle.votes || {}).filter(v => v === comp.id).length;
            const footerY = y + item.rowH - 16;

            ctx.font = `700 11px ${monoFontFamily}`;
            ctx.fillStyle = '#94a3b8';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${voteCount} ${formatVotesLabel(voteCount, dict, lang)}`, ansX, footerY);

            ctx.fillStyle = pts > 0 ? theme.accent : '#64748b';
            ctx.textAlign = 'right';
            ctx.fillText(`+${pts.toLocaleString()} ${dict.pts || 'PTS'}`, ansX + ansW, footerY);
        });
        cursorY += row.height + colGap;
    });

    // Subtle Bottom Game Attribution
    ctx.font = `700 11px ${sansFontFamily}`;
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const appTag = String(dict.appName || 'WORD SCRAMBLE PARTY GAME').toUpperCase();
    const roomTag = gameId ? `${appTag} // #${gameId}` : appTag;
    ctx.fillText(roomTag, cardWidth / 2, cardHeight - 24);

    return new Promise((resolve, reject) => {
        if (canvas.toBlob) {
            canvas.toBlob(blob => {
                if (blob) resolve(blob);
                else reject(new Error('Failed to encode PNG blob'));
            }, 'image/png');
        } else {
            const dataUrl = canvas.toDataURL('image/png');
            fetch(dataUrl).then(r => r.blob()).then(resolve, reject);
        }
    });
}
