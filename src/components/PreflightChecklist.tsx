import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { palette, radii } from '../constants/theme';

const STORAGE_KEY = 'preflight_completed_date';

const ITEMS = [
  { id: '1', label: 'Batería principal cargada >80%', icon: '🔋' },
  { id: '2', label: 'Hélices revisadas y fijadas', icon: '🔩' },
  { id: '3', label: 'NOTAM consultado para la zona', icon: '📋' },
  { id: '4', label: 'Espacio aéreo verificado en la app', icon: '🗺️' },
  { id: '5', label: 'Modo de vuelo configurado', icon: '⚙️' },
  { id: '6', label: 'Zona de despegue despejada', icon: '✅' },
];

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function PreflightChecklist({ visible, onClose }: Props) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const fadeAnims = useRef(ITEMS.map(() => new Animated.Value(1))).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const allChecked = ITEMS.every((item) => checked[item.id]);
  const checkedCount = Object.values(checked).filter(Boolean).length;

  // Animación de entrada del modal
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.95);
      opacityAnim.setValue(0);
      setChecked({});
    }
  }, [visible]);

  function toggleItem(id: string) {
    const newVal = !checked[id];

    // Animación del item al marcarse
    const index = ITEMS.findIndex((i) => i.id === id);
    Animated.sequence([
      Animated.timing(fadeAnims[index], {
        toValue: 0.6,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnims[index], {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();

    void Haptics.selectionAsync();
    setChecked((prev) => ({ ...prev, [id]: newVal }));
  }

  async function handleReady() {
    if (!allChecked) return;
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const today = new Date().toISOString().split('T')[0];
    await AsyncStorage.setItem(STORAGE_KEY, today);
    onClose();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Checklist Preflight</Text>
              <Text style={styles.headerSub}>
                {checkedCount}/{ITEMS.length} completados
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeBtn,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          {/* Barra de progreso */}
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                { width: `${(checkedCount / ITEMS.length) * 100}%` },
              ]}
            />
          </View>

          {/* Items */}
          <ScrollView
            style={styles.list}
            showsVerticalScrollIndicator={false}
          >
            {ITEMS.map((item, index) => {
              const isChecked = !!checked[item.id];
              return (
                <Animated.View
                  key={item.id}
                  style={{ opacity: fadeAnims[index] }}
                >
                  <Pressable
                    onPress={() => toggleItem(item.id)}
                    style={({ pressed }) => [
                      styles.item,
                      isChecked && styles.itemChecked,
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <Text style={styles.itemIcon}>{item.icon}</Text>
                    <Text
                      style={[
                        styles.itemLabel,
                        isChecked && styles.itemLabelChecked,
                      ]}
                    >
                      {item.label}
                    </Text>
                    <View
                      style={[
                        styles.checkbox,
                        isChecked && styles.checkboxChecked,
                      ]}
                    >
                      {isChecked && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </View>
                  </Pressable>
                </Animated.View>
              );
            })}
          </ScrollView>

          {/* Botón final */}
          <Pressable
            onPress={() => void handleReady()}
            disabled={!allChecked}
            style={({ pressed }) => [
              styles.readyBtn,
              allChecked && styles.readyBtnActive,
              pressed && allChecked && { opacity: 0.85 },
            ]}
          >
            <Text
              style={[
                styles.readyBtnText,
                allChecked && styles.readyBtnTextActive,
              ]}
            >
              {allChecked ? '🚁 Listo para volar' : `Faltan ${ITEMS.length - checkedCount} items`}
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0f1829',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: palette.textPrimary,
    letterSpacing: 0.3,
  },
  headerSub: {
    fontSize: 13,
    color: palette.textMuted,
    marginTop: 4,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: palette.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    marginBottom: 20,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: palette.mint,
    borderRadius: 2,
  },
  list: {
    marginBottom: 20,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: radii.md,
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    gap: 12,
  },
  itemChecked: {
    backgroundColor: 'rgba(62,224,179,0.08)',
    borderColor: 'rgba(62,224,179,0.25)',
  },
  itemIcon: {
    fontSize: 18,
  },
  itemLabel: {
    flex: 1,
    fontSize: 15,
    color: palette.textPrimary,
    fontWeight: '500',
  },
  itemLabelChecked: {
    color: palette.textMuted,
    textDecorationLine: 'line-through',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: palette.mint,
    borderColor: palette.mint,
  },
  checkmark: {
    color: '#000',
    fontSize: 13,
    fontWeight: '800',
  },
  readyBtn: {
    paddingVertical: 16,
    borderRadius: radii.md,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  readyBtnActive: {
    backgroundColor: palette.mint,
    borderColor: palette.mint,
  },
  readyBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.textMuted,
  },
  readyBtnTextActive: {
    color: '#000',
  },
});