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
            pases_completos,
            puntos_extra,
            sacks,
            intercepciones,
            banderas_jaladas
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
        
        // --- SUMATORIAS DE ATAQUE ---
        const totalTDs = player.player_game_stats?.reduce((sum: number, game: any) => 
          sum + (game.touchdowns_totales || 0), 0
        ) || 0;

        const totalPasesComp = player.player_game_stats?.reduce((sum: number, game: any) => 
          sum + (game.pases_completos || 0), 0
        ) || 0;

        const totalPtsExtra = player.player_game_stats?.reduce((sum: number, game: any) => 
          sum + (game.puntos_extra || 0), 0
        ) || 0;
        
        // --- SUMATORIAS DE DEFENSA ---
        const totalSacks = player.player_game_stats?.reduce((sum: number, game: any) => 
          sum + (game.sacks || 0), 0
        ) || 0;

        const totalINTs = player.player_game_stats?.reduce((sum: number, game: any) => 
          sum + (game.intercepciones || 0), 0
        ) || 0;

        const totalBanderas = player.player_game_stats?.reduce((sum: number, game: any) => 
          sum + (game.banderas_jaladas || 0), 0
        ) || 0;
        
        // --- PREMIOS ---
        const totalMVPs = player.mvps?.length || 0;

        // 3. Devolvemos al jugador con las llaves exactas que espera nuestra UI en standings.tsx
        return {
          ...player,
          touchdowns_totales: totalTDs,
          pases_completos: totalPasesComp,
          puntos_extra: totalPtsExtra,
          sacks: totalSacks,
          intercepciones: totalINTs,
          banderas_jaladas: totalBanderas,
          mvps: totalMVPs
        };
      });

      return processedPlayers || [];
    },
    staleTime: 60 * 1000, // La info se cachea por 1 minuto para no saturar Supabase
  });
}