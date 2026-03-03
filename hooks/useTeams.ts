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
  coach_id: number | null; // <-- AÑADIDO
  coach_photo_url: string | null; // <-- AÑADIDO
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
  // Campos adicionales para el perfil público
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
    // AÑADIDO: coach_id, coach_photo_url
    .select("id, name, category, logo_url, color1, color2, captain_name, coach_name, coach_id, coach_photo_url, season, status")
    .order("name", { ascending: true });
  
  if (error) throw new Error(error.message);
  return data ?? [];
}

// 2. Obtener un equipo específico por ID
async function fetchTeam(id: string): Promise<Team> {
  const { data, error } = await supabase
    .from("teams")
    // AÑADIDO: coach_id, coach_photo_url
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

      // 2. Contamos sus asistencias confirmadas en la tabla game_attendance
      const { count, error: countError } = await supabase
        .from("game_attendance")
        .select("*", { count: "exact", head: true })
        .eq("player_id", playerId)
        .eq("attended", true); // Solo contamos donde attended es true

      // Devolvemos el jugador combinado con su número de asistencias
      return { 
        ...player, 
        attendance_count: count || 0 
      };
    },
    enabled: !!playerId,
  });
}