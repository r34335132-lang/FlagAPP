import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

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
  const { data, error } = await supabase
    .from("games")
    .select("id, home_team, away_team, home_score, away_score, game_date, game_time, venue, category, status, season, stage, jornada")
    .order("game_date", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export function useMatches() {
  return useQuery<Game[]>({
    queryKey: ["/api/games"],
    queryFn: fetchGames,
    staleTime: 2 * 60 * 1000,
  });
}

const FINISHED = new Set(["finalizado", "final", "terminado"]);
const LIVE = new Set(["en vivo", "live", "en curso"]);
const UPCOMING = new Set(["programado", "scheduled", "pendiente", "por jugar"]);

function isFinished(g: Game) {
  return FINISHED.has(g.status?.toLowerCase() ?? "");
}
function isLive(g: Game) {
  return LIVE.has(g.status?.toLowerCase() ?? "");
}
function isUpcoming(g: Game) {
  const s = g.status?.toLowerCase() ?? "";
  return UPCOMING.has(s) || (g.home_score === null && g.away_score === null && !isLive(g) && !isFinished(g));
}

export function useRecentMatches() {
  const { data, ...rest } = useMatches();
  const recent = data?.filter((g) => isFinished(g) || (g.home_score !== null)).slice(0, 10) ?? [];
  return { data: recent, ...rest };
}

export function useUpcomingMatches() {
  const { data, ...rest } = useMatches();
  const upcoming = data?.filter(isUpcoming).slice(0, 10) ?? [];
  return { data: upcoming, ...rest };
}

export function useLiveMatches() {
  const { data, ...rest } = useMatches();
  const live = data?.filter(isLive) ?? [];
  return { data: live, ...rest };
}
