import type { MapFlightConstraints } from '../types/weather';

export async function getMapConstraintsForPosition(
  _lat: number,
  _lon: number
): Promise<MapFlightConstraints> {
  return {
    inRestrictedAirspace: false,
    restrictionScore: 0,
    dataRevision: 'mock',
  };
}
