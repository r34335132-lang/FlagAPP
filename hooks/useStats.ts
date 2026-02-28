import { useQuery } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/query-client";

export interface TeamStat {
  team_name: string;
  team_category: string | null;
  season: string | null;
  games_played: number;
  games_won: number;
  games_lost: number;
  games_tied: number;
  points_for: number | null;
  points_against: number | null;
  points: number;
}

async function fetchStats(): Promise<TeamStat[]> {
  const url = new URL("/api/team-stats", getApiUrl());
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}

export function useStats() {
  return useQuery<TeamStat[]>({
    queryKey: ["/api/team-stats"],
    queryFn: fetchStats,
    staleTime: 5 * 60 * 1000,
  });
}
