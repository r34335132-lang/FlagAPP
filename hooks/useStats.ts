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
}

async function fetchStats(): Promise<TeamStat[]> {
  const { data, error } = await supabase
    .from("team_stats")
    .select("team_name, team_category, season, games_played, games_won, games_lost, games_tied, points_for, points_against, points")
    .order("points", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export function useStats() {
  return useQuery<TeamStat[]>({
    queryKey: ["/api/team-stats"],
    queryFn: fetchStats,
    staleTime: 5 * 60 * 1000,
  });
}
