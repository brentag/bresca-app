import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function tabIcon(name: IoniconsName, focusedName: IoniconsName) {
  return ({ color, focused }: { color: string; focused: boolean }) => (
    <Ionicons name={focused ? focusedName : name} size={24} color={color} />
  );
}

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#00C87A',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: { borderTopColor: '#F1F5F9', backgroundColor: '#fff' },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Inicio', tabBarIcon: tabIcon('home-outline', 'home') }} />
      <Tabs.Screen name="vault" options={{ title: 'Vault', tabBarIcon: tabIcon('folder-outline', 'folder') }} />
      <Tabs.Screen name="copilot" options={{ title: 'Copilot', tabBarIcon: tabIcon('chatbubble-outline', 'chatbubble') }} />
      <Tabs.Screen name="family" options={{ title: 'Familia', tabBarIcon: tabIcon('people-outline', 'people') }} />
    </Tabs>
  );
}
