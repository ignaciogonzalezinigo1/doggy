/**
 * Pull-to-refresh: el `RefreshControl` que usan las pantallas con datos
 * compartidos (Mis Mascotas, Perdidos, perfil de la mascota, carnet, Agenda y
 * Perfil). Deslizar hacia abajo llama a `refrescar` del contexto, que vuelve a
 * pedir todo con los mismos services que la carga inicial; si falla, avisa y
 * deja los datos que había. Usa los colores del tema en iOS y en Android.
 */
import { RefreshControl } from 'react-native';

import { useApp } from '@/context/AppContext';
import { colors } from '@/theme';

/**
 * Control de refresco para pasarle a un `ScrollView` o `FlatList` (`refreshControl`).
 * @returns el `RefreshControl` conectado al contexto
 */
export function useRefresco() {
  const { refrescando, refrescar } = useApp();
  return (
    <RefreshControl
      refreshing={refrescando}
      onRefresh={refrescar}
      tintColor={colors.primary}
      colors={[colors.primary]}
      progressBackgroundColor={colors.surfaceContainerLowest}
    />
  );
}
