/**
 * Stack interno de la tab Mascotas: listado, alta, perfil, edición y carnet.
 * Al estar dentro de la tab, la barra inferior sigue visible al navegar.
 */
import { Stack } from 'expo-router';

import { colors } from '@/theme';

/** Stack de las pantallas de mascotas. */
export default function MascotasLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.surface },
        // La lista que queda debajo del perfil no se vuelve a dibujar mientras no se ve.
        freezeOnBlur: true,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="nueva" />
      <Stack.Screen name="[id]/index" />
      <Stack.Screen name="[id]/editar" />
      <Stack.Screen name="[id]/carnet" />
    </Stack>
  );
}
