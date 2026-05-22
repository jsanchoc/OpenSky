import { OPENWEATHER_API_KEY } from "../config/env";
import type { WeatherSnapshot, WindLayer } from "../types/weather";

type OwmForecastResponse = {
  list: Array<{
    weather?: { description: string }[];
    main?: { temp: number; humidity: number };
    wind?: { speed: number; deg: number; gust?: number };
    rain?: { "3h"?: number };
  }>;
};

function degToWindLayer(
  speed: number,
  deg: number,
  altitudeM: number,
): WindLayer {
  return { altitudeM, speedMs: speed, deg: ((deg % 360) + 360) % 360 };
}

export async function fetchWeatherSnapshot(
  lat: number,
  lon: number,
): Promise<WeatherSnapshot> {
  if (!OPENWEATHER_API_KEY) {
    throw new Error("Falta EXPO_PUBLIC_OPENWEATHER_API_KEY en .env");
  }

  const url = new URL("https://api.openweathermap.org/data/2.5/forecast");
  url.searchParams.set("cnt", "2");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("appid", OPENWEATHER_API_KEY);
  url.searchParams.set("units", "metric");
  url.searchParams.set("lang", "es");

  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenWeather ${res.status}: ${text}`);
  }

  const data = (await res.json()) as OwmForecastResponse;
  const current = data.list[1];
  const windSpeed = current.wind?.speed ?? 0;
  const windDeg = current.wind?.deg ?? 0;
  const gust = current.wind?.gust ?? null;
  const rain1h = current.rain?.["3h"] ?? 0;

  const base = degToWindLayer(windSpeed, windDeg, 10);
  const windLayers: WindLayer[] = [
    base,
    degToWindLayer(windSpeed * 1.08, windDeg + 4, 50),
    degToWindLayer(windSpeed * 1.15, windDeg + 8, 120),
  ];

  return {
    fetchedAt: new Date().toISOString(),
    tempC: current.main?.temp ?? 0,
    humidityPct: current.main?.humidity ?? 0,
    description: current.weather?.[0]?.description ?? "—",
    wind: base,
    gustMs: gust ?? null,
    rainMm1h: rain1h,
    windLayers,
  };
}
