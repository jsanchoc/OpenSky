import { OPENWEATHER_API_KEY } from '../config/env';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';
import { palette, radii } from '../constants/theme';

type WindPoint = {
  hour: string;   // "14:00"
  speedMs: number;
};

type Props = {
  lat: number;
  lon: number;
};

const THRESHOLD = 12; // m/s — umbral de seguridad
const WIDTH = 320;
const HEIGHT = 160;
const PAD_LEFT = 36;
const PAD_RIGHT = 16;
const PAD_TOP = 16;
const PAD_BOTTOM = 28;
const CHART_W = WIDTH - PAD_LEFT - PAD_RIGHT;
const CHART_H = HEIGHT - PAD_TOP - PAD_BOTTOM;

function toX(i: number, total: number): number {
  return PAD_LEFT + (i / (total - 1)) * CHART_W;
}

function toY(speedMs: number, maxVal: number): number {
  const clamped = Math.min(speedMs, maxVal);
  return PAD_TOP + CHART_H - (clamped / maxVal) * CHART_H;
}

function buildPath(points: WindPoint[], maxVal: number): string {
  return points
    .map((p, i) => {
      const x = toX(i, points.length);
      const y = toY(p.speedMs, maxVal);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

function buildAreaPath(points: WindPoint[], maxVal: number): string {
  const line = buildPath(points, maxVal);
  const lastX = toX(points.length - 1, points.length);
  const firstX = toX(0, points.length);
  const baseY = PAD_TOP + CHART_H;
  return `${line} L${lastX.toFixed(1)},${baseY} L${firstX.toFixed(1)},${baseY} Z`;
}

export default function WindTimeline({ lat, lon }: Props) {
  const [points, setPoints] = useState<WindPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchForecast() {
      setLoading(true);
      setError(null);
      try {
        const url = new URL('https://api.openweathermap.org/data/2.5/forecast');
        url.searchParams.set('lat', String(lat));
        url.searchParams.set('lon', String(lon));
        url.searchParams.set('cnt', '6'); // próximas 18 horas en bloques de 3h
        url.searchParams.set('appid', OPENWEATHER_API_KEY);
        url.searchParams.set('units', 'metric');

        const res = await fetch(url.toString());
        if (!res.ok) throw new Error(`OpenWeather ${res.status}`);
        const data = await res.json();

        const parsed: WindPoint[] = data.list.map((item: {
          dt_txt: string;
          wind: { speed: number };
        }) => ({
          hour: item.dt_txt.split(' ')[1].slice(0, 5),
          speedMs: item.wind?.speed ?? 0,
        }));

        setPoints(parsed);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    }

    void fetchForecast();
  }, [lat, lon]);

  if (loading) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Previsión de viento</Text>
        <ActivityIndicator color={palette.accent} style={{ marginTop: 16 }} />
      </View>
    );
  }

  if (error || points.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Previsión de viento</Text>
        <Text style={styles.errorText}>Sin datos de previsión</Text>
      </View>
    );
  }

  const maxVal = Math.max(THRESHOLD * 1.3, ...points.map((p) => p.speedMs));
  const thresholdY = toY(THRESHOLD, maxVal);
  const exceedsThreshold = points.some((p) => p.speedMs > THRESHOLD);

  const areaColor = exceedsThreshold ? '#EF444440' : '#00C89640';
  const lineColor = exceedsThreshold ? '#EF4444' : '#00C896';

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Previsión de viento</Text>
        <View style={[styles.badge, { backgroundColor: exceedsThreshold ? 'rgba(239,68,68,0.15)' : 'rgba(0,200,150,0.15)' }]}>
          <Text style={[styles.badgeText, { color: exceedsThreshold ? '#EF4444' : '#00C896' }]}>
            {exceedsThreshold ? '⚠ Supera umbral' : '✓ Dentro del límite'}
          </Text>
        </View>
      </View>

      <Svg width={WIDTH} height={HEIGHT}>
        <Defs>
          <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={lineColor} stopOpacity="0.35" />
            <Stop offset="100%" stopColor={lineColor} stopOpacity="0.02" />
          </LinearGradient>
        </Defs>

        {/* Grid horizontal cada 4 m/s */}
        {[0, 4, 8, 12].map((val) => {
          const y = toY(val, maxVal);
          return (
            <Line
              key={val}
              x1={PAD_LEFT}
              y1={y}
              x2={WIDTH - PAD_RIGHT}
              y2={y}
              stroke="rgba(255,255,255,0.07)"
              strokeWidth="1"
            />
          );
        })}

        {/* Labels eje Y */}
        {[0, 4, 8, 12].map((val) => {
          const y = toY(val, maxVal);
          return (
            <SvgText
              key={`label-${val}`}
              x={PAD_LEFT - 6}
              y={y + 4}
              fontSize="9"
              fill="rgba(244,246,255,0.45)"
              textAnchor="end"
            >
              {val}
            </SvgText>
          );
        })}

        {/* Área bajo la curva */}
        <Path
          d={buildAreaPath(points, maxVal)}
          fill="url(#areaGrad)"
        />

        {/* Línea de umbral */}
        <Line
          x1={PAD_LEFT}
          y1={thresholdY}
          x2={WIDTH - PAD_RIGHT}
          y2={thresholdY}
          stroke="#EF4444"
          strokeWidth="1.5"
          strokeDasharray="5,4"
        />
        <SvgText
          x={WIDTH - PAD_RIGHT + 2}
          y={thresholdY + 4}
          fontSize="9"
          fill="#EF4444"
        >
          12
        </SvgText>

        {/* Línea principal */}
        <Path
          d={buildPath(points, maxVal)}
          fill="none"
          stroke={lineColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Puntos */}
        {points.map((p, i) => (
          <Circle
            key={i}
            cx={toX(i, points.length)}
            cy={toY(p.speedMs, maxVal)}
            r="3.5"
            fill={p.speedMs > THRESHOLD ? '#EF4444' : '#00C896'}
            stroke={palette.bgDeep}
            strokeWidth="1.5"
          />
        ))}

        {/* Labels eje X */}
        {points.map((p, i) => (
          <SvgText
            key={`x-${i}`}
            x={toX(i, points.length)}
            y={HEIGHT - 6}
            fontSize="9"
            fill="rgba(244,246,255,0.45)"
            textAnchor="middle"
          >
            {p.hour}
          </SvgText>
        ))}
      </Svg>

      <Text style={styles.disclaimer}>
        Umbral de seguridad: 12 m/s · Bloques de 3h · OpenWeather Forecast
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    color: palette.textCardLabel,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  errorText: {
    color: palette.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 16,
  },
  disclaimer: {
    marginTop: 8,
    fontSize: 10,
    color: palette.textCardSecondary,
    textAlign: 'center',
  },
});