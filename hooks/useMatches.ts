import { useQuery } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/query-client";

export interface Game {
  id: string;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  game_date: string | null;
  game_time: string | null;
  venue: string | null;
  category: string | null;
  status: string | null;
  season: string | null;
  stage: string | null;
  jornada: number | null;
}

async function fetchGames(): Promise<Game[]> {
  const url = new URL("/api/games", getApiUrl());
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to fetch games");
  return res.json();
}

export function useMatches() {
  return useQuery<Game[]>({
    queryKey: ["/api/games"],
    queryFn: fetchGames,
    staleTime: 2 * 60 * 1000,
  });
}

export function useRecentMatches() {
  const { data, ...rest } = useMatches();
  const recent = data
    ?.filter((g) => g.status?.toLowerCase() === "finalizado" || g.status?.toLowerCase() === "final" || g.home_score !== null)
    .slice(0, 10) ?? [];
  return { data: recent, ...rest };
}

export function useUpcomingMatches() {
  const { data, ...rest } = useMatches();
  const upcoming = data
    ?.filter((g) => g.status?.toLowerCase() === "programado" || g.status?.toLowerCase() === "scheduled" || (g.home_score === null && g.away_score === null))
    .slice(0, 10) ?? [];
  return { data: upcoming, ...rest };
}

export function useLiveMatches() {
  const { data, ...rest } = useMatches();
  const live = data?.filter((g) => g.status?.toLowerCase() === "en vivo" || g.status?.toLowerCase() === "live") ?? [];
  return { data: live, ...rest };
}
