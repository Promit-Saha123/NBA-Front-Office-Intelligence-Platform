"use client";

import { useEffect, useState } from "react";
import { StatCard } from "./StatCard";
import { GameCard } from "./GameCard";
import { AccuracyChart } from "./AccuracyChart";
import { StatCardSkeleton, GameCardSkeleton } from "./Skeleton";
import { api, Game, Accuracy, AccuracyTrend, ApiError } from "./api";

export default function Home() {
  const [games, setGames] = useState<Game[]>([]);
  const [accuracy, setAccuracy] = useState<Accuracy | null>(null);
  const [accuracyTrend, setAccuracyTrend] = useState<AccuracyTrend[]>([]);
  const [loadingGames, setLoadingGames] = useState(true);
  const [loadingAccuracy, setLoadingAccuracy] = useState(true);
  const [loadingTrend, setLoadingTrend] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);

        const [gamesData, accuracyData, trendData] = await Promise.all([
          api
            .getPredictionsToday()
            .catch(() => {
              setLoadingGames(false);
              return [];
            })
            .then((data) => {
              setLoadingGames(false);
              return data;
            }),
          api
            .getAccuracy()
            .catch(() => {
              setLoadingAccuracy(false);
              return null;
            })
            .then((data) => {
              setLoadingAccuracy(false);
              return data;
            }),
          api
            .getAccuracyTrend()
            .catch(() => {
              setLoadingTrend(false);
              return [];
            })
            .then((data) => {
              setLoadingTrend(false);
              return data;
            }),
        ]);

        setGames(gamesData);
        setAccuracy(accuracyData);
        setAccuracyTrend(trendData);
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : "Failed to load data. Please check your connection.";
        setError(message);
      }
    };

    fetchData();
  }, []);

  const stats = [
    {
      label: "Season accuracy",
      value: accuracy
        ? `${(accuracy.overall_accuracy * 100).toFixed(1)}%`
        : "...",
      color: "text-green-400",
      sub: "vs Vegas ~66.8%",
    },
    {
      label: "Games predicted",
      value: accuracy ? accuracy.total_games_predicted.toLocaleString() : "...",
      color: "text-indigo-400",
      sub: "this season",
    },
    {
      label: "Last 30 days",
      value: accuracy
        ? `${(accuracy.last_30_days_accuracy * 100).toFixed(1)}%`
        : "...",
      color: "text-green-400",
      sub: "rolling accuracy",
    },
    {
      label: "Tonight's games",
      value: loadingGames ? "..." : games.length,
      color: "text-indigo-400",
      sub: "predictions ready",
    },
  ];

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white p-6 font-mono">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pb-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-500 rounded-lg flex items-center justify-center text-lg">
            🏀
          </div>
          <div>
            <h1 className="text-lg font-medium tracking-tight">
              nba_predictor{" "}
              <span className="text-zinc-500 text-xs font-light">v1.0</span>
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-green-400">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          model active
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="text-red-400 text-sm">{error}</div>
          <div className="text-red-400/70 text-xs mt-1">
            Please ensure the backend API is running at{" "}
            {process.env.NEXT_PUBLIC_API_URL}
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {stats.map((s) =>
          loadingAccuracy && s.label.includes("accuracy") ? (
            <StatCardSkeleton key={s.label} />
          ) : (
            <StatCard key={s.label} {...s} />
          )
        )}
      </div>

      {/* Games */}
      <div className="mb-8">
        <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-4">
          Tonight's predictions
        </div>
        {loadingGames ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...Array(3)].map((_, i) => (
              <GameCardSkeleton key={i} />
            ))}
          </div>
        ) : games.length === 0 ? (
          <div className="text-zinc-500 text-sm">
            No games scheduled for today.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {games.map((g) => (
              <GameCard key={g.game_id} game={g} />
            ))}
          </div>
        )}
      </div>

      {/* Accuracy Chart */}
      <AccuracyChart data={accuracyTrend} loading={loadingTrend} />
    </main>
  );
}