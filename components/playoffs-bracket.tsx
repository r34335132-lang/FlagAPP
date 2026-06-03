'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Crown } from 'lucide-react';
import confetti from 'canvas-confetti';
import { SingleEliminationBracket, Match, SVGViewer } from '@g-loot/react-tournament-brackets';

type Game = {
  id: number;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  stage: string;
  category: string;
  status: string;
  game_date: string;
  game_time: string;
};

export function PlayoffsBracket({ category }: { category: string }) {
  const supabase = createClientComponentClient();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlayoffGames();
  }, [category]);

  const fetchPlayoffGames = async () => {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('category', category)
        .in('stage', ['comodin', 'quarterfinal', 'semifinal', 'final'])
        .order('id', { ascending: true }); // Ordenamos para mantener consistencia en las llaves

      if (error) throw error;
      setGames(data || []);
    } catch (error) {
      console.error('Error cargando juegos de playoffs:', error);
    } finally {
      setLoading(false);
    }
  };

  const triggerConfetti = () => {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#FFD700', '#FFA500', '#FF8C00'] });
      confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#FFD700', '#FFA500', '#FF8C00'] });

      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  };

  // Convertimos tu Data (Game) al Formato requerido por la librería de Brackets
  const formatMatchesForBracket = (gamesList: Game[]) => {
    // Si no hay juegos, retornamos vacío
    if (!gamesList || gamesList.length === 0) return [];

    // Mapeamos los partidos al formato exacto que usa la librería
    const formattedMatches = gamesList.map((game, index) => {
      const homeWon = game.status === 'finalizado' && game.home_score > game.away_score;
      const awayWon = game.status === 'finalizado' && game.away_score > game.home_score;
      
      // Lógica de "Tournament Id" para saber quién avanza a dónde.
      // Como esto es dinámico y manual, asumimos una estructura base:
      // Comodines -> Semifinales -> Final
      let nextMatchId = null;
      let tournamentRoundText = '1'; // 1=Cuartos/Comodin, 2=Semis, 3=Final

      if (game.stage === 'comodin' || game.stage === 'quarterfinal') {
        tournamentRoundText = '1';
        // Buscamos la primera semifinal que tenga 'Por definir' como equipo
        const nextSemi = gamesList.find(g => g.stage === 'semifinal' && (g.home_team === 'Por definir' || g.away_team === 'Por definir'));
        if(nextSemi) nextMatchId = nextSemi.id;
      } 
      else if (game.stage === 'semifinal') {
        tournamentRoundText = '2';
        const finalGame = gamesList.find(g => g.stage === 'final');
        if(finalGame) nextMatchId = finalGame.id;
      }
      else if (game.stage === 'final') {
        tournamentRoundText = '3';
        nextMatchId = null; // Nadie avanza después de la final
      }

      return {
        id: game.id,
        name: game.stage === 'comodin' ? 'Comodín' : (game.stage === 'semifinal' ? 'Semifinal' : 'Final'),
        nextMatchId: nextMatchId,
        tournamentRoundText: tournamentRoundText,
        startTime: `${game.game_date} ${game.game_time}`,
        state: game.status === 'finalizado' ? 'DONE' : (game.status === 'en vivo' ? 'IN_PLAY' : 'SCHEDULED'),
        participants: [
          {
            id: `${game.id}-home`,
            resultText: game.home_score !== null ? game.home_score.toString() : null,
            isWinner: homeWon,
            status: game.status === 'finalizado' ? 'PLAYED' : null,
            name: game.home_team || 'Por definir'
          },
          {
            id: `${game.id}-away`,
            resultText: game.away_score !== null ? game.away_score.toString() : null,
            isWinner: awayWon,
            status: game.status === 'finalizado' ? 'PLAYED' : null,
            name: game.away_team || 'Por definir'
          }
        ]
      };
    });

    return formattedMatches;
  };

  if (loading) return <div className="p-4 text-center text-gray-500 animate-pulse">Cargando Brackets...</div>;

  if (games.length === 0) {
     return <div className="p-8 text-center text-gray-400 border-2 border-dashed rounded-lg mt-4">Aún no hay llaves generadas para {category}</div>;
  }

  // Obtenemos si ya hay campeón para el efecto especial
  const finalMatch = games.find(g => g.stage === 'final');
  let championName = null;
  if (finalMatch && finalMatch.status === 'finalizado') {
    championName = finalMatch.home_score > finalMatch.away_score ? finalMatch.home_team : finalMatch.away_team;
  }

  // Preparamos los datos
  const bracketMatches = formatMatchesForBracket(games);

  return (
    <div className="mt-6 w-full overflow-x-auto pb-8">
      <h3 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-2">
        <Trophy className="text-yellow-500 w-6 h-6" /> 
        Llaves: {category}
      </h3>

      {/* Si ya hay un campeón, mostramos su tarjeta especial */}
      {championName && (
        <div className="mb-8 max-w-md mx-auto">
          {useEffect(() => { triggerConfetti(); }, [])}
          <Card className="border-4 border-yellow-400 bg-gradient-to-b from-yellow-50 to-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Trophy size={100} />
            </div>
            <CardContent className="p-8 text-center flex flex-col items-center justify-center space-y-4">
              <Crown className="text-yellow-500 w-16 h-16 animate-bounce" />
              <h2 className="text-2xl font-black text-gray-800 uppercase tracking-wider">¡Campeón!</h2>
              <div className="w-20 h-20 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center overflow-hidden my-2 shadow-inner">
                 <img src={`https://ui-avatars.com/api/?name=${championName}&background=random&size=150`} alt="Logo Campeón" className="w-full h-full object-cover" />
              </div>
              <p className="text-xl font-bold text-yellow-600 uppercase">{championName}</p>
              <div className="bg-black/5 rounded-full px-4 py-1 text-sm font-semibold mt-2">
                Marcador Final: {finalMatch?.home_score} - {finalMatch?.away_score}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* El Renderizado Automático del Bracket con líneas conectadas */}
      <div className="min-w-[800px] flex justify-center bg-gray-50/50 p-6 rounded-xl border border-gray-100">
        <SingleEliminationBracket
          matches={bracketMatches}
          matchComponent={Match}
          svgWrapper={({ children, ...props }) => (
            <SVGViewer width={800} height={500} {...props}>
              {children}
            </SVGViewer>
          )}
          options={{
            style: {
              connectorColor: '#CBD5E1', // Color de las líneas
              connectorColorHighlight: '#3B82F6', // Color de línea ganadora
              roundHeader: {
                backgroundColor: '#F1F5F9',
                fontColor: '#475569',
              }
            }
          }}
        />
      </div>
    </div>
  );
}