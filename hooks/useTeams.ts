import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useSelectedSeason } from "@/hooks/useSeasons";

export interface Team {
  id: string;
  name: string;
  category: string;
  logo_url: string | null;
  color1: string | null;
  color2: string | null;
  captain_name: string | null;
  coach_name: string | null;
  coach_id: number | null;
  coach_photo_url: string | null;
  season_id: string | null;
  season: string | null;
  status: string | null;
}

export interface Player {
  id: number;
  name: string;
  position: string;
  jersey_number: number;
  photo_url: string;
  status: string;
  game_attendance?: { count: number }[];
  admin_verified?: boolean;
  seasons_played?: number;
  playing_since?: string;
  blood_type?: string;
  birth_date?: string;
  teams?: {
    id: string;
    name: string;
    logo_url: string | null;
    color1: string | null;
  };
}

async function fetchTeams(seasonId: string): Promise<Team[]> {
  const { data, error } = await supabase
    .from("teams")
    .select("id, name, category, logo_url, color1, color2, captain_name, coach_name, coach_id, coach_photo_url, season_id, season, status")
    .eq("season_id", seasonId)
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as Team[]) ?? [];
}

async function fetchTeam(id: string, seasonId: string): Promise<Team> {
  const { data, error } = await supabase
    .from("teams")
    .select("id, name, category, logo_url, color1, color2, captain_name, coach_name, coach_id, coach_photo_url, season_id, season, status")
    .eq("id", id)
    .eq("season_id", seasonId)
    .single();

  if (error) throw new Error(error.message);
  return data as Team;
}

export function useTeams(seasonId?: string | null) {
  const { selectedSeasonId } = useSelectedSeason();
  const effectiveSeasonId = seasonId ?? selectedSeasonId;

  return useQuery<Team[]>({
    queryKey: ["teams", effectiveSeasonId],
    queryFn: () => fetchTeams(effectiveSeasonId!),
    enabled: !!effectiveSeasonId,
    staleTime: 15 * 60 * 1000,
    gcTime: 45 * 60 * 1000,
  });
}

export function useTeam(id: string, seasonId?: string | null) {
  const { selectedSeasonId } = useSelectedSeason();
  const effectiveSeasonId = seasonId ?? selectedSeasonId;

  return useQuery<Team>({
    queryKey: ["teams", effectiveSeasonId, id],
    queryFn: () => fetchTeam(id, effectiveSeasonId!),
    staleTime: 15 * 60 * 1000,
    gcTime: 45 * 60 * 1000,
    enabled: !!id && !!effectiveSeasonId,
  });
}

export function useTeamRoster(teamId: string) {
  return useQuery<Player[]>({
    queryKey: ["teams", teamId, "roster"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, name, position, jersey_number, photo_url, status")
        .eq("team_id", teamId)
        .order("jersey_number", { ascending: true });

      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: !!teamId,
    staleTime: 15 * 60 * 1000,
    gcTime: 45 * 60 * 1000,
  });
}

export function usePlayer(playerId: string) {
  const { selectedSeasonId } = useSelectedSeason();

  return useQuery({
    queryKey: ["player", selectedSeasonId, playerId],
    queryFn: async () => {
      const { data: player, error } = await supabase
        .from("players")
        .select(`
          *,
          teams!players_team_id_fkey (
            id,
            name,
            logo_url,
            color1
          )
        `)
        .eq("id", playerId)
        .single();

      if (error) throw new Error(error.message);

      const { data: attendanceData, error: attendanceError } = await supabase
        .from("game_attendance")
        .select(`
          id,
          games!inner (
            id,
            home_team,
            away_team,
            game_date,
            season_id
          )
        `)
        .eq("player_id", playerId)
        .eq("attended", true)
        .eq("games.season_id", selectedSeasonId);

      if (attendanceError) {
        console.error("Error trayendo asistencias:", attendanceError);
      }

      const gameHistory =
        attendanceData
          ?.map((record: any) => record.games)
          .filter(Boolean)
          .sort((a: any, b: any) => new Date(b.game_date).getTime() - new Date(a.game_date).getTime()) || [];

      return {
        ...player,
        attendance_count: gameHistory.length,
        gameHistory,
      };
    },
    enabled: !!playerId && !!selectedSeasonId,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}

export function useHeadToHead(team1: string, team2: string, seasonId?: string | null) {
  const { selectedSeasonId } = useSelectedSeason();
  const effectiveSeasonId = seasonId ?? selectedSeasonId;

  return useQuery({
    queryKey: ["h2h", effectiveSeasonId, team1, team2],
    queryFn: async () => {
      if (!team1 || !team2 || !effectiveSeasonId) return null;

      const { data, error } = await supabase
        .from("games")
        .select("id, home_team, away_team, home_score, away_score, game_date, status, season_id")
        .eq("season_id", effectiveSeasonId)
        .or(`and(home_team.eq."${team1}",away_team.eq."${team2}"),and(home_team.eq."${team2}",away_team.eq."${team1}")`)
        .in("status", ["finalizado", "completado"])
        .order("game_date", { ascending: false });

      if (error) throw new Error(error.message);

      let team1Wins = 0;
      let team2Wins = 0;
      let draws = 0;

      data?.forEach((game) => {
        const t1Score = game.home_team === team1 ? game.home_score : game.away_score;
        const t2Score = game.home_team === team2 ? game.home_score : game.away_score;

        if ((t1Score ?? 0) > (t2Score ?? 0)) team1Wins++;
        else if ((t2Score ?? 0) > (t1Score ?? 0)) team2Wins++;
        else draws++;
      });

      return {
        history: data || [],
        team1Wins,
        team2Wins,
        draws,
        totalGames: data?.length || 0,
        lastGame: data?.[0] || null,
      };
    },
    enabled: !!team1 && !!team2 && !!effectiveSeasonId,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}
