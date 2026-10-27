/**
 * Bottom Tab Navigator principal: Mascotas, Perdidos, Agenda y Perfil.
 * Usa una barra personalizada (TabBar) con la píldora de tab activa.
 */
import { MaterialIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { TabBar } from '@/components/navigation/TabBar';
import { colors } from '@/theme';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

/**
 * Genera la función tabBarIcon para un ícono de MaterialIcons.
 * @param name nombre del ícono
 * @returns función que recibe color y tamaño y dibuja el ícono
 */
function tabIcon(name: IconName) {
  // Función con nombre: React la muestra así en las herramientas de desarrollo.
  return function IconoTab({ color, size }: { color: ColorValue; size: number }) {
    // En RN 0.88 ColorValue también admite null y números, que el ícono no acepta.
    // Los colores del theme son strings, así que se pasa solo ese caso.
    return (
      <MaterialIcons name={name} color={typeof color === 'string' ? color : undefined} size={size} />
    );
  };
}

/** Layout de tabs de la app. */
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.onSecondaryContainer,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
        sceneStyle: { backgroundColor: colors.surface },
        // Una tab que no está a la vista no se vuelve a dibujar con cada cambio
        // del contexto (por ejemplo, el mapa mientras se refresca Mis Mascotas):
        // react-native-screens la congela y se pone al día al volver a ella.
        freezeOnBlur: true,
      }}
    >
      <Tabs.Screen name="mascotas" options={{ title: 'Mascotas', tabBarIcon: tabIcon('pets') }} />
      <Tabs.Screen name="perdidos" options={{ title: 'Perdidos', tabBarIcon: tabIcon('map') }} />
      <Tabs.Screen name="agenda" options={{ title: 'Agenda', tabBarIcon: tabIcon('calendar-today') }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil', tabBarIcon: tabIcon('person') }} />
    </Tabs>
  );
}
