import { Redirect, Tabs } from 'expo-router';
import { ChefHat, House, ListChecks, Settings, ShoppingBasket } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

import { useAppStore } from '../../src/stores/app-store';
import { themeTokens } from '../../src/theme/tokens';

export default function TabsLayout() {
  const session = useAppStore((state) => state.session);
  const { colorScheme } = useColorScheme();
  const palette = themeTokens.colors[colorScheme === 'dark' ? 'dark' : 'light'];
  if (!session) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.textMuted,
        tabBarStyle: { minHeight: 64, paddingBottom: 8, paddingTop: 6, borderTopColor: palette.border, backgroundColor: palette.surface },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="home" options={{ title: '홈', tabBarIcon: ({ color }) => <House color={color} size={20} strokeWidth={1.5} /> }} />
      <Tabs.Screen name="inventory" options={{ title: '재고', tabBarIcon: ({ color }) => <ListChecks color={color} size={20} strokeWidth={1.5} /> }} />
      <Tabs.Screen name="recipes" options={{ title: '추천', tabBarIcon: ({ color }) => <ChefHat color={color} size={20} strokeWidth={1.5} /> }} />
      <Tabs.Screen name="shopping" options={{ title: '장보기', tabBarIcon: ({ color }) => <ShoppingBasket color={color} size={20} strokeWidth={1.5} /> }} />
      <Tabs.Screen name="settings" options={{ title: '설정', tabBarIcon: ({ color }) => <Settings color={color} size={20} strokeWidth={1.5} /> }} />
    </Tabs>
  );
}
