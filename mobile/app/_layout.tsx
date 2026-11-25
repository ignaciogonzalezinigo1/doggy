/**
 * Layout raíz de la app.
 *
 * Carga las fuentes de la marca (Quicksand y Plus Jakarta Sans) y mantiene
 * la splash visible hasta que terminan de cargar, para que ninguna pantalla
 * se dibuje con la tipografía del sistema, y hasta que se sabe si hay una
 * sesión guardada, para no mostrar el login un instante a quien ya entró. Define el Stack raíz con los
 * grupos de autenticación y tabs, los dos modales de reporte (mascota
 * encontrada y mascota propia perdida) y el de asignación de mascota, todo
 * dentro del provider del estado global.
 */
import { Quicksand_600SemiBold } from '@expo-google-fonts/quicksand/600SemiBold';
import { Quicksand_700Bold } from '@expo-google-fonts/quicksand/700Bold';
import { PlusJakartaSans_400Regular } from '@expo-google-fonts/plus-jakarta-sans/400Regular';
import { PlusJakartaSans_600SemiBold } from '@expo-google-fonts/plus-jakarta-sans/600SemiBold';
import { PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans/700Bold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AppProvider, useApp } from '@/context/AppContext';
import { colors } from '@/theme';

// La splash queda visible hasta que se llame a hideAsync.
SplashScreen.preventAutoHideAsync();

/**
 * Componente raíz: espera las fuentes y monta el Stack principal.
 * @returns el Stack raíz, o null mientras las fuentes cargan
 */
export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Quicksand_600SemiBold,
    Quicksand_700Bold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  // Si falla la carga de fuentes la app sigue: usa la fuente del sistema.
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    // Raíz de react-native-gesture-handler: sin ella, ningún gesto de la app responde.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProvider>
        <Navegacion />
      </AppProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Stack principal. Oculta la splash cuando ya se sabe si hay sesión: mientras
 * tanto la ruta de entrada no dibuja nada (ver `app/index.tsx`).
 * @returns el Stack raíz
 */
function Navegacion() {
  const { sesion } = useApp();

  useEffect(() => {
    if (sesion !== 'restaurando') SplashScreen.hideAsync();
  }, [sesion]);

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.surface },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        {/* Entrada del link de la chapita: no dibuja nada, lleva a reportar o al login. */}
        <Stack.Screen name="encontre/[codigo]" options={{ animation: 'none' }} />
        {/* Los reportes se abren desde abajo, por encima de las tabs. */}
        <Stack.Screen name="reportar" options={{ presentation: 'modal' }} />
        <Stack.Screen name="mi-mascota-perdida" options={{ presentation: 'modal' }} />
        {/* Se abre al cargar un código de asignación de mascota desde Perfil. */}
        <Stack.Screen name="asignar" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}
