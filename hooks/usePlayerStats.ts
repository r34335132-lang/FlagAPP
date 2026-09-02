import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useSelectedSeason } from "@/hooks/useSeasons";

async function fetchPlayerStats(seasonId: string) {
  const { data: gameStats, error: statsError } = await supabase
    .from("player_game_stats")
    .select(`
      player_id,
      touchdowns_totales,
      pases_completos,
      puntos_extra,
      sacks,
      intercepciones,
      banderas_jaladas,
      games!inner (
        season_id
      )
    `)
    .eq("games.season_id", seasonId)
    .limit(5000);

  if (statsError) {
    console.error("Error fetching player game stats:", statsError);
    throw new Error(statsError.message);
  }

  const { data: mvps, error: mvpsError } = await supabase
    .from("mvps")
    .select("id, player_id, season_id")
    .eq("season_id", seasonId)
    .limit(2000);

  if (mvpsError) {
    console.error("Error fetching MVP stats:", mvpsError);
    throw new Error(mvpsError.message);
  }

  const totalsByPlayer = new Map<number, any>();

  const ensurePlayerTotals = (playerId: number) => {
    if (!totalsByPlayer.has(playerId)) {
      totalsByPlayer.set(playerId, {
        touchdowns_totales: 0,
        pases_completos: 0,
        puntos_extra: 0,
        sacks: 0,
        intercepciones: 0,
        banderas_jaladas: 0,
        mvps: 0,
      });
    }

    return totalsByPlayer.get(playerId);
  };

  (gameStats ?? []).forEach((game: any) => {
    const playerId = Number(game.player_id);
    if (!playerId) return;

    const totals = ensurePlayerTotals(playerId);
    totals.touchdowns_totales += Number(game.touchdowns_totales || 0);
    totals.pases_completos += Number(game.pases_completos || 0);
    totals.puntos_extra += Number(game.puntos_extra || 0);
    totals.sacks += Number(game.sacks || 0);
    totals.intercepciones += Number(game.intercepciones || 0);
    totals.banderas_jaladas += Number(game.banderas_jaladas || 0);
  });

  (mvps ?? []).forEach((mvp: any) => {
    const playerId = Number(mvp.player_id);
    if (!playerId) return;

    ensurePlayerTotals(playerId).mvps += 1;
  });

  const playerIds = Array.from(totalsByPlayer.keys());
  if (playerIds.length === 0) return [];

  const { data: players, error: playersError } = await supabase
    .from("players")
    .select(`
      id,
      name,
      jersey_number,
      photo_url,
      teams!players_team_id_fkey (
        id,
        name,
        category,
        logo_url,
        color1
      )
    `)
    .in("id", playerIds)
    .limit(playerIds.length);

  if (playersError) {
    console.error("Error fetching players for stats:", playersError);
    throw new Error(playersError.message);
  }

  return (
    players?.map((player: any) => {
      const totals = totalsByPlayer.get(Number(player.id));
      return {
        ...player,
        ...totals,
      };
    }) ?? []
  );
}

export function usePlayerStats(seasonId?: string | null) {
  const { selectedSeasonId } = useSelectedSeason();
  const effectiveSeasonId = seasonId ?? selectedSeasonId;

  return useQuery({
    queryKey: ["player-stats", effectiveSeasonId],
    queryFn: () => fetchPlayerStats(effectiveSeasonId!),
    enabled: !!effectiveSeasonId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
