/**
 * Pantalla Perdidos: mapa comunitario de mascotas perdidas y encontradas.
 *
 * Modo Mapa: un marker por reporte (mostaza perdido, teal encontrado) y uno
 * solo por mascota: el "encontrado" de una mascota con un perdido activo no se
 * dibuja aparte (tampoco con el filtro "Encontrados"); el perdido lleva el
 * tilde y "¡La encontraron!" y el hallazgo se ve en su detalle. Botón
 * "mi ubicación" que centra el mapa con el GPS y un carrusel de cards; tocar
 * un marker o una card centra el mapa en ese reporte y abre la hoja de
 * detalle con todo lo que se cargó al reportarlo. Modo Lista: las mismas
 * cards en vertical, que también abren el detalle. El buscador filtra en local por nombre o zona y el filtro por
 * estado. Si se deniega la ubicación, el mapa queda en CABA con un aviso.
 * El FAB pregunta qué se reporta: "Se perdió mi mascota" o "Encontré una mascota".
 * Si llega `reporteId` por params (después de reportar), se centra en ese reporte.
 * Si el reporte es de una mascota del usuario, desde el detalle se lo puede
 * editar (abre "Se perdió mi mascota" en modo edición) o cerrar con "Ya apareció"
 * ("Ya volvió a casa" si alguien la encontró).
 * Si es un perdido de otra familia, la card y el detalle ofrecen "Escribirle
 * por WhatsApp" con un mensaje que dice que la vio cerca de donde está el
 * usuario (`mensajeLaVi`), y "o llamar".
 */
import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Chip } from '@/components/Chip';
import { EstadoVacio } from '@/components/EstadoVista';
import { Fab } from '@/components/Fab';
import { FormModal } from '@/components/FormModal';
import { IconButton } from '@/components/IconButton';
import { Input } from '@/components/Input';
import { MenuRow } from '@/components/MenuRow';
import { PermissionNotice } from '@/components/PermissionNotice';
import { DetalleReporte } from '@/components/perdidos/DetalleReporte';
import { MapaReportes, MapaReportesHandle } from '@/components/perdidos/MapaReportes';
import { ReporteCard } from '@/components/perdidos/ReporteCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SegmentedControl } from '@/components/SegmentedControl';
import { useApp, useRefrescando } from '@/context/AppContext';
import { useCerrarReporte } from '@/hooks/useCerrarReporte';
import { useRefresco } from '@/hooks/useRefresco';
import { Coordenadas, useUbicacion } from '@/hooks/useUbicacion';
import { colors, radius, shadows, sizes, spacing, typography } from '@/theme';
import type { ReportePerdida } from '@/types/models';
import { mensajeLaVi } from '@/utils/mensajes';
import {
  contactoDeLaFamilia,
  FiltroEstado,
  hallazgosPorPerdido,
  puedeGestionarReporte,
  reporteActivo,
  reportesDePerdidos,
} from '@/utils/selectores';
import { LIMITES } from '@/utils/validaciones';

type Modo = 'mapa' | 'lista';

const MODOS: { valor: Modo; label: string }[] = [
  { valor: 'mapa', label: 'Mapa' },
  { valor: 'lista', label: 'Lista' },
];

const FILTROS: { valor: FiltroEstado; label: string }[] = [
  { valor: 'todos', label: 'Todos' },
  { valor: 'perdido', label: 'Perdidos' },
  { valor: 'encontrado', label: 'Encontrados' },
];

/** Cuánto se asoma la card siguiente del carrusel. */
const ASOMA = 32;
/** Espera para que el mapa termine de montarse antes de mover la cámara. */
const ESPERA_MAPA_MS = 400;
/** Espera a que termine de cerrarse la hoja de elección antes de abrir el reporte. */
const ESPERA_CIERRE_HOJA_MS = 300;

/**
 * Pantalla de mascotas perdidas.
 * @returns el mapa o la lista de reportes
 */
