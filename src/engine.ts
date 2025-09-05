import { Chess, Move, SQUARES, type Square } from "chess.js";

const VALUE = { p: 100, n: 300, b: 300, r: 500, q: 900, k: 0 };

function evalMaterial(fen: string): number {
  const c = new Chess(fen);
  let score = 0;
  for (const sq of SQUARES) {
    const p = c.get(sq as Square);
    if (!p) continue;
    const v = VALUE[p.type as keyof typeof VALUE];
    score += p.color === "w" ? v : -v;
  }
  return score;
}

// random move if no captures are possible, otherwise best capture
export function pickEngineMove(ch: Chess, forcedType: string) {
  const legal = ch
    .moves({ verbose: true })
    .filter((m: Move) => m.piece === forcedType);
  if (legal.length === 0) return null;
  const side = ch.turn(); // 'w' | 'b'

  let best = legal[Math.floor(Math.random() * legal.length)];
  const initBest = new Chess(ch.fen());
  initBest.move(best);
  let bestScore = evalMaterial(initBest.fen());

  for (const m of legal) {
    const clone = new Chess(ch.fen());
    clone.move(m);
    const s = evalMaterial(clone.fen());
    if (side === "w") {
      if (s > bestScore) {
        best = m;
        bestScore = s;
      }
    } else {
      if (s < bestScore) {
        best = m;
        bestScore = s;
      }
    }
  }

  return best;
}
