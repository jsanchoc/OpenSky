export type WindLayer = {
  altitudeM: number;
  speedMs: number;
  deg: number;
};

export type WeatherSnapshot = {
  fetchedAt: string;
  tempC: number;
  humidityPct: number;
  description: string;
  wind: WindLayer;
  gustMs: number | null;
  rainMm1h: number | null;
  windLayers: WindLayer[];
};

export type KpSnapshot = {
  kp: number;
  fetchedAt: string;
};

export type MapFlightConstraints = {
  inRestrictedAirspace: boolean;
  restrictionScore: number;
  dataRevision?: string;
};

export type FlightLight = 'green' | 'yellow' | 'red';

export type FlightAssessment = {
  light: FlightLight;
  reasons: string[];
};
