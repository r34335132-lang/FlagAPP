import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

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

// 1. Obtener todos los equipos
async function fetchTeams(): Promise<Team[]> {
  const { data, error } = await supabase
    .from("teams")
    .select("id, name, category, logo_url, color1, color2, captain_name, coach_name, coach_id, coach_photo_url, season, status")
    .order("name", { ascending: true });
  
  if (error) throw new Error(error.message);
  return data ?? [];
}

// 2. Obtener un equipo específico por ID
async function fetchTeam(id: string): Promise<Team> {
  const { data, error } = await supabase
    .from("teams")
    .select("id, name, category, logo_url, color1, color2, captain_name, coach_name, coach_id, coach_photo_url, season, status")
    .eq("id", id)
    .single();
  
  if (error) throw new Error(error.message);
  return data;
}

// --- Hooks ---

export function useTeams() {
  return useQuery<Team[]>({
    queryKey: ["/api/teams"],
    queryFn: fetchTeams,
    staleTime: 5 * 60 * 1000,
  });
}

export function useTeam(id: string) {
  return useQuery<Team>({
    queryKey: ["/api/teams", id],
    queryFn: () => fetchTeam(id),
    staleTime: 5 * 60 * 1000,
    enabled: !!id,
  });
}

export function useTeamRoster(teamId: string) {
  return useQuery<Player[]>({
    queryKey: ["/api/teams", teamId, "roster"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select(`
          id, 
          name, 
          position, 
          jersey_number, 
          photo_url, 
          status
        `)
        .eq("team_id", teamId)
        .order("jersey_number", { ascending: true });
        
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: !!teamId,
  });
}

// NUEVO: Hook para el Perfil del Jugador con Historial de Asistencias (CORREGIDO SIN 'week')
export function usePlayer(playerId: string) {
  return useQuery({
    queryKey: ["player", playerId],
    queryFn: async () => {
      // 1. Buscamos al jugador y su equipo
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

      // 2. Traemos el historial DETALLADO de asistencias (cruzando con 'games')
      const { data: attendanceData, error: attendanceError } = await supabase
        .from("game_attendance")
        .select(`
          id,
          games (
            id,
            home_team,
            away_team,
            game_date
          )
        `)
        .eq("player_id", playerId)
        .eq("attended", true); // Solo donde sí asistió

      if (attendanceError) {
        console.error("Error trayendo asistencias:", attendanceError);
      }

      // 3. Extraemos los juegos y los ordenamos del más reciente al más antiguo
      const gameHistory = attendanceData
        ?.map((record: any) => record.games)
        .filter(game => game != null) // Filtramos nulos por si acaso
        .sort((a: any, b: any) => new Date(b.game_date).getTime() - new Date(a.game_date).getTime()) || [];

      // Devolvemos el jugador combinado con su historial completo
      return { 
        ...player, 
        attendance_count: gameHistory.length,
        gameHistory // <-- Este array es el que pintaremos en la pantalla
      };
    },
    enabled: !!playerId,
  });
}

// NUEVO: Hook para el Historial "Cara a Cara" (Head-to-Head)
export function useHeadToHead(team1: string, team2: string) {
  return useQuery({
    queryKey: ["h2h", team1, team2],
    queryFn: async () => {
      if (!team1 || !team2) return null;

      // Buscamos todos los juegos donde participen ambos equipos (sin importar quién fue local o visitante)
      const { data, error } = await supabase
        .from("games")
        .select("id, home_team, away_team, home_score, away_score, game_date, status")
        .or(`and(home_team.eq."${team1}",away_team.eq."${team2}"),and(home_team.eq."${team2}",away_team.eq."${team1}")`)
        .in("status", ["finalizado", "completado"]) // Traemos solo los que ya terminaron
        .order("game_date", { ascending: false });

      if (error) throw new Error(error.message);

      // Calculamos quién ha ganado más
      let team1Wins = 0;
      let team2Wins = 0;
      let draws = 0;

      data?.forEach((game) => {
        // Encontramos qué score le pertenece a qué equipo en cada partido
        const t1Score = game.home_team === team1 ? game.home_score : game.away_score;
        const t2Score = game.home_team === team2 ? game.home_score : game.away_score;

        if (t1Score > t2Score) team1Wins++;
        else if (t2Score > t1Score) team2Wins++;
        else draws++;
      });

      return {
        history: data || [],
        team1Wins,
        team2Wins,
        draws,
        totalGames: data?.length || 0,
        lastGame: data?.[0] || null, // El partido más reciente para mostrarlo
      };
    },
    enabled: !!team1 && !!team2,
  });
}