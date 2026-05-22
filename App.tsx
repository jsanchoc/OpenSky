import { useFonts, SpaceMono_400Regular } from '@expo-google-fonts/space-mono';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import DashboardScreen from './src/screens/DashboardScreen';

export default function App() {
  const [fontsLoaded] = useFonts({ SpaceMono_400Regular });
  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <DashboardScreen />
    </SafeAreaProvider>
  );
}
