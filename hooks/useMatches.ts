import { keepPreviousData, type QueryClient, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useSelectedSeason } from "@/hooks/useSeasons";

interface GamesRealtimeEntry {
  channel: ReturnType<typeof supabase.channel>;
  consumers: number;
  queryClients: Map<QueryClient, number>;
}

const gamesRealtimeChannels = new Map<string, GamesRealtimeEntry>();
let gamesRealtimeGeneration = 0;

function subscribeToSeasonGames(seasonId: string, queryClient: QueryClient) {
  let entry = gamesRealtimeChannels.get(seasonId);

  if (!entry) {
    gamesRealtimeGeneration += 1;
    const queryClients = new Map<QueryClient, number>();
    const channel = supabase.channel(`realtime-games-${seasonId}-${gamesRealtimeGeneration}`);

    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "games", filter: `season_id=eq.${seasonId}` },
      () => {
        queryClients.forEach((_, client) => {
          client.invalidateQueries({ queryKey: ["games", seasonId] });
          client.invalidateQueries({ queryKey: ["matches", seasonId] });
        });
      },
    );

    channel.subscribe();
    entry = { channel, consumers: 0, queryClients };
    gamesRealtimeChannels.set(seasonId, entry);
  }

  entry.consumers += 1;
  entry.queryClients.set(queryClient, (entry.queryClients.get(queryClient) ?? 0) + 1);

  return () => {
    const currentEntry = gamesRealtimeChannels.get(seasonId);
    if (!currentEntry || currentEntry !== entry) return;

    currentEntry.consumers -= 1;
    const queryClientConsumers = (currentEntry.queryClients.get(queryClient) ?? 1) - 1;

    if (queryClientConsumers > 0) {
      currentEntry.queryClients.set(queryClient, queryClientConsumers);
    } else {
      currentEntry.queryClients.delete(queryClient);
    }

    if (currentEntry.consumers === 0) {
      gamesRealtimeChannels.delete(seasonId);
      void supabase.removeChannel(currentEntry.channel);
    }
  };
}

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
  season_id: string | null;
  season: string | null;
  stage: string | null;
  jornada: number | null;
  mvp: string | null;
  seconds_remaining: number | null;
  current_period: string | null;
  clock_running: boolean | null;
  clock_last_started_at: string | null;
}

async function fetchGames(seasonId: string): Promise<Game[]> {
  const { data, error } = await supabase
    .from("games")
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
      season_id,
      season,
      stage,
      jornada,
      mvp,
      seconds_remaining,
      current_period,
      clock_running,
      clock_last_started_at
    `)
    .eq("season_id", seasonId)
    .order("game_date", { ascending: true })
    .order("game_time", { ascending: true });

  if (error) {
    console.error("Error fetching games:", error.message);
    throw new Error(error.message);
  }

  return (data as Game[]) ?? [];
}

export function useMatches(seasonId?: string | null) {
  const queryClient = useQueryClient();
  const { selectedSeasonId } = useSelectedSeason();
  const effectiveSeasonId = seasonId ?? selectedSeasonId;

  useEffect(() => {
    if (!effectiveSeasonId) return;

    return subscribeToSeasonGames(effectiveSeasonId, queryClient);
  }, [effectiveSeasonId, queryClient]);

  return useQuery<Game[]>({
    queryKey: ["matches", effectiveSeasonId],
    queryFn: () => fetchGames(effectiveSeasonId!),
    enabled: !!effectiveSeasonId,
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

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

export function useRecentMatches(seasonId?: string | null) {
  const { data, ...rest } = useMatches(seasonId);
  const recent =
    data
      ?.filter((g) => isFinished(g))
      .sort((a, b) => new Date(b.game_date).getTime() - new Date(a.game_date).getTime())
      .slice(0, 10) ?? [];

  return { data: recent, ...rest };
}

export function useUpcomingMatches(seasonId?: string | null) {
  const { data, ...rest } = useMatches(seasonId);
  const upcoming =
    data
      ?.filter(isUpcoming)
      .sort((a, b) => new Date(a.game_date).getTime() - new Date(b.game_date).getTime())
      .slice(0, 10) ?? [];

  return { data: upcoming, ...rest };
}

export function useLiveMatches(seasonId?: string | null) {
  const { data, ...rest } = useMatches(seasonId);
  const live = data?.filter(isLive) ?? [];

  return { data: live, ...rest };
}