export default function PerdidosScreen() {
  const { reportes, usuario, mascotas, error, recargar, refrescar } = useApp();
  const refrescando = useRefrescando();
  const refresco = useRefresco();
  const { reporteId } = useLocalSearchParams<{ reporteId?: string }>();
  const gps = useUbicacion({ automatico: true });
  const { obtenerUbicacion } = gps;
  const { width } = useWindowDimensions();

  // --- Estado ---
  const [modo, setModo] = useState<Modo>('mapa');
  const [buscando, setBuscando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<FiltroEstado>('todos');
  const [filtroVisible, setFiltroVisible] = useState(false);
  const [eleccionVisible, setEleccionVisible] = useState(false);
  const [seleccionadoId, setSeleccionadoId] = useState<number | null>(null);
  // El reporte del detalle se guarda aparte de la visibilidad para que la hoja
  // no quede vacía durante la animación de cierre.
  const [detalle, setDetalle] = useState<ReportePerdida | null>(null);
  const [detalleVisible, setDetalleVisible] = useState(false);
  const mapaRef = useRef<MapaReportesHandle>(null);
  const carruselRef = useRef<FlatList<ReportePerdida>>(null);

  /** Cierra la hoja de detalle (por ejemplo, cuando el reporte ya se cerró). */
  const cerrarDetalle = useCallback(() => setDetalleVisible(false), []);
  const { cerrando, pedirCierre } = useCerrarReporte(cerrarDetalle);

  // --- Datos derivados ---
  // Un solo pin y una sola card por mascota, también con el filtro "Encontrados".
  const visibles = useMemo(
    () => reportesDePerdidos(reportes, busqueda, filtro),
    [reportes, busqueda, filtro],
  );
  /** Encontrado activo de cada perdido, por id del perdido (con todos los reportes, no solo los filtrados). */
  const hallazgos = useMemo(() => hallazgosPorPerdido(reportes), [reportes]);
  const anchoCard = width - spacing.containerMargin * 2 - ASOMA;
  /** Mismo objeto mientras no cambie el ancho, así `ReporteCard` (memoizada) no se redibuja. */
  const estiloCard = useMemo(() => ({ width: anchoCard }), [anchoCard]);
  /** Lista visible para los handlers, sin que cambien cada vez que cambia la lista (los markers no se redibujan). */
  const visiblesRef = useRef(visibles);
  useEffect(() => {
    visiblesRef.current = visibles;
  }, [visibles]);

  /**
   * Mensaje de WhatsApp para la familia de un perdido: quien mira cree que la
   * vio, cerca de donde está ahora (si no se sabe, va sin ubicación).
   * @param reporte perdido de otra familia
   * @returns el texto del mensaje
   */
  const armarMensaje = useCallback(
    async (reporte: ReportePerdida) => {
      const punto = gps.ubicacion ?? (await obtenerUbicacion());
      return mensajeLaVi({
        dueno: reporte.contacto?.nombre ?? 'familia',
        yo: usuario?.nombre ?? 'un vecino',
        mascota: reporte.nombre,
        punto,
      });
    },
    [gps.ubicacion, obtenerUbicacion, usuario?.nombre],
  );

  // Recién llegado de reportar: se muestra el nuevo marker seleccionado y centrado.
  // El estado se ajusta durante el render (patrón de React para "cambió un
  // param"), una sola vez por reporte: `reporteRecibido` evita repetirlo cada
  // vez que se vuelve a la tab con el mismo param. Si el reporte todavía no
  // está cargado, se reintenta en el render siguiente.
  const [reporteRecibido, setReporteRecibido] = useState<string | undefined>(undefined);
  const [destino, setDestino] = useState<Coordenadas | null>(null);
  if (reporteId && reporteId !== reporteRecibido) {
    const recibido = reportes.find((r) => String(r.id) === reporteId);
    // Un encontrado de una mascota perdida no tiene pin propio: se marca su perdido.
    const perdido =
      recibido?.estado === 'encontrado' && recibido.mascotaId !== null
        ? reporteActivo(reportes, recibido.mascotaId)
        : undefined;
    const reporte = perdido ?? recibido;
    if (reporte) {
      setReporteRecibido(reporteId);
      setModo('mapa');
      setFiltro('todos');
      setBusqueda('');
      setSeleccionadoId(reporte.id);
      setDestino({ lat: reporte.lat, lng: reporte.lng });
    }
  }

  // Lo imperativo (mover la cámara y el carrusel) queda en un efecto, esperando
  // a que el mapa termine de montarse.
  useEffect(() => {
    if (!destino) return;
    const timer = setTimeout(() => {
      mapaRef.current?.centrar(destino);
      // El más nuevo queda primero en el carrusel (orden por fecha).
      carruselRef.current?.scrollToOffset({ offset: 0, animated: true });
    }, ESPERA_MAPA_MS);
    return () => clearTimeout(timer);
  }, [destino]);

  // --- Handlers ---
  /**
   * Abre la hoja con toda la información del reporte.
   * @param reporte reporte tocado
   */
  const abrirDetalle = useCallback((reporte: ReportePerdida) => {
    setDetalle(reporte);
    setDetalleVisible(true);
  }, []);

  /** Card del carrusel tocada: la marca, centra el mapa y abre su detalle. */
  const handleCard = useCallback(
    (reporte: ReportePerdida) => {
      setSeleccionadoId(reporte.id);
      mapaRef.current?.centrar({ lat: reporte.lat, lng: reporte.lng });
      abrirDetalle(reporte);
    },
    [abrirDetalle],
  );

  /** Marker tocado: lo marca, lleva el carrusel hasta su card y abre su detalle. */
  const handleMarker = useCallback(
    (reporte: ReportePerdida) => {
      setSeleccionadoId(reporte.id);
      const indice = visiblesRef.current.findIndex((r) => r.id === reporte.id);
      if (indice >= 0) carruselRef.current?.scrollToIndex({ index: indice, animated: true });
      abrirDetalle(reporte);
    },
    [abrirDetalle],
  );

  /** "Ver en el mapa" del detalle: vuelve al mapa (si estaba en lista) centrado en el reporte. */
  const abrirEnMapa = useCallback((reporte: ReportePerdida) => {
    setDetalleVisible(false);
    setModo('mapa');
    setSeleccionadoId(reporte.id);
    // Se espera a que el mapa se monte antes de mover la cámara.
    setTimeout(() => mapaRef.current?.centrar({ lat: reporte.lat, lng: reporte.lng }), ESPERA_MAPA_MS);
  }, []);

  /**
   * "Editar reporte" del detalle: cierra la hoja y abre el formulario con los datos cargados.
   * @param reporte reporte a editar
   */
  const editarReporte = useCallback((reporte: ReportePerdida) => {
    setDetalleVisible(false);
    // En iOS no se puede presentar un modal mientras otro se está cerrando.
    setTimeout(
      () =>
        router.push({ pathname: '/mi-mascota-perdida', params: { reporteId: String(reporte.id) } }),
      ESPERA_CIERRE_HOJA_MS,
    );
  }, []);

  /** Pide la posición al GPS y centra el mapa ahí. */
  const handleMiUbicacion = async () => {
    const coords = await gps.obtenerUbicacion();
    if (coords) {
      mapaRef.current?.centrar(coords);
    } else if (gps.permiso !== 'denegado') {
      Alert.alert('Ubicación no disponible', 'Revisá que la ubicación del celular esté activada.');
    }
  };

  /** Muestra u oculta el buscador; al cerrarlo se limpia el texto. */
  const toggleBuscador = () => {
    setBuscando((prev) => !prev);
    if (buscando) setBusqueda('');
  };

  /** Abre la hoja para elegir qué se reporta: una mascota propia o una encontrada. */
  const irAReportar = () => setEleccionVisible(true);

  /**
   * Cierra la hoja de elección y abre el modal del reporte elegido.
   * @param ruta modal a abrir
   */
  const abrirReporte = (ruta: '/mi-mascota-perdida' | '/reportar') => {
    setEleccionVisible(false);
    // En iOS no se puede presentar un modal mientras otro se está cerrando.
    setTimeout(() => router.push(ruta), ESPERA_CIERRE_HOJA_MS);
  };

  // --- Render ---
  // Si la carga falló, la lista vacía no significa que no haya reportes.
  const vacio = error ? (
    <EstadoVacio
      icon="cloud-off"
      titulo="No pudimos cargar los reportes"
      mensaje={error}
      accion={{ titulo: 'Reintentar', onPress: recargar }}
    />
  ) : (
    <EstadoVacio
      icon="search-off"
      titulo="No hay reportes"
      mensaje="Probá con otro nombre o barrio, o cambiá el filtro."
    />
  );

  return (
    <View style={styles.screen}>
      <AppHeader />

      <View style={styles.cabecera}>
        {/* Título con los botones de buscar y filtrar a la derecha. */}
        <View style={styles.tituloFila}>
          <Text style={styles.titulo}>Mascotas Perdidas</Text>
          <View style={styles.acciones}>
            {/* El mapa no tiene scroll: para refrescar ahí hay un botón (en la lista, pull-to-refresh). */}
            {modo === 'mapa' &&
              (refrescando ? (
                <ActivityIndicator
                  color={colors.primary}
                  style={styles.refrescando}
                  accessibilityLabel="Actualizando"
                />
              ) : (
                <IconButton icon="refresh" label="Actualizar" onPress={refrescar} />
              ))}
            <IconButton icon="search" label="Buscar" onPress={toggleBuscador} activo={buscando} />
            <IconButton
              icon="filter-list"
              label="Filtrar"
              onPress={() => setFiltroVisible(true)}
              activo={filtro !== 'todos'}
            />
          </View>
        </View>
        {buscando && (
          <Input
            icon="search"
            placeholder="Buscar por nombre o barrio"
            value={busqueda}
            onChangeText={setBusqueda}
            autoFocus
            returnKeyType="search"
            autoCorrect={false}
            maxLength={LIMITES.busqueda}
          />
        )}
        {gps.permiso === 'denegado' && (
          <PermissionNotice
            icon="location-off"
            titulo="Sin acceso a tu ubicación"
            mensaje="Te mostramos CABA. Activala para ver las mascotas perdidas cerca tuyo."
            puedePreguntar={gps.puedePreguntar}
            onReintentar={gps.obtenerUbicacion}
            onAbrirAjustes={gps.abrirAjustes}
            compacto
          />
        )}
      </View>

      {modo === 'mapa' ? (
        <>
          <View style={styles.mapaArea}>
            <MapaReportes
              ref={mapaRef}
              reportes={visibles}
              hallazgos={hallazgos}
              onSeleccionar={handleMarker}
              seleccionadoId={seleccionadoId}
              mostrarUsuario={gps.permiso === 'concedido'}
            />
            <View style={styles.flotantes}>
              <Pressable
                onPress={handleMiUbicacion}
                accessibilityRole="button"
                accessibilityLabel="Centrar en mi ubicación"
                style={({ pressed }) => [styles.miUbicacion, pressed && styles.pressed]}
              >
                {gps.cargando ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <MaterialIcons name="my-location" size={sizes.iconMd} color={colors.primary} />
                )}
              </Pressable>
              <Fab
                icon="add"
                onPress={irAReportar}
                accessibilityLabel="Reportar mascota perdida"
                style={styles.fabEnMapa}
              />
            </View>
          </View>

          <View style={styles.panel}>
            <SegmentedControl opciones={MODOS} valor={modo} onChange={setModo} variant="pill" />
            {/* Si la carga falló, el mapa vacío no dice nada: se muestra el error. */}
            {visibles.length === 0 && error ? (
              vacio
            ) : visibles.length === 0 ? (
              <Text style={styles.sinResultados}>No hay reportes con ese criterio.</Text>
            ) : (
              <FlatList
                ref={carruselRef}
                data={visibles}
                horizontal
                keyExtractor={(reporte) => String(reporte.id)}
                renderItem={({ item }) => (
                  <ReporteCard
                    reporte={item}
                    encontrada={hallazgos.has(item.id)}
                    onPress={handleCard}
                    seleccionado={item.id === seleccionadoId}
                    style={estiloCard}
                    contacto={contactoDeLaFamilia(item, usuario?.id, mascotas)}
                    armarMensaje={armarMensaje}
                  />
                )}
                ItemSeparatorComponent={SeparadorHorizontal}
                // Cada card "encaja" al soltar el scroll.
                snapToInterval={anchoCard + spacing.stackSm}
                decelerationRate="fast"
                getItemLayout={(_, index) => ({
                  length: anchoCard + spacing.stackSm,
                  offset: (anchoCard + spacing.stackSm) * index,
                  index,
                })}
                contentContainerStyle={styles.carrusel}
                showsHorizontalScrollIndicator={false}
              />
            )}
          </View>
        </>
      ) : (
        <>
          <FlatList
            data={visibles}
            keyExtractor={(reporte) => String(reporte.id)}
            renderItem={({ item }) => (
              <ReporteCard
                reporte={item}
                encontrada={hallazgos.has(item.id)}
                onPress={abrirDetalle}
                contacto={contactoDeLaFamilia(item, usuario?.id, mascotas)}
                armarMensaje={armarMensaje}
              />
            )}
            refreshControl={refresco}
            ListHeaderComponent={
              <SegmentedControl opciones={MODOS} valor={modo} onChange={setModo} variant="pill" />
            }
            ListHeaderComponentStyle={styles.listaHeader}
            ListEmptyComponent={vacio}
            ItemSeparatorComponent={SeparadorVertical}
            contentContainerStyle={styles.lista}
            showsVerticalScrollIndicator={false}
          />
          <Fab icon="add" onPress={irAReportar} accessibilityLabel="Reportar mascota perdida" />
        </>
      )}

      <FormModal visible={filtroVisible} titulo="Filtrar reportes" onClose={() => setFiltroVisible(false)}>
        <Text style={styles.filtroLabel}>Estado</Text>
        <View style={styles.filtroChips}>
          {FILTROS.map((f) => (
            <Chip
              key={f.valor}
              label={f.label}
              selected={filtro === f.valor}
              onPress={() => setFiltro(f.valor)}
            />
          ))}
        </View>
        <PrimaryButton title="Listo" onPress={() => setFiltroVisible(false)} />
      </FormModal>

      <DetalleReporte
        visible={detalleVisible}
        reporte={detalle}
        hallazgo={detalle ? hallazgos.get(detalle.id) : undefined}
        esPropio={!!detalle && detalle.autorId === usuario?.id}
        onClose={cerrarDetalle}
        onVerEnMapa={abrirEnMapa}
        puedeGestionar={!!detalle && puedeGestionarReporte(detalle, usuario?.id, mascotas)}
        onEditar={editarReporte}
        onYaAparecio={pedirCierre}
        cerrando={cerrando}
        contacto={detalle ? contactoDeLaFamilia(detalle, usuario?.id, mascotas) : undefined}
        armarMensaje={armarMensaje}
      />

      {/* Dos reportes distintos: el tutor que perdió a su mascota y el vecino que encontró una. */}
      <FormModal
        visible={eleccionVisible}
        titulo="¿Qué querés reportar?"
        onClose={() => setEleccionVisible(false)}
      >
        <View style={styles.opciones}>
          <MenuRow
            icon="campaign"
            titulo="Se perdió mi mascota"
            subtitulo="Usamos los datos de su perfil y marcás dónde la viste por última vez."
            onPress={() => abrirReporte('/mi-mascota-perdida')}
          />
          <MenuRow
            icon="volunteer-activism"
            titulo="Encontré una mascota"
            subtitulo="Escaneá su chapita o contanos cómo es y dónde la encontraste."
            onPress={() => abrirReporte('/reportar')}
          />
        </View>
      </FormModal>
    </View>
  );
}

