import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

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
  points_difference?: number; // Es bueno tenerlo mapeado por si la vista lo usa
}

async function fetchStats(): Promise<TeamStat[]> {
  const { data, error } = await supabase
    .from("team_stats")
    .select("team_name, team_category, season, games_played, games_won, games_lost, games_tied, points_for, points_against, points")
    .eq("season", "2025") // 🔥 LA MAGIA: Obligamos a que solo traiga la temporada actual
    .order("points", { ascending: false });
    
  if (error) throw new Error(error.message);
  
  // Calculamos la diferencia de puntos al vuelo por si el componente de tabla la necesita para el desempate
  const mappedData = data?.map(stat => ({
    ...stat,
    points_difference: (stat.points_for || 0) - (stat.points_against || 0)
  }));
  
  return mappedData ?? [];
}

export function useStats() {
  return useQuery<TeamStat[]>({
    queryKey: ["/api/team-stats", "2025"], // Actualizamos el key para que React Query refresque la caché
    queryFn: fetchStats,
    staleTime: 5 * 60 * 1000,
  });
}