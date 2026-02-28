import { useQuery } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/query-client";

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
  const url = new URL("/api/teams", getApiUrl());
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to fetch teams");
  return res.json();
}

async function fetchTeam(id: string): Promise<Team> {
  const url = new URL(`/api/teams/${id}`, getApiUrl());
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to fetch team");
  return res.json();
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
