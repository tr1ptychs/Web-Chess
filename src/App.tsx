import { useEffect, useMemo, useRef, useState } from "react";
import { Chess, Move, type Square } from "chess.js";
import {
  Chessboard,
  type PieceDropHandlerArgs,
  type SquareHandlerArgs,
} from "react-chessboard";
import { ChillChess, type PieceType, type Side } from "./game";
import { pickEngineMove } from "./engine";

const PIECE_LABEL: Record<string, string> = {
  p: "Pawn",
  n: "Knight",
  b: "Bishop",
  r: "Rook",
  q: "Queen",
  k: "King",
};

export default function App() {
  const [seed, setSeed] = useState<string>("seed-ChillChess");
  const [inputSeed, setInputSeed] = useState<string>(seed);

  const gameRef = useRef<ChillChess>(new ChillChess(seed));

  const [fen, setFen] = useState<string>(gameRef.current.chess.fen());
  const [forced, setForced] = useState<PieceType | null>(
    gameRef.current.forcedType,
  );
  const [status, setStatus] = useState<string>(gameRef.current.status);
  const [turn, setTurn] = useState<Side>(gameRef.current.chess.turn());

  const [selected, setSelected] = useState<string | null>(null);

  const [squareStyles, setSquareStyles] = useState<
    Record<string, React.CSSProperties>
  >({});

  const forcedMoves = useMemo(
    () => gameRef.current.movesForForcedType(),
    [fen, forced],
  );

  const isPlaying = status === "playing";

  function resetGame(newSeed: string) {
    gameRef.current = new ChillChess(newSeed);
    setFen(gameRef.current.chess.fen());
    setForced(gameRef.current.forcedType);
    setTurn(gameRef.current.chess.turn());
    setStatus(gameRef.current.status);
    setSelected(null);
  }

  function randomSeed() {
    const s = `seed-${Math.random().toString(36).slice(2, 10)}`;
    setSeed(s);
    setInputSeed(s);
    resetGame(s);
  }

  async function copySeed() {
    try {
      await navigator.clipboard.writeText(seed);
    } catch {
      // ignore clipboard errors
    }
  }

  function attemptMove(
    from: string,
    to: string,
    promotion?: "q" | "r" | "b" | "n",
  ): boolean {
    const match = forcedMoves.find((m) => m.from === from && m.to === to);
    if (!match) return false;

    const needsPromo = (match as Move).promotion != null;
    const promo =
      promotion ?? (needsPromo ? gameRef.current.randomPromotion() : undefined);

    gameRef.current.applyMove({
      from,
      to,
      ...(promo ? { promotion: promo } : {}),
      san: (match as Move).san,
    } as Move);

    setFen(gameRef.current.chess.fen());
    setForced(gameRef.current.forcedType);
    setTurn(gameRef.current.chess.turn());
    setStatus(gameRef.current.status);
    setSelected(null);

    if (gameRef.current.status === "playing") {
      window.setTimeout(engineTurn, 1000);
    }

    return true;
  }

  function engineTurn() {
    const g = gameRef.current;
    if (g.status !== "playing") return;

    const forcedType = g.forcedType!;
    const move =
      pickEngineMove(g.chess as unknown as Chess, forcedType) ??
      g.movesForForcedType()[0];
    if (!move) return; // stalemate or something weird

    g.applyMove(move as Move);

    setFen(g.chess.fen());
    setForced(g.forcedType);
    setTurn(g.chess.turn());
    setStatus(g.status);
    setSelected(null);
  }

  function onPieceDrop({
    sourceSquare,
    targetSquare,
    piece,
  }: PieceDropHandlerArgs): boolean {
    if (!targetSquare) return false;

    const willPromote =
      piece.toString()[1].toLowerCase() === "p" &&
      ((turn === "w" && targetSquare.endsWith("8")) ||
        (turn === "b" && targetSquare.endsWith("1")));
    const promotion = willPromote
      ? gameRef.current.randomPromotion()
      : undefined;

    const ok = attemptMove(sourceSquare, targetSquare, promotion);
    return ok;
  }

  function onSquareClick({ square }: SquareHandlerArgs) {
    if (!isPlaying) return;

    // first click
    if (selected === null) {
      const fromSquares = new Set(forcedMoves.map((m) => m.from));
      if (fromSquares.has(square as Square)) setSelected(square);
      return;
    }

    if (selected === square) {
      setSelected(null);
      return;
    }

    // second click
    const ok = attemptMove(selected, square);
    if (!ok) {
      const fromSquares = new Set(forcedMoves.map((m) => m.from));
      if (fromSquares.has(square as Square)) setSelected(square);
    }
  }

  useEffect(() => {
    const styles: Record<string, React.CSSProperties> = {};

    // Highlight pieces that can move
    for (const m of forcedMoves) {
      styles[m.from] = {
        ...(styles[m.from] || {}),
        boxShadow: "inset 0 0 0 5px rgba(56,189,248,0.9)", // cyan-400
      };
    }

    // If a piece is selected, show its legal moves
    if (selected) {
      for (const m of forcedMoves) {
        if (m.from === selected) {
          styles[m.to] = {
            ...(styles[m.to] || {}),
            boxShadow: "inset 0 0 0 5px rgba(34,197,94,0.9)", // green-500
          };
        }
      }
      styles[selected] = {
        ...(styles[selected] || {}),
        boxShadow: "inset 0 0 0 5px rgba(59,130,246,1)", // blue-500
      };
    }
    setSquareStyles(styles);
  }, [forcedMoves, selected]);

  const forcedLabel = forced ? (PIECE_LABEL[forced] ?? "-") : "-";

  const options = {
    id: "chill-board",
    position: fen,
    onPieceDrop: onPieceDrop,
    onSquareClick: onSquareClick,
    board: {
      darkSquareStyle: { backgroundColor: "#1f2937" },
      lightSquareStyle: { backgroundColor: "#334155" },
    },
    arePiecesDraggable: isPlaying,
    squareStyles: squareStyles,
    animationDuration: 150,
  };

  return (
    <div className="bg-slate-900 flex justify-around">
      <div className="min-h-screen md:w-7xl fbg-slate-900 text-slate-200 p-4">
        <div className="max-w-10xl mx-auto grid md:grid-cols-[1.2fr_1fr] gap-6 items-start">
          {/* Left: Board */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-xl font-semibold tracking-tight">
                ChillChess
              </h1>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-1 rounded-full bg-slate-800/70 border border-slate-700/60">
                  Turn: {turn === "w" ? "White" : "Black"}
                </span>
                <span className="px-2 py-1 rounded-full bg-slate-800/70 border border-slate-700/60">
                  Forced: {forcedLabel}
                </span>
                <span className="px-2 py-1 rounded-full bg-slate-800/70 border border-slate-700/60 capitalize">
                  {status}
                </span>
              </div>
            </div>

            <div className="rounded-2xl overflow-hidden shadow-lg shadow-black/30 ring-1 ring-slate-700/60">
              <Chessboard options={options} />
            </div>

            <p className="text-xs mt-3 opacity-70">
              Rule: on each turn a random piece type with legal moves is
              selected, and you must move that type. The game is seeded for
              determinism.
            </p>
          </div>

          {/* Right: seed & tips */}
          <div className="space-y-4">
            <div className="p-3 rounded-xl border border-slate-700/60 bg-slate-800/40">
              <div className="text-sm font-medium mb-2">Seed</div>
              <div className="flex gap-2">
                <input
                  value={inputSeed}
                  onChange={(e) => setInputSeed(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700/60 outline-none focus:ring-2 focus:ring-sky-500/60"
                  placeholder="enter a seed"
                />
                <button
                  onClick={() => {
                    setSeed(inputSeed.trim() || seed);
                    resetGame(inputSeed.trim() || seed);
                  }}
                  className="px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white"
                >
                  Apply
                </button>
                <button
                  onClick={randomSeed}
                  className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600"
                >
                  Random
                </button>
                <button
                  onClick={copySeed}
                  className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600"
                  title="Copy current seed"
                >
                  Copy
                </button>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-slate-700/60 bg-slate-800/40 text-xs">
              <div className="font-medium mb-1">Tips</div>
              <ul className="list-disc pl-4 space-y-1 opacity-80">
                <li>
                  Squares with cyan highlights are pieces you may move. Select
                  one to see valid moves for that piece.
                </li>
                <li>Pawn promotions are randomized.</li>
                <li>
                  When you're strategizing, keep in mind any piece that has
                  legal moves may be chosen for you to move.
                </li>
                <li>
                  Same seed, same sequence. Share a seed to reproduce a game.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
