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
  season: string | null;
  status: string | null;
}

async function fetchTeams(): Promise<Team[]> {
  const { data, error } = await supabase
    .from("teams")
    .select("id, name, category, logo_url, color1, color2, captain_name, coach_name, season, status")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function fetchTeam(id: string): Promise<Team> {
  const { data, error } = await supabase
    .from("teams")
    .select("id, name, category, logo_url, color1, color2, captain_name, coach_name, season, status")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

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
export interface Player {
  id: number;
  name: string;
  position: string;
  jersey_number: number;
  photo_url: string;
  status: string;
  game_attendance?: { count: number }[];
}

export function useTeamRoster(teamId: string) {
  return useQuery<Player[]>({
    queryKey: ["/api/teams", teamId, "roster"],
    queryFn: async () => {
      // Hacemos un select de los jugadores y opcionalmente contamos sus asistencias
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