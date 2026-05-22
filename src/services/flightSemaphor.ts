import type {
  FlightAssessment,
  FlightLight,
  KpSnapshot,
  MapFlightConstraints,
  WeatherSnapshot,
} from "../types/weather";

function pushReason(reasons: string[], condition: boolean, text: string): void {
  if (condition) reasons.push(text);
}

export function assessFlight(
  weather: WeatherSnapshot,
  kp: KpSnapshot | null,
  map: MapFlightConstraints,
): FlightAssessment {
  const reasons: string[] = [];

  const wind = weather.wind.speedMs;
  const gust = weather.gustMs ?? wind;
  const rain = weather.rainMm1h ?? 0;

  // --- Factores que van directo a ROJO (bloqueantes) ---
  const hardBlock =
    map.inRestrictedAirspace || wind > 12 || gust > 16 || rain > 3;

  // --- Factores de PRECAUCIÓN (amarillo si solo hay 1) ---
  pushReason(
    reasons,
    wind > 7 && wind <= 12,
    "Viento moderado, operar con precaución",
  );
  pushReason(reasons, gust > 10 && gust <= 16, "Ráfagas moderadas");
  pushReason(reasons, rain > 0 && rain <= 3, "Lluvia ligera (revisar radar)");
  pushReason(
    reasons,
    kp !== null && kp.kp >= 5 && kp.kp < 6,
    "Actividad geomagnética moderada",
  );

  // --- Factores bloqueantes con mensaje ---
  if (map.inRestrictedAirspace)
    reasons.push("Restricción cartográfica en tu posición");
  if (wind > 12) reasons.push("Viento sostenido elevado");
  if (gust > 16) reasons.push("Ráfagas elevadas");
  if (rain > 3) reasons.push("Lluvia intensa");
  if (kp !== null && kp.kp >= 6)
    reasons.push("Actividad geomagnética alta (Kp)");
  pushReason(
    reasons,
    map.restrictionScore > 0.6,
    "Zona con restricciones cartográficas",
  );

  // --- Decisión final ---
  let light: FlightLight = "green";
  if (hardBlock || reasons.length >= 2) light = "red";
  else if (reasons.length === 1) light = "yellow";

  return { light, reasons };
}
