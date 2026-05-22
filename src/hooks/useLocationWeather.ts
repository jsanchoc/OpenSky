import * as Location from "expo-location";
import { useCallback, useEffect, useState } from "react";
import { getMapConstraintsForPosition } from "../map/partnerMapContract";
import { assessFlight } from "../services/flightSemaphor";
import { fetchLatestKp } from "../services/kpService";
import { fetchWeatherSnapshot } from "../services/weatherService";
import type {
  FlightAssessment,
  KpSnapshot,
  MapFlightConstraints,
  WeatherSnapshot,
} from "../types/weather";

// --- CONFIGURACIÓN DE TEST ---
const USE_FAKE_LOCATION = false;
// ------- Favorable --------
// Sevilla — caluroso y seco
// const FAKE_COORDS = { lat: 37.3891, lon: -5.9845 };

// ------- Precaución --------
// Menorca — isla muy ventosa, Tramontana frecuente
const FAKE_COORDS = { lat: 39.9496, lon: 4.1409 };

// Tarifa (Cádiz) — corredor de viento entre Atlántico y Mediterráneo
// const FAKE_COORDS = { lat: 36.0143, lon: -5.6044 };

// San Sebastián — costa atlántica, brisa fuerte y lluvia ocasional en junio
// const FAKE_COORDS = { lat: 43.3183, lon: -1.9812 };

// ------- No Volar ----------
// Santiago de Compostela — Galicia, la más lluviosa de España incluso en junio
// const FAKE_COORDS = { lat: 42.8782, lon: -8.5448 };

// Bilbao — viento atlántico fuerte, lluvia frecuente
// const FAKE_COORDS = { lat: 43.263, lon: -2.935 };

// Santander — costa cantábrica, viento y lluvia
// const FAKE_COORDS = { lat: 43.4623, lon: -3.8099 };
// -----------------------------
export type LocationWeatherState = {
  coords: { lat: number; lon: number } | null;
  weather: WeatherSnapshot | null;
  kp: KpSnapshot | null;
  mapConstraints: MapFlightConstraints | null;
  assessment: FlightAssessment | null;
  loading: boolean;
  error: string | null;
  permissionDenied: boolean;
  refresh: () => Promise<void>;
};

export function useLocationWeather(): LocationWeatherState {
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(
    null,
  );
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [kp, setKp] = useState<KpSnapshot | null>(null);
  const [assessment, setAssessment] = useState<FlightAssessment | null>(null);
  const [mapConstraints, setMapConstraints] =
    useState<MapFlightConstraints | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Gestión de Permisos
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== "granted") {
        setPermissionDenied(true);
        setLoading(false);
        return;
      }
      setPermissionDenied(false);

      // 2. Determinar Coordenadas (Reales o Fake)
      let lat: number;
      let lon: number;

      if (USE_FAKE_LOCATION) {
        lat = FAKE_COORDS.lat;
        lon = FAKE_COORDS.lon;
      } else {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        lat = pos.coords.latitude;
        lon = pos.coords.longitude;
      }

      setCoords({ lat, lon });

      // 3. Llamadas a APIs en paralelo para máxima velocidad
      const [w, k, constraints] = await Promise.all([
        fetchWeatherSnapshot(lat, lon),
        fetchLatestKp(),
        getMapConstraintsForPosition(lat, lon),
      ]);

      // 4. Actualizar estados y calcular semáforo
      setWeather(w);
      setKp(k);
      setMapConstraints(constraints);
      setAssessment(assessFlight(w, k, constraints));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      console.error("Error en useLocationWeather:", e);
      setError(msg);
      setMapConstraints(null);
      setAssessment(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    coords,
    weather,
    kp,
    mapConstraints,
    assessment,
    loading,
    error,
    permissionDenied,
    refresh: load,
  };
}