/** Separador entre cards del carrusel. */
function SeparadorHorizontal() {
  return <View style={styles.sepHorizontal} />;
}

/** Separador entre cards de la lista. */
function SeparadorVertical() {
  return <View style={styles.sepVertical} />;
}

// --- Estilos ---
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  cabecera: {
    gap: spacing.stackSm,
    paddingHorizontal: spacing.containerMargin,
    paddingVertical: spacing.stackSm,
  },
  tituloFila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  titulo: {
    ...typography.headlineMd,
    color: colors.onSurface,
    flexShrink: 1,
  },
  acciones: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  refrescando: {
    width: sizes.avatarSm,
    height: sizes.avatarSm,
  },
  mapaArea: {
    flex: 1,
    overflow: 'hidden',
  },
  flotantes: {
    position: 'absolute',
    right: spacing.md,
    // Deja lugar para el borde redondeado del panel que se superpone.
    bottom: spacing.lg + spacing.md,
    alignItems: 'center',
    gap: spacing.stackSm,
  },
  miUbicacion: {
    width: sizes.avatarSm + 4,
    height: sizes.avatarSm + 4,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    ...shadows.level1,
  },
  pressed: {
    transform: [{ scale: 0.94 }],
  },
  fabEnMapa: {
    position: 'relative',
    right: 0,
    bottom: 0,
  },
  panel: {
    gap: spacing.md,
    marginTop: -spacing.md,
    paddingTop: spacing.stackSm,
    paddingBottom: spacing.md,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.background,
    ...shadows.level1,
  },
  carrusel: {
    paddingHorizontal: spacing.containerMargin,
    paddingBottom: spacing.xs,
  },
  sinResultados: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  lista: {
    flexGrow: 1,
    paddingHorizontal: spacing.containerMargin,
    paddingBottom: sizes.fab + spacing.stackLg,
  },
  listaHeader: {
    marginBottom: spacing.stackMd,
  },
  sepHorizontal: {
    width: spacing.stackSm,
  },
  sepVertical: {
    height: spacing.stackSm,
  },
  filtroLabel: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
  },
  filtroChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  opciones: {
    // Las filas de menú traen su propio margen lateral; se compensa el del modal.
    marginHorizontal: -spacing.containerMargin,
  },
});
