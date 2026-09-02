import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useSelectedSeason } from "@/hooks/useSeasons";

export interface TeamStat {
  team_name: string;
  team_category: string | null;
  season_id: string | null;
  season: string | null;
  games_played: number;
  games_won: number;
  games_lost: number;
  games_tied: number;
  points_for: number | null;
  points_against: number | null;
  points: number;
  points_difference?: number;
}

async function fetchStats(seasonId: string): Promise<TeamStat[]> {
  const { data, error } = await supabase
    .from("team_stats")
    .select("team_name, team_category, season_id, season, games_played, games_won, games_lost, games_tied, points_for, points_against, points")
    .eq("season_id", seasonId)
    .order("points", { ascending: false });

  if (error) throw new Error(error.message);

  if (!data?.length) {
    const { data: games, error: gamesError } = await supabase
      .from("games")
      .select("home_team, away_team, home_score, away_score, category, status, stage")
      .eq("season_id", seasonId)
      .in("status", ["finalizado", "completado"])
      .or("stage.eq.regular,stage.is.null")
      .limit(5000);

    if (gamesError) throw new Error(gamesError.message);

    const derivedStats = new Map<string, TeamStat>();
    const ensureTeam = (teamName: string, category: string | null) => {
      if (!derivedStats.has(teamName)) {
        derivedStats.set(teamName, {
          team_name: teamName,
          team_category: category,
          season_id: seasonId,
          season: null,
          games_played: 0,
          games_won: 0,
          games_lost: 0,
          games_tied: 0,
          points_for: 0,
          points_against: 0,
          points: 0,
          points_difference: 0,
        });
      }

      return derivedStats.get(teamName)!;
    };

    (games ?? []).forEach((game) => {
      if (game.home_score == null || game.away_score == null) return;

      const home = ensureTeam(game.home_team, game.category);
      const away = ensureTeam(game.away_team, game.category);
      const homeScore = Number(game.home_score);
      const awayScore = Number(game.away_score);

      home.games_played += 1;
      away.games_played += 1;
      home.points_for = (home.points_for ?? 0) + homeScore;
      home.points_against = (home.points_against ?? 0) + awayScore;
      away.points_for = (away.points_for ?? 0) + awayScore;
      away.points_against = (away.points_against ?? 0) + homeScore;

      if (homeScore > awayScore) {
        home.games_won += 1;
        away.games_lost += 1;
        home.points += 3;
      } else if (awayScore > homeScore) {
        away.games_won += 1;
        home.games_lost += 1;
        away.points += 3;
      } else {
        home.games_tied += 1;
        away.games_tied += 1;
        home.points += 1;
        away.points += 1;
      }
    });

    return Array.from(derivedStats.values())
      .map((stat) => ({
        ...stat,
        points_difference: (stat.points_for ?? 0) - (stat.points_against ?? 0),
      }))
      .sort((a, b) => b.points - a.points || (b.points_difference ?? 0) - (a.points_difference ?? 0));
  }

  return (
    data?.map((stat) => ({
      ...stat,
      points_difference: (stat.points_for || 0) - (stat.points_against || 0),
    })) ?? []
  );
}

export function useStats(seasonId?: string | null) {
  const { selectedSeasonId } = useSelectedSeason();
  const effectiveSeasonId = seasonId ?? selectedSeasonId;

  return useQuery<TeamStat[]>({
    queryKey: ["team-stats", effectiveSeasonId],
    queryFn: () => fetchStats(effectiveSeasonId!),
    enabled: !!effectiveSeasonId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
