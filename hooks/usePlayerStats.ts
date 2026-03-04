import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export function usePlayerStats() {
  return useQuery({
    queryKey: ["player_stats"],
    queryFn: async () => {
      // 1. Descargamos a los jugadores junto con su historial de partidos y sus premios
      const { data, error } = await supabase
        .from("players")
        .select(`
          id,
          name,
          jersey_number,
          photo_url,
          teams!players_team_id_fkey (
            name,
            category,
            logo_url,
            color1
          ),
          player_game_stats (
            touchdowns_totales,
            intercepciones
          ),
          mvps (
            id
          )
        `);

      if (error) {
        console.error("Error fetching player stats:", error);
        return [];
      }
      
      // 2. Procesamos la información para sumar todo automáticamente
      const processedPlayers = data?.map((player: any) => {
        
        // Sumamos todos los TDs de todos los partidos que ha jugado
        const totalTDs = player.player_game_stats?.reduce((sum: number, game: any) => 
          sum + (game.touchdowns_totales || 0), 0
        ) || 0;
        
        // Sumamos todas las intercepciones de sus partidos
        const totalINTs = player.player_game_stats?.reduce((sum: number, game: any) => 
          sum + (game.intercepciones || 0), 0
        ) || 0;
        
        // Contamos cuántos registros tiene en la tabla de MVPs
        const totalMVPs = player.mvps?.length || 0;

        // Devolvemos al jugador ya con sus totales calculados
        return {
          ...player,
          touchdowns: totalTDs,
          interceptions: totalINTs,
          mvps: totalMVPs
        };
      });

      return processedPlayers || [];
    },
    staleTime: 60 * 1000,
  });
}