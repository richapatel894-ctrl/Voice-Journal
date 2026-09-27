import { Stack } from 'expo-router';

/** A nested Stack so tapping an entry pushes the detail screen above the tab bar, with a native back gesture. */
export default function EntriesStackLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false, title: 'Entries' }} />
      <Stack.Screen name="[id]" options={{ title: 'Entry' }} />
    </Stack>
  );
}
