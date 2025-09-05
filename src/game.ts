import { Chess, Move } from "chess.js";
import { makeRNG } from "./rng";

export type Side = "w" | "b";
export type PieceType = "p" | "n" | "b" | "r" | "q" | "k";
type PromotionType = "n" | "b" | "r" | "q";

export class ChillChess {
  chess = new Chess();
  rng = makeRNG("chill-001"); // pass a user seed in UI
  forcedType: PieceType | null = null;

  constructor(seed?: string) {
    if (seed) this.rng = makeRNG(seed);
    this.rollForcedType();
  }

  private legalMoves() {
    return this.chess.moves({ verbose: true }) as Array<
      Move & { piece: PieceType }
    >;
  }

  private legalTypes(): PieceType[] {
    const set = new Set<PieceType>();
    for (const m of this.legalMoves()) set.add(m.piece);
    return [...set];
  }

  rollForcedType() {
    const types = this.legalTypes();
    this.forcedType = types.length ? this.rng.choice(types) : null;
  }

  movesForForcedType() {
    if (!this.forcedType) return [];
    return this.legalMoves().filter((m) => m.piece === this.forcedType);
  }

  applyMove(m: Move) {
    this.chess.move(m);
    this.rollForcedType(); // next side’s forced type
  }

  randomPromotion(): PromotionType {
    const types = ["q", "r", "b", "n"];
    return this.rng.choice(types) as PromotionType;
  }

  get status() {
    if (this.chess.isCheckmate()) return "checkmate";
    if (this.chess.isStalemate()) return "stalemate";
    if (this.chess.isDraw()) return "draw";
    return "playing";
  }
}
