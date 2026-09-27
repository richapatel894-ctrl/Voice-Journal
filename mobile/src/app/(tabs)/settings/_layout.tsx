import { Stack } from 'expo-router';

export default function SettingsStackLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false, title: 'Settings' }} />
      <Stack.Screen name="media" options={{ title: 'Media' }} />
    </Stack>
  );
}
