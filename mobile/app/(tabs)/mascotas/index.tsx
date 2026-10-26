/**
 * Pantalla Mis Mascotas (primera tab).
 *
 * Lista las mascotas del usuario que vienen del contexto global. Tocar una
 * card abre su perfil, mantenerla presionada abre un menú de acciones
 * rápidas (ver `PetCard`) y el FAB mostaza lleva al alta de una mascota nueva.
 * Arriba de la lista, un aviso "¡Encontraron a …!" por cada mascota que
 * alguien reportó como encontrada, con "Ya la recuperé".
 */
import { router } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Cargando, EstadoVacio } from '@/components/EstadoVista';
import { Fab } from '@/components/Fab';
import { AvisoEncontrada } from '@/components/mascotas/AvisoEncontrada';
import { PetCard } from '@/components/PetCard';
import { useApp } from '@/context/AppContext';
import { useRecuperarMascota } from '@/hooks/useRecuperarMascota';
import { colors, sizes, spacing, typography } from '@/theme';
import type { Mascota, ReportePerdida } from '@/types/models';
import { reporteEncontrado } from '@/utils/selectores';

/**
 * Listado de mascotas.
 * @returns la pantalla con el header, la lista y el FAB
 */
export default function MisMascotasScreen() {
  const { mascotas, reportes, cargando, error, recargar } = useApp();
  const { recuperando, pedirRecuperacion } = useRecuperarMascota();

  // --- Datos derivados ---
  /** Reportes "encontrado" activos de las mascotas del usuario. */
  const encontradas = useMemo(
    () =>
      mascotas
        .map((m) => reporteEncontrado(reportes, m.id))
        .filter((r): r is ReportePerdida => r !== undefined),
    [mascotas, reportes],
  );

  // --- Handlers ---
  /** Abre el perfil de la mascota tocada. */
  const abrirMascota = useCallback((mascota: Mascota) => {
    router.push({ pathname: '/mascotas/[id]', params: { id: String(mascota.id) } });
  }, []);

  /** Va al formulario de alta. */
  const agregarMascota = () => router.push('/mascotas/nueva');

  // --- Render ---
  /** Contenido cuando la lista está vacía: carga, error o sin mascotas. */
  const renderVacio = () => {
    if (cargando) return <Cargando mensaje="Cargando tus mascotas…" />;
    if (error) {
      return (
        <EstadoVacio
          icon="cloud-off"
          titulo="No pudimos cargar tus mascotas"
          mensaje={error}
          accion={{ titulo: 'Reintentar', onPress: recargar }}
        />
      );
    }
    return (
      <EstadoVacio
        titulo="Todavía no cargaste mascotas"
        mensaje="Agregá a tu primera mascota para generar su QR de identificación."
        accion={{ titulo: 'Agregar mascota', onPress: agregarMascota }}
      />
    );
  };

  return (
    <View style={styles.screen}>
      <AppHeader />
      <FlatList
        data={mascotas}
        keyExtractor={(mascota) => String(mascota.id)}
        renderItem={({ item }) => <PetCard mascota={item} onPress={abrirMascota} />}
        ListHeaderComponent={
          <View style={styles.encabezado}>
            {encontradas.map((reporte) => (
              <AvisoEncontrada
                key={reporte.id}
                reporte={reporte}
                onRecuperada={pedirRecuperacion}
                recuperando={recuperando}
              />
            ))}
            <Text style={styles.titulo}>Mis Mascotas</Text>
          </View>
        }
        ListEmptyComponent={renderVacio}
        ItemSeparatorComponent={Separador}
        contentContainerStyle={styles.lista}
        showsVerticalScrollIndicator={false}
      />
      <Fab icon="add" onPress={agregarMascota} accessibilityLabel="Agregar mascota" />
    </View>
  );
}

/** Espacio vertical entre cards. */
function Separador() {
  return <View style={styles.separador} />;
}

// --- Estilos ---
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  lista: {
    flexGrow: 1,
    paddingHorizontal: spacing.containerMargin,
    paddingTop: spacing.stackMd,
    // Deja lugar para que el FAB no tape la última card.
    paddingBottom: sizes.fab + spacing.stackLg,
  },
  encabezado: {
    gap: spacing.stackMd,
    marginBottom: spacing.stackMd,
  },
  titulo: {
    ...typography.headlineMd,
    color: colors.onSurface,
  },
  separador: {
    height: spacing.stackMd,
  },
});
