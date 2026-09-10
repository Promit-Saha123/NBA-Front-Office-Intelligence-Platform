import { Game } from "./api";

const confidenceColor = {
  High: "text-green-400 bg-green-400/10",
  Medium: "text-amber-400 bg-amber-400/10",
  Low: "text-zinc-400 bg-zinc-400/10",
};

interface GameCardProps {
  game: Game;
}

export function GameCard({ game }: GameCardProps) {
  const homeWin = game.home_win_probability >= 0.5;
  const pct = Math.round(game.home_win_probability * 100);

  return (
    <div className="bg-[#13131a] border border-white/8 rounded-xl p-4 hover:border-indigo-500/40 transition-colors">
      <div className="text-[9px] text-zinc-600 mb-3">{game.game_date}</div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-col items-center gap-1">
          <span
            className={`text-xl font-medium tracking-tight ${homeWin ? "text-indigo-400" : "text-white"}`}
          >
            {game.home_team}
          </span>
          <span className="text-[9px] text-zinc-600">home</span>
        </div>
        <span className="text-xs text-zinc-600">vs</span>
        <div className="flex flex-col items-center gap-1">
          <span
            className={`text-xl font-medium tracking-tight ${!homeWin ? "text-indigo-400" : "text-white"}`}
          >
            {game.away_team}
          </span>
          <span className="text-[9px] text-zinc-600">away</span>
        </div>
      </div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[9px] text-zinc-500 w-7">{pct}%</span>
        <div className="flex-1 h-1 bg-[#1a1a24] rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-[9px] text-zinc-500 w-7 text-right">
          {100 - pct}%
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-zinc-500">
          pick:{" "}
          <span className="text-indigo-400">
            {game.predicted_winner}
          </span>
        </span>
        <span
          className={`text-[9px] px-2 py-0.5 rounded font-medium ${confidenceColor[game.confidence]}`}
        >
          {game.confidence}
        </span>
      </div>
    </div>
  );
}
