/**
 * Carnet Sanitario de una mascota.
 *
 * Muestra el resumen de la mascota, pestañas para filtrar por tipo de
 * registro (vacunas, desparasitación u otros), el próximo refuerzo destacado
 * (sale de la `proximaDosis` de las aplicaciones) y el historial, donde todos
 * los registros son aplicaciones hechas. El FAB abre un formulario para
 * sumar un registro, y el lápiz de cada card abre el mismo formulario con
 * los datos cargados para corregirlo (o eliminarlo). Deslizar una card a
 * la izquierda también deja eliminarla.
 */
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
// La FlatList de gesture-handler: el scroll participa de los gestos, así el swipe de las cards y el scroll se coordinan.
import { FlatList } from 'react-native-gesture-handler';

import { Avatar } from '@/components/Avatar';
import { ProximoRefuerzoCard } from '@/components/carnet/ProximoRefuerzoCard';
import { RegistroCard } from '@/components/carnet/RegistroCard';
import { RegistroForm } from '@/components/carnet/RegistroForm';
import { Cargando, EstadoVacio } from '@/components/EstadoVista';
import { Fab } from '@/components/Fab';
import { FormModal } from '@/components/FormModal';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SegmentedControl } from '@/components/SegmentedControl';
import { useApp } from '@/context/AppContext';
import { useRefresco } from '@/hooks/useRefresco';
import { colors, radius, shadows, sizes, spacing, typography } from '@/theme';
import type { RegistroSanitario, TipoRegistro } from '@/types/models';
import { textoEdad, TIPOS_REGISTRO } from '@/utils/etiquetas';
import { volver } from '@/utils/navegacion';
import { buscarMascota, proximoRefuerzo, registrosPorTipo } from '@/utils/selectores';

/** Opciones del selector de pestañas. */
const PESTANAS = TIPOS_REGISTRO.map((t) => ({ valor: t.valor, label: t.pestana }));

/**
 * Pantalla del carnet sanitario.
 * @returns el carnet, o un estado de carga / no encontrada
 */
