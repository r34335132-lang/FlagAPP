import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

const SELECTED_SEASON_KEY = "flagapp:selected-season-id-v2";

export interface Season {
  id: string;
  name?: string | null;
  label?: string | null;
  season?: string | null;
  year?: number | string | null;
  is_active?: boolean | null;
  active?: boolean | null;
  status?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  created_at?: string | null;
}

interface SelectedSeasonContextValue {
  seasons: Season[];
  activeSeason: Season | null;
  selectedSeason: Season | null;
  selectedSeasonId: string | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  setSelectedSeason: (seasonId: string) => void;
}

const SelectedSeasonContext = createContext<SelectedSeasonContextValue | null>(null);

export function seasonLabel(season?: Season | null) {
  if (!season) return "Temporada";
  return (
    season.name ||
    season.label ||
    season.season ||
    (season.year ? `Temporada ${season.year}` : "Temporada")
  );
}

export function isSeasonActive(season?: Season | null) {
  return Boolean(season?.is_active ?? season?.active ?? false) || season?.status?.toLowerCase() === "active";
}

function isSeasonArchived(season?: Season | null) {
  return season?.status?.toLowerCase() === "archived";
}

function sortSeasons(seasons: Season[]) {
  return [...seasons].sort((a, b) => {
    const activeDiff = Number(isSeasonActive(b)) - Number(isSeasonActive(a));
    if (activeDiff !== 0) return activeDiff;

    const archivedDiff = Number(isSeasonArchived(a)) - Number(isSeasonArchived(b));
    if (archivedDiff !== 0) return archivedDiff;

    const aYear = Number(a.year ?? a.season ?? 0);
    const bYear = Number(b.year ?? b.season ?? 0);
    if (!Number.isNaN(aYear) && !Number.isNaN(bYear) && bYear !== aYear) return bYear - aYear;

    return seasonLabel(b).localeCompare(seasonLabel(a));
  });
}

async function fetchSeasons(): Promise<Season[]> {
  const { data, error } = await supabase.from("seasons").select("*");

  if (error) {
    console.error("Error fetching seasons:", error.message);
    throw new Error(error.message);
  }

  return sortSeasons((data as Season[]) ?? []);
}

export function useSeasons() {
  return useQuery({
    queryKey: ["seasons"],
    queryFn: fetchSeasons,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function SelectedSeasonProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoading, error, refetch } = useSeasons();
  const seasons = useMemo(() => data ?? [], [data]);
  const activeSeason = useMemo(
    () => seasons.find(isSeasonActive) ?? seasons.find((season) => !isSeasonArchived(season)) ?? seasons[0] ?? null,
    [seasons],
  );
  const [hydrated, setHydrated] = useState(false);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    AsyncStorage.getItem(SELECTED_SEASON_KEY)
      .then((storedSeasonId) => {
        if (!mounted) return;
        setSelectedSeasonId(storedSeasonId);
      })
      .catch((storageError) => {
        console.warn("No se pudo leer la temporada guardada:", storageError);
      })
      .finally(() => {
        if (mounted) setHydrated(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated || isLoading || seasons.length === 0) return;

    const selectedSeason = seasons.find((season) => season.id === selectedSeasonId);
    if (selectedSeason) return;

    const fallbackSeasonId = activeSeason?.id ?? seasons[0]?.id ?? null;
    setSelectedSeasonId(fallbackSeasonId);

    if (fallbackSeasonId) {
      AsyncStorage.setItem(SELECTED_SEASON_KEY, fallbackSeasonId).catch((storageError) => {
        console.warn("No se pudo guardar la temporada activa:", storageError);
      });
    }
  }, [activeSeason?.id, hydrated, isLoading, seasons, selectedSeasonId]);

  const setSelectedSeason = useCallback((seasonId: string) => {
    setSelectedSeasonId(seasonId);
    AsyncStorage.setItem(SELECTED_SEASON_KEY, seasonId).catch((storageError) => {
      console.warn("No se pudo guardar la temporada seleccionada:", storageError);
    });
  }, []);

  const selectedSeason = useMemo(
    () => seasons.find((season) => season.id === selectedSeasonId) ?? activeSeason,
    [activeSeason, seasons, selectedSeasonId],
  );

  const value = useMemo<SelectedSeasonContextValue>(
    () => ({
      seasons,
      activeSeason,
      selectedSeason,
      selectedSeasonId: selectedSeason?.id ?? null,
      isLoading: !hydrated || isLoading,
      error: error instanceof Error ? error : null,
      refetch,
      setSelectedSeason,
    }),
    [activeSeason, error, hydrated, isLoading, refetch, seasons, selectedSeason, setSelectedSeason],
  );

  return <SelectedSeasonContext.Provider value={value}>{children}</SelectedSeasonContext.Provider>;
}

export function useSelectedSeason() {
  const context = useContext(SelectedSeasonContext);

  if (!context) {
    throw new Error("useSelectedSeason debe usarse dentro de SelectedSeasonProvider");
  }

  return context;
}
