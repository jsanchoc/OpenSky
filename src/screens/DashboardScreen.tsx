import WindTimeline from '../components/WindTimeline';
import PreflightChecklist from '../components/PreflightChecklist';
import { WebView } from 'react-native-webview';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { palette, radii } from '../constants/theme';
import { useLocationWeather } from '../hooks/useLocationWeather';
import type {
  FlightLight,
  KpSnapshot,
  MapFlightConstraints,
  WeatherSnapshot,
} from '../types/weather';

function semaphorAccent(light: FlightLight): string {
  if (light === 'green') return '#22C55E';
  if (light === 'red') return '#EF4444';
  return '#F59E0B';
}

function formatCoord(n: number, decimals: number): string {
  return n.toFixed(decimals);
}

function formatFetchedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function windMaxMs(w: WeatherSnapshot): number {
  return Math.max(
    w.wind.speedMs,
    ...w.windLayers.map((l) => l.speedMs)
  );
}

function mapSummaryPart(map: MapFlightConstraints | null): string {
  if (!map) return '○ Mapa —';
  if (map.inRestrictedAirspace) return '⚠ Zona restringida';
  if (map.restrictionScore > 0.6) return '⚠ Restricciones cartográficas';
  return '✓ Sin restricciones';
}

function kpSummaryPart(kp: KpSnapshot | null): string {
  if (kp == null) return '○ Kp —';
  if (kp.kp >= 6) return `⚠ Kp ${kp.kp.toFixed(1)}`;
  return `✓ Kp ${kp.kp.toFixed(1)}`;
}

function windSummaryPart(w: WeatherSnapshot | null, loading: boolean): string {
  if (loading && !w) return '…';
  if (!w) return '○ Viento —';
  const max = windMaxMs(w);
  return `✓ Viento ${max.toFixed(1)} m/s`;
}

function buildDecisionSummaryLine(
  weather: WeatherSnapshot | null,
  kp: KpSnapshot | null,
  map: MapFlightConstraints | null,
  loading: boolean
): string {
  if (loading && !weather) return 'Cargando condiciones…';
  return [
    windSummaryPart(weather, loading),
    mapSummaryPart(map),
    kpSummaryPart(kp),
  ].join(' · ');
}

