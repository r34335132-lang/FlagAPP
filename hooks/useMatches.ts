import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface Game {
  id: string;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  game_date: string;
  game_time: string;
  venue: string | null;
  field: string | null;
  category: string | null;
  status: string | null;
  season: string | null;
  stage: string | null;
  jornada: number | null;
  mvp: string | null;
  // Campos para el cronómetro en vivo
  seconds_remaining: number | null;
  current_period: string | null;
  clock_running: boolean | null;
  clock_last_started_at: string | null;
}

async function fetchGames(): Promise<Game[]> {
  const { data, error } = await supabase
    .from('games')
    .select(`
      id, 
      home_team, 
      away_team, 
      home_score, 
      away_score, 
      game_date, 
      game_time, 
      status, 
      category, 
      venue, 
      field,
      season,
      stage,
      jornada,
      mvp,
      seconds_remaining,
      current_period,
      clock_running,
      clock_last_started_at
    `)
    .order("game_date", { ascending: true })
    .order("game_time", { ascending: true });

  if (error) {
    console.error("Error fetching games:", error.message);
    throw new Error(error.message);
  }
  return (data as any) ?? [];
}

export function useMatches() {
  return useQuery<Game[]>({
    queryKey: ["matches"],
    queryFn: fetchGames,
    staleTime: 30 * 1000, // Datos frescos por 30 segundos
  });
}

// Filtros de estado consistentes con el resto de la App
const FINISHED = new Set(["finalizado", "final", "terminado"]);
const LIVE = new Set(["en vivo", "live", "en curso", "en_vivo"]);
const UPCOMING = new Set(["programado", "scheduled", "pendiente", "por jugar", "proximo"]);

function isFinished(g: Game) {
  return FINISHED.has(g.status?.toLowerCase() ?? "");
}

function isLive(g: Game) {
  return LIVE.has(g.status?.toLowerCase() ?? "");
}

function isUpcoming(g: Game) {
  const s = g.status?.toLowerCase() ?? "";
  return UPCOMING.has(s) || (!isLive(g) && !isFinished(g));
}

export function useRecentMatches() {
  const { data, ...rest } = useMatches();
  const recent = data
    ?.filter((g) => isFinished(g))
    .sort((a, b) => new Date(b.game_date).getTime() - new Date(a.game_date).getTime())
    .slice(0, 10) ?? [];
  return { data: recent, ...rest };
}

export function useUpcomingMatches() {
  const { data, ...rest } = useMatches();
  const upcoming = data
    ?.filter(isUpcoming)
    .sort((a, b) => new Date(a.game_date).getTime() - new Date(b.game_date).getTime())
    .slice(0, 10) ?? [];
  return { data: upcoming, ...rest };
}

export function useLiveMatches() {
  const { data, ...rest } = useMatches();
  const live = data?.filter(isLive) ?? [];
  return { data: live, ...rest };
}