export default function CarnetSanitarioScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { mascotas, registros, cargando, error, recargar } = useApp();
  const refresco = useRefresco();

  // --- Estado ---
  const [tipo, setTipo] = useState<TipoRegistro>('vacuna');
  const [formVisible, setFormVisible] = useState(false);
  /** Registro que se está corrigiendo; null si el formulario es de alta. */
  const [editando, setEditando] = useState<RegistroSanitario | null>(null);

  // --- Datos derivados ---
  const mascota = useMemo(() => buscarMascota(mascotas, id), [mascotas, id]);
  const delTipo = useMemo(
    () => (mascota ? registrosPorTipo(registros, mascota.id, tipo) : []),
    [registros, mascota, tipo],
  );
  const proximo = useMemo(() => proximoRefuerzo(delTipo), [delTipo]);
  // El refuerzo destacado no se repite en el historial.
  const historial = useMemo(
    () => delTipo.filter((r) => r.id !== proximo?.id),
    [delTipo, proximo],
  );
  const textos = TIPOS_REGISTRO.find((t) => t.valor === tipo) ?? TIPOS_REGISTRO[0];

  // --- Handlers ---
  /** Cierra el formulario y muestra la pestaña del registro guardado (pudo cambiar de tipo). */
  const handleGuardado = useCallback((registro: RegistroSanitario) => {
    setFormVisible(false);
    setEditando(null);
    setTipo(registro.tipo);
  }, []);

  /** Abre el formulario de nuevo registro. */
  const abrirFormulario = () => {
    setEditando(null);
    setFormVisible(true);
  };

  /** Abre el formulario con los datos del registro para corregirlo. */
  const abrirEdicion = useCallback((registro: RegistroSanitario) => {
    setEditando(registro);
    setFormVisible(true);
  }, []);

  /** Cierra el formulario sin guardar. */
  const cerrarFormulario = () => {
    setFormVisible(false);
    setEditando(null);
  };

  // --- Render ---
  if (!mascota) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Carnet Sanitario" variant="bar" />
        {cargando ? (
          <Cargando />
        ) : error ? (
          <EstadoVacio
            icon="cloud-off"
            titulo="No pudimos cargar tus mascotas"
            mensaje={error}
            accion={{ titulo: 'Reintentar', onPress: recargar }}
          />
        ) : (
          <EstadoVacio
            icon="search-off"
            titulo="No encontramos esta mascota"
            accion={{ titulo: 'Volver a mis mascotas', onPress: () => volver('/mascotas') }}
          />
        )}
      </View>
    );
  }

  const encabezado = (
    <View style={styles.encabezado}>
      <View style={styles.resumen}>
        <Avatar foto={mascota.foto} nombre={mascota.nombre} size={sizes.avatarMd} />
        <View style={styles.resumenTexto}>
          <Text style={styles.nombre}>{mascota.nombre}</Text>
          <Text style={styles.detalle}>
            {mascota.raza} • {textoEdad(mascota.fechaNacimiento)}
          </Text>
        </View>
      </View>

      <SegmentedControl opciones={PESTANAS} valor={tipo} onChange={setTipo} />

      {proximo && (
        <ProximoRefuerzoCard registro={proximo} titulo={textos.proximo} onEditar={abrirEdicion} />
      )}

      {historial.length > 0 && <Text style={styles.seccion}>{textos.historial}</Text>}
    </View>
  );

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Carnet Sanitario"
        variant="bar"
        fallback={{ pathname: '/mascotas/[id]', params: { id: String(mascota.id) } }}
      />
      <FlatList
        data={historial}
        keyExtractor={(registro) => String(registro.id)}
        renderItem={({ item }) => <RegistroCard registro={item} onEditar={abrirEdicion} />}
        refreshControl={refresco}
        ListHeaderComponent={encabezado}
        ListEmptyComponent={
          proximo ? undefined : (
            <EstadoVacio
              icon="vaccines"
              titulo={textos.vacio}
              mensaje="Cuando cargues uno, va a aparecer acá con su fecha y profesional."
              accion={{ titulo: 'Agregar registro', onPress: abrirFormulario }}
            />
          )
        }
        ItemSeparatorComponent={Separador}
        contentContainerStyle={styles.lista}
        showsVerticalScrollIndicator={false}
      />
      <Fab
        icon="add"
        label="Agregar Registro"
        onPress={abrirFormulario}
        accessibilityLabel="Agregar registro al carnet"
      />

      <FormModal
        visible={formVisible}
        titulo={editando ? 'Editar registro' : 'Nuevo registro'}
        onClose={cerrarFormulario}
      >
        {/* key: al pasar de un registro a otro (o al alta) el formulario arranca de cero. */}
        <RegistroForm
          key={editando?.id ?? 'nuevo'}
          mascotaId={mascota.id}
          tipoInicial={tipo}
          registro={editando ?? undefined}
          onGuardado={handleGuardado}
          onBorrado={cerrarFormulario}
        />
      </FormModal>
    </View>
  );
}

/** Espacio entre cards del historial. */
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
    paddingTop: spacing.md,
    // Espacio para que el FAB no tape el último registro.
    paddingBottom: sizes.fab + spacing.stackLg,
  },
  encabezado: {
    gap: spacing.stackMd,
    marginBottom: spacing.stackSm,
  },
  resumen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackSm,
    padding: spacing.stackSm,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLowest,
    ...shadows.level1,
  },
  resumenTexto: {
    flex: 1,
    gap: spacing.xs,
  },
  nombre: {
    ...typography.headlineMd,
    color: colors.onSurface,
  },
  detalle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  seccion: {
    ...typography.headlineMd,
    color: colors.onBackground,
  },
  separador: {
    height: spacing.stackSm,
  },
});