export default function DashboardScreen() {
  const { height: windowH } = useWindowDimensions();
  const decisionMinHeight = Math.round(windowH * 0.4);
  const [referenceOpen, setReferenceOpen] = useState(false);
  const [checklistVisible, setChecklistVisible] = useState(false);

  const {
    coords,
    weather,
    kp,
    mapConstraints,
    assessment,
    loading,
    error,
    permissionDenied,
    refresh,
  } = useLocationWeather();

  const light = assessment?.light ?? 'yellow';

  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  const animatedShadowRadius = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [6, 22],
  });
  const animatedShadowOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.85],
  });

  const ringColor = semaphorAccent(light);
  const stateTextColor = '#FFFFFF';

  const summaryLine = useMemo(
    () => buildDecisionSummaryLine(weather, kp, mapConstraints, loading),
    [weather, kp, mapConstraints, loading]
  );

  const gustDisplay =
    weather?.gustMs != null ? `${weather.gustMs.toFixed(1)} m/s` : '—';
  const rainDisplay =
    weather?.rainMm1h != null
      ? `${weather.rainMm1h.toFixed(1)} mm`
      : weather
        ? '0 mm'
        : '—';

  return (
    <LinearGradient
      colors={['#070b18', '#0f1c3a', '#050814']}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => void refresh()}
              tintColor={palette.accent}
            />
          }
        >
          {/* HEADER */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitles}>
              <Text style={styles.brand}>OPEN SKY</Text>
              {coords ? (
                <Text style={styles.headerGps} selectable>
                  {formatCoord(coords.lat, 5)}°, {formatCoord(coords.lon, 5)}°
                </Text>
              ) : (
                <Text style={styles.subtitle}>Condiciones en tu posición</Text>
              )}
            </View>
          </View>

          {permissionDenied && (
            <View style={styles.banner}>
              <Text style={styles.bannerTitle}>Ubicación desactivada</Text>
              <Text style={styles.bannerBody}>
                Activa el permiso de ubicación para obtener clima y el semáforo
                en tu posición.
              </Text>
            </View>
          )}

          {error && (
            <View style={styles.bannerDanger}>
              <Text style={styles.bannerTitle}>{error}</Text>
            </View>
          )}

          {/* NIVEL 1 — Decisión */}
          <View style={[styles.semaphorWrap, { minHeight: decisionMinHeight }]}>
            <Animated.View
              style={[
                styles.semaphorRing,
                {
                  borderColor: ringColor,
                  shadowColor: ringColor,
                  shadowRadius: animatedShadowRadius,
                  shadowOpacity: animatedShadowOpacity,
                  shadowOffset: { width: 0, height: 0 },
                  elevation: 12,
                },
              ]}
              accessibilityRole="summary"
              accessibilityLabel={`Semáforo: ${
                light === 'green'
                  ? 'favorable'
                  : light === 'yellow'
                    ? 'precaución'
                    : 'no volar'
              }. ${summaryLine}`}
            >
              <Text style={styles.semaphorLabel}>Semáforo de vuelo</Text>
              {loading && !weather ? (
                <ActivityIndicator
                  color={palette.textPrimary}
                  size="large"
                  style={styles.semaphorSpinner}
                />
              ) : (
                <>
                  <Text style={[styles.semaphorState, { color: stateTextColor }]}>
                    {light === 'green'
                      ? 'FAVORABLE'
                      : light === 'yellow'
                        ? 'PRECAUCIÓN'
                        : 'NO VOLAR'}
                  </Text>
                  <Text style={styles.semaphorSummary}>{summaryLine}</Text>
                </>
              )}
            </Animated.View>
          </View>

          {light === 'green' && (
            <Pressable
              onPress={() => setChecklistVisible(true)}
              style={({ pressed }) => [
                styles.checklistBtn,
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text style={styles.checklistBtnText}>✓ Checklist preflight</Text>
            </Pressable>
          )}

          {/* NIVEL 2 — Justificación */}
          {weather && (
            <View style={styles.level2Card}>
              <View style={styles.level2KpBlock}>
                <Text style={styles.level2KpLabel}>Índice geomagnético Kp</Text>
                <Text style={styles.level2KpValue}>
                  {kp != null ? kp.kp.toFixed(1) : '—'}
                </Text>
                <Text style={styles.level2KpMeta}>
                  {kp
                    ? `NOAA · ${formatFetchedAt(kp.fetchedAt)}`
                    : 'Sin datos NOAA'}
                </Text>
              </View>
              <View style={styles.level2MetricsRow}>
                <View style={styles.level2Metric}>
                  <Text style={styles.level2MetricLabel}>Viento máx.</Text>
                  <Text style={styles.level2MetricValue}>
                    {windMaxMs(weather).toFixed(1)} m/s
                  </Text>
                </View>
                <View style={styles.level2Divider} />
                <View style={styles.level2Metric}>
                  <Text style={styles.level2MetricLabel}>Lluvia 3h</Text>
                  <Text style={styles.level2MetricValue}>{rainDisplay}</Text>
                </View>
                <View style={styles.level2Divider} />
                <View style={styles.level2Metric}>
                  <Text style={styles.level2MetricLabel}>Humedad</Text>
                  <Text style={styles.level2MetricValue}>
                    {Math.round(weather.humidityPct)}%
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* MAPA DE RESTRICCIONES */}
          <Text style={styles.sectionLabel}>Mapa de restricciones</Text>
          <View style={styles.mapCard}>
            <WebView
              source={{ uri: 'https://drones-app-frontend-production.up.railway.app' }}
              style={styles.mapWebView}
              scrollEnabled={false}
              javaScriptEnabled
              domStorageEnabled
            />
          </View>
          {/* NIVEL 3 — Contexto */}
          {weather && (
            <>
              <Text style={styles.sectionLabel}>Contexto</Text>
              <View style={styles.row3}>
                <BlurView intensity={18} tint="dark" style={[styles.card, styles.flex1]}>
                  <Text style={styles.cardTitle}>Temperatura</Text>
                  <Text style={styles.metricMid}>
                    {Math.round(weather.tempC)}°C
                  </Text>
                  <Text style={styles.cardMuted} numberOfLines={2}>
                    {weather.description}
                  </Text>
                </BlurView>
                <BlurView intensity={18} tint="dark" style={[styles.card, styles.flex1]}>
                  <Text style={styles.cardTitle}>Humedad</Text>
                  <Text style={styles.metricMid}>
                    {Math.round(weather.humidityPct)}%
                  </Text>
                  <Text style={styles.cardMuted}>relativa</Text>
                </BlurView>
                <BlurView intensity={18} tint="dark" style={[styles.card, styles.flex1]}>
                  <Text style={styles.cardTitle}>Lluvia (1h)</Text>
                  <Text style={styles.metricMid}>{rainDisplay}</Text>
                  <Text style={styles.cardMuted}>acumulado</Text>
                </BlurView>
              </View>

              <BlurView intensity={18} tint="dark" style={styles.card}>
                <Text style={styles.cardTitle}>Viento por altitud (demo)</Text>
                {weather.windLayers.map((layer) => (
                  <View key={layer.altitudeM} style={styles.windRow}>
                    <Text style={styles.windAlt}>~{layer.altitudeM} m</Text>
                    <Text style={styles.windVal}>
                      {layer.speedMs.toFixed(1)} m/s · {Math.round(layer.deg)}°
                    </Text>
                  </View>
                ))}
                <Text style={styles.disclaimer}>
                  Las capas &gt;10 m son aproximación de UI; conectad un modelo o
                  API con perfil vertical real cuando esté disponible.
                </Text>
              </BlurView>
            </>
          )}

          {/* Wind Timeline */}
          {coords && (
            <WindTimeline lat={coords.lat} lon={coords.lon} />
          )}

          {/* NIVEL 4 — Referencia (colapsable) */}
          <Pressable
            onPress={() => setReferenceOpen((o) => !o)}
            style={({ pressed }) => [
              styles.referenceHeader,
              pressed && { opacity: 0.85 },
            ]}
            accessibilityRole="button"
            accessibilityState={{ expanded: referenceOpen }}
            accessibilityLabel="Referencia: coordenadas y hora de datos"
          >
            <Text style={styles.referenceHeaderText}>Referencia</Text>
            <Text style={styles.referenceChevron}>
              {referenceOpen ? '▲' : '▼'}
            </Text>
          </Pressable>
          {referenceOpen && (
            <View style={styles.referenceBody}>
              <Text style={styles.referenceLine}>
                <Text style={styles.referenceKey}>GPS · </Text>
                {coords
                  ? `${formatCoord(coords.lat, 5)}°, ${formatCoord(coords.lon, 5)}°`
                  : '—'}
              </Text>
              <Text style={styles.referenceLine}>
                <Text style={styles.referenceKey}>Datos clima · </Text>
                {weather ? formatFetchedAt(weather.fetchedAt) : '—'}
              </Text>
              {mapConstraints?.dataRevision != null && (
                <Text style={styles.referenceLineMuted}>
                  Cartografía · rev. {mapConstraints.dataRevision}
                </Text>
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      <PreflightChecklist
        visible={checklistVisible}
        onClose={() => setChecklistVisible(false)}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  headerTitles: { flex: 1, alignItems: 'center'},
  brand: {
    fontSize: 28,
    fontWeight: '800',
    color: palette.textPrimary,
    letterSpacing: 6,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: palette.textMuted,
  },
  headerGps: {
    marginTop: 6,
    fontSize: 12,
    color: palette.textCardSecondary,
    fontFamily: 'Courier',
    letterSpacing: 0.3,
  },
  refreshBtn: {
    backgroundColor: palette.accentSoft,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.stroke,
  },
  refreshBtnText: {
    color: palette.accent,
    fontWeight: '700',
    fontSize: 14,
  },
  banner: {
    backgroundColor: 'rgba(245, 177, 74, 0.12)',
    borderRadius: radii.md,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(245, 177, 74, 0.35)',
  },
  bannerDanger: {
    backgroundColor: 'rgba(255, 92, 108, 0.12)',
    borderRadius: radii.md,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 92, 108, 0.35)',
  },
  bannerTitle: {
    color: palette.textPrimary,
    fontWeight: '700',
    marginBottom: 4,
  },
  bannerBody: {
    color: palette.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  semaphorWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  semaphorRing: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 200, 150, 0.12)',
    paddingHorizontal: 14,
  },
  semaphorSpinner: {
    marginTop: 12,
  },
  semaphorLabel: {
    color: palette.textMuted,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
  },
  semaphorState: {
    fontSize: 24,
    fontWeight: '800',
    marginTop: 8,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  semaphorSummary: {
    marginTop: 10,
    fontSize: 11,
    lineHeight: 15,
    color: palette.textCardSecondary,
    textAlign: 'center',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.textCardLabel,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 4,
    marginBottom: -4,
  },
  level2Card: {
    backgroundColor: palette.card,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: 'rgba(61, 139, 253, 0.45)',
    padding: 18,
    gap: 16,
  },
  level2KpBlock: {
    alignItems: 'center',
    paddingBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.stroke,
  },
  level2KpLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.accent,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  level2KpValue: {
    fontSize: 48,
    fontWeight: '800',
    color: palette.textPrimary,
    fontVariant: ['tabular-nums'],
    fontFamily: 'SpaceMono_400Regular',
  },
  level2KpMeta: {
    marginTop: 6,
    fontSize: 12,
    color: palette.textCardSecondary,
  },
  level2MetricsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  level2Metric: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  level2MetricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: palette.textCardLabel,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  level2MetricValue: {
    fontSize: 22,
    fontWeight: '800',
    color: palette.textPrimary,
    fontVariant: ['tabular-nums'],
    fontFamily: 'SpaceMono_400Regular',
  },
  level2Divider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: palette.stroke,
    marginVertical: 4,
  },
  referenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginTop: 4,
  },
  referenceHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.textCardLabel,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  referenceChevron: {
    fontSize: 12,
    color: palette.textCardSecondary,
  },
  referenceBody: {
    backgroundColor: palette.card,
    borderRadius: radii.md,
    padding: 14,
    borderWidth: 1,
    borderColor: palette.stroke,
    gap: 8,
    marginBottom: 8,
  },
  referenceLine: {
    fontSize: 13,
    color: palette.textPrimary,
    fontFamily: 'Courier',
  },
  referenceKey: {
    fontWeight: '600',
    color: palette.textCardLabel,
  },
  referenceLineMuted: {
    fontSize: 12,
    color: palette.textCardSecondary,
  },
  card: {
    borderRadius: radii.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    overflow: 'hidden',
  },
  cardTitle: {
    color: palette.textCardLabel,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  cardMuted: {
    color: palette.textCardSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  row3: {
    flexDirection: 'row',
    gap: 8,
  },
  flex1: { flex: 1 },
  metricMid: {
    fontSize: 20,
    fontWeight: '800',
    color: palette.textPrimary,
    fontVariant: ['tabular-nums'],
    fontFamily: 'SpaceMono_400Regular',
  },
  windRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.stroke,
  },
  windAlt: { color: palette.textCardSecondary, fontSize: 15 },
  windVal: { color: palette.textPrimary, fontWeight: '600', fontSize: 15 },
  disclaimer: {
    marginTop: 10,
    fontSize: 11,
    color: palette.textCardSecondary,
    lineHeight: 15,
  },
  checklistBtn: {
    alignSelf: 'center',
    backgroundColor: 'rgba(62,224,179,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(62,224,179,0.30)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radii.md,
    marginTop: -4,
  },
  checklistBtnText: {
    color: palette.mint,
    fontWeight: '700',
    fontSize: 14,
  },
  mapCard: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    height: 320,
  },
  mapWebView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});