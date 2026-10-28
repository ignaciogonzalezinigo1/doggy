/**
 * Se perdió mi mascota (modal).
 *
 * Reporte que hace el tutor de una de SUS mascotas, distinto del de alguien
 * que encontró un perro en la calle (`reportar.tsx`):
 * - elige cuál de sus mascotas se perdió (llega preelegida si se abre desde
 *   su perfil) y los datos salen de su perfil, sin volver a cargarlos,
 * - marca en el mapa dónde la vio por última vez y un radio de búsqueda
 *   (200 m a 2 km) que se dibuja como un círculo alrededor del punto,
 * - suma información del día: ropa, arnés, cómo reacciona.
 * Al publicar se crea el reporte "perdido", vibra, se cierra el modal y se
 * muestra el nuevo marker (con su círculo) en Perdidos.
 *
 * Una mascota tiene un solo reporte de perdido activo: si la elegida ya lo
 * tiene, en lugar del formulario aparece el aviso de que no se puede reportar
 * de nuevo, con "Ver o editar el reporte". Si igual el servidor responde 409,
 * se muestra su mensaje, que es el mismo.
 *
 * Si llega `reporteId`, la pantalla edita ese reporte en vez de crear uno:
 * arranca con su punto, radio e información, la mascota queda fija
 * y "Guardar cambios" lo actualiza. "Ya apareció" ("Ya volvió a casa" si alguien la encontró) pide confirmación, cierra
 * el reporte (sale del mapa) y cierra el modal.
 */
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip } from '@/components/Chip';
import { EstadoVacio } from '@/components/EstadoVista';
import { Input } from '@/components/Input';
import { PermissionNotice } from '@/components/PermissionNotice';
import { PrimaryButton } from '@/components/PrimaryButton';
import { MapaSelector } from '@/components/reporte/MapaSelector';
import { ResumenMascota } from '@/components/reporte/ResumenMascota';
import { SelectorMascota } from '@/components/reporte/SelectorMascota';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useApp } from '@/context/AppContext';
import { useCerrarReporte } from '@/hooks/useCerrarReporte';
import { Coordenadas, DireccionLegible, useUbicacion } from '@/hooks/useUbicacion';
import { colors, radius, shadows, sizes, spacing, typography } from '@/theme';
import { botonCierre } from '@/utils/etiquetas';
import { CENTRO_CABA, RADIO_POR_DEFECTO, RADIOS_BUSQUEDA, textoRadio } from '@/utils/mapa';
import type { ReportePerdida } from '@/types/models';
import { buscarMascota, hallazgoDe, reporteActivo } from '@/utils/selectores';
import { LIMITES, limpiarTexto, validarTexto } from '@/utils/validaciones';

/** Aviso si la mascota ya tiene un reporte de perdido activo (el mismo texto que el 409 del servidor). */
const MENSAJE_YA_REPORTADA = 'Esta mascota ya está reportada como perdida. No se puede reportar de nuevo.';

/**
 * Pantalla del reporte de una mascota propia (alta o edición).
 * @returns el formulario, o un estado vacío si el usuario no tiene mascotas
 */
export default function MiMascotaPerdidaScreen() {
  const { mascotaId: mascotaIdParam, reporteId } = useLocalSearchParams<{
    mascotaId?: string;
    reporteId?: string;
  }>();
  const { mascotas, reportes, crearReporte, editarReporte } = useApp();
  const gps = useUbicacion({ automatico: true });
  const insets = useSafeAreaInsets();

  /** Reporte que se edita; undefined si se está creando uno nuevo. */
  const editado = reporteId ? reportes.find((r) => String(r.id) === reporteId) : undefined;
  const editando = !!reporteId;

  // --- Estado ---
  // Al editar, el formulario arranca con lo que ya se publicó.
  /** Mascota que tocó el usuario en el selector; null = la del param o la primera. */
  const [elegidaId, setElegidaId] = useState<number | null>(null);
  const [coords, setCoords] = useState<Coordenadas>(() =>
    editado ? { lat: editado.lat, lng: editado.lng } : CENTRO_CABA,
  );
  const [radioMetros, setRadioMetros] = useState<number>(
    () => editado?.radioMetros ?? RADIO_POR_DEFECTO,
  );
  const [direccion, setDireccion] = useState<DireccionLegible | null>(null);
  const [infoAdicional, setInfoAdicional] = useState(() => editado?.infoAdicional ?? '');
  const [errorInfo, setErrorInfo] = useState<string | undefined>();
  const [enviando, setEnviando] = useState(false);
  // Si el usuario movió el pin (o se edita un punto ya publicado), el GPS ya no lo pisa.
  const pinAjustado = useRef(editando);

  // --- Datos derivados ---
  const mascota = editando
    ? mascotas.find((m) => m.id === editado?.mascotaId)
    : (buscarMascota(mascotas, elegidaId !== null ? String(elegidaId) : mascotaIdParam) ??
      mascotas[0]);
  // Una mascota tiene un solo reporte de "perdido" activo: si ya lo tiene, no se puede crear otro.
  const reportada = !editando && mascota ? reporteActivo(reportes, mascota.id) : undefined;

  // Cuando llega la posición del GPS, se usa como último lugar donde se la vio.
  useEffect(() => {
    if (gps.ubicacion && !pinAjustado.current) setCoords(gps.ubicacion);
  }, [gps.ubicacion]);

  // Cada vez que cambia el punto se busca la dirección legible. Se depende de
  // la función (estable) y no de `gps`, que es un objeto nuevo en cada render.
  const { obtenerDireccion } = gps;
  useEffect(() => {
    let vigente = true;
    obtenerDireccion(coords).then((resultado) => {
      if (vigente) setDireccion(resultado);
    });
    return () => {
      vigente = false;
    };
  }, [coords, obtenerDireccion]);

  // --- Handlers ---
  /**
   * Mueve el punto a donde lo dejó el usuario.
   * @param nuevas coordenadas del pin
   */
  const handleMoverPin = (nuevas: Coordenadas) => {
    pinAjustado.current = true;
    setCoords(nuevas);
  };

  /** Vuelve a leer el GPS y pone el pin en la posición actual. */
  const usarMiUbicacion = async () => {
    const actual = await gps.obtenerUbicacion();
    if (actual) {
      pinAjustado.current = false;
      setCoords(actual);
    }
  };

  /** Cierra el modal y abre el alta de mascota (para quien todavía no cargó ninguna). */
  const irAAgregarMascota = () => {
    if (router.canGoBack()) router.back();
    router.navigate('/mascotas/nueva');
  };

  /**
   * Valida la información adicional (opcional, pero con largo y caracteres permitidos).
   * @returns true si se puede publicar
   */
  const infoValida = (): boolean => {
    const error = validarTexto(infoAdicional, {
      max: LIMITES.infoAdicional,
      formato: 'texto',
      multilinea: true,
    });
    setErrorInfo(error);
    return !error;
  };

  /** Crea el reporte con los datos del perfil, vibra y vuelve a Perdidos mostrando el marker. */
  const handlePublicar = async () => {
    if (!mascota || reportada || !infoValida()) return;
    const info = limpiarTexto(infoAdicional, true);
    setEnviando(true);
    try {
      const reporte = await crearReporte({
        mascotaId: mascota.id,
        estado: 'perdido',
        nombre: mascota.nombre,
        raza: mascota.raza,
        descripcion: mascota.senas,
        foto: mascota.foto,
        lat: coords.lat,
        lng: coords.lng,
        // Si no se pudo traducir el punto a un barrio, queda la ciudad.
        zona: direccion?.zona ?? 'CABA',
        fecha: new Date().toISOString(),
        radioMetros,
        ...(info && { infoAdicional: info }),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (router.canGoBack()) router.back();
      router.navigate({ pathname: '/perdidos', params: { reporteId: String(reporte.id) } });
    } catch (e) {
      Alert.alert('No se pudo publicar', e instanceof Error ? e.message : 'Intentá de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  /**
   * Cierra el modal y abre en Perdidos el reporte que ya tiene la mascota,
   * para verlo o editarlo.
   * @param reporte reporte de perdido activo
   */
  const verReporte = (reporte: ReportePerdida) => {
    if (router.canGoBack()) router.back();
    router.navigate({ pathname: '/perdidos', params: { reporteId: String(reporte.id) } });
  };

  /** Cierra el modal; si no hay a dónde volver (link directo), va a Perdidos. */
  const cerrarModal = () => {
    if (router.canGoBack()) router.back();
    else router.navigate('/perdidos');
  };

  // "Ya apareció": cuando el reporte se cierra, no queda nada para editar y se cierra el modal.
  const { cerrando, pedirCierre } = useCerrarReporte(cerrarModal);

  /** Guarda los cambios del reporte editado y cierra el modal. */
  const handleGuardar = async () => {
    if (!editado || !infoValida()) return;
    setEnviando(true);
    try {
      await editarReporte(editado.id, {
        lat: coords.lat,
        lng: coords.lng,
        // Si no se pudo traducir el punto, queda la zona que ya tenía.
        zona: direccion?.zona ?? editado.zona,
        radioMetros,
        // Vacía se borra del reporte con null (un undefined no viaja en el JSON).
        infoAdicional: limpiarTexto(infoAdicional, true) || null,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      cerrarModal();
    } catch (e) {
      Alert.alert('No se pudo guardar', e instanceof Error ? e.message : 'Intentá de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  // --- Render ---
  const titulo = editando ? 'Editar reporte' : 'Se perdió mi mascota';

  // El reporte ya se cerró (o no es de una mascota de la cuenta): no hay nada para editar.
  if (editando && (!editado || !mascota)) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title={titulo} variant="bar" fallback="/perdidos" enModal />
        <EstadoVacio
          icon="search-off"
          titulo="Este reporte ya no está activo"
          mensaje="Puede que la mascota ya haya aparecido y alguien de la familia haya cerrado el reporte."
          accion={{ titulo: 'Volver', onPress: cerrarModal }}
        />
      </View>
    );
  }

  if (!mascota) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Se perdió mi mascota" variant="bar" fallback="/perdidos" enModal />
        <EstadoVacio
          icon="pets"
          titulo="Todavía no cargaste mascotas"
          mensaje="Para reportar una mascota tuya primero tiene que estar en tu perfil. Si encontraste un perro en la calle, usá “Encontré una mascota”."
          accion={{ titulo: 'Agregar mascota', onPress: irAAgregarMascota }}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title={titulo} variant="bar" fallback="/perdidos" enModal />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.stackLg }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.intro}>
            <Text style={styles.titulo}>
              {editando ? `Reporte de ${mascota.nombre}` : 'Reportar a mi mascota'}
            </Text>
            <Text style={styles.subtitulo}>
              {editando
                ? 'Ajustá el punto, el radio de búsqueda o la información que ven los vecinos.'
                : 'Usamos los datos de su perfil. Marcá dónde la viste por última vez y contanos todo lo que ayude a reconocerla.'}
            </Text>
          </View>

          {/* Quién se perdió (al editar, la mascota del reporte no cambia) */}
          {!editando && mascotas.length > 1 && (
            <View style={styles.seccion}>
              <Text style={styles.seccionTitulo}>¿Quién se perdió?</Text>
              <SelectorMascota
                mascotas={mascotas}
                seleccionadaId={mascota.id}
                onSeleccionar={(m) => setElegidaId(m.id)}
              />
            </View>
          )}

          <ResumenMascota mascota={mascota} />

          {reportada && (
            <View style={styles.aviso} accessibilityLiveRegion="polite">
              <View style={styles.avisoFila}>
                <MaterialIcons name="campaign" size={sizes.iconMd} color={colors.tertiaryContainer} />
                <Text style={styles.avisoTexto}>{MENSAJE_YA_REPORTADA}</Text>
              </View>
              <PrimaryButton
                title="Ver o editar el reporte"
                icon="visibility"
                iconLeft
                variant="outline"
                size="sm"
                onPress={() => verReporte(reportada)}
              />
            </View>
          )}

          {/* Si ya está reportada, no se carga otro reporte: solo queda el aviso de arriba. */}
          {!reportada && (
            <>
            {/* Última vez que se la vio, con radio de búsqueda */}
            <View style={styles.card}>
              <View style={styles.cardTitulo}>
                <MaterialIcons name="radar" size={sizes.iconMd} color={colors.primary} />
                <Text style={styles.cardTituloTexto}>¿Dónde la viste por última vez?</Text>
              </View>
              <MapaSelector coords={coords} onChange={handleMoverPin} radioMetros={radioMetros} />
              <View style={styles.direccion}>
                <Text style={styles.direccionTexto} numberOfLines={2}>
                  {direccion?.texto ??
                    (gps.cargando ? 'Buscando tu ubicación…' : 'Mové el pin hasta donde la viste')}
                </Text>
                <Pressable onPress={usarMiUbicacion} hitSlop={spacing.sm} accessibilityRole="button">
                  {({ pressed }) => (
                    <Text style={[styles.link, pressed && styles.linkPressed]}>Usar mi ubicación</Text>
                  )}
                </Pressable>
              </View>

              <Text style={styles.label}>Radio de búsqueda</Text>
              <View style={styles.chips}>
                {RADIOS_BUSQUEDA.map((metros) => (
                  <Chip
                    key={metros}
                    label={textoRadio(metros)}
                    selected={radioMetros === metros}
                    onPress={() => setRadioMetros(metros)}
                  />
                ))}
              </View>
              <Text style={styles.ayuda}>
                Es la zona donde puede estar. Los vecinos la ven como un círculo en el mapa.
              </Text>

              {gps.permiso === 'denegado' && (
                <PermissionNotice
                  icon="location-off"
                  titulo="Sin acceso a tu ubicación"
                  mensaje="Marcá el punto a mano en el mapa, o habilitá la ubicación."
                  puedePreguntar={gps.puedePreguntar}
                  onReintentar={usarMiUbicacion}
                  onAbrirAjustes={gps.abrirAjustes}
                  compacto
                />
              )}
            </View>

            {/* Información del día */}
            <View style={styles.card}>
              <View style={styles.cardTitulo}>
                <MaterialIcons name="checkroom" size={sizes.iconMd} color={colors.primary} />
                <Text style={styles.cardTituloTexto}>Información adicional</Text>
              </View>
              <Input
                label="¿Qué tenía puesto? ¿Algo más para saber?"
                placeholder="Ej: buzo rojo y arnés negro. Se asusta con las motos."
                value={infoAdicional}
                onChangeText={(texto) => {
                  setInfoAdicional(texto);
                  setErrorInfo(undefined);
                }}
                error={errorInfo}
                multiline
                maxLength={LIMITES.infoAdicional}
              />
            </View>
            </>
          )}

          {editado ? (
            <>
              <PrimaryButton
                title="Guardar cambios"
                icon="check"
                onPress={handleGuardar}
                loading={enviando}
                disabled={cerrando}
                style={styles.boton}
              />
              <PrimaryButton
                title={botonCierre(!!hallazgoDe(reportes, editado)).texto}
                icon={botonCierre(!!hallazgoDe(reportes, editado)).icono}
                iconLeft
                variant="outline"
                onPress={() => pedirCierre(editado)}
                loading={cerrando}
                disabled={enviando}
              />
            </>
          ) : reportada ? null : (
            <PrimaryButton
              title="Publicar como perdida"
              icon="campaign"
              variant="secondary"
              onPress={handlePublicar}
              loading={enviando}
              style={styles.boton}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// --- Estilos ---
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  flex: {
    flex: 1,
  },
  content: {
    gap: spacing.stackMd,
    paddingHorizontal: spacing.containerMargin,
    paddingTop: spacing.stackMd,
  },
  intro: {
    gap: spacing.stackSm,
  },
  titulo: {
    ...typography.headlineLgMobile,
    color: colors.onSurface,
  },
  subtitulo: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  seccion: {
    gap: spacing.sm,
  },
  seccionTitulo: {
    ...typography.labelMd,
    color: colors.onSurface,
  },
  aviso: {
    gap: spacing.stackSm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.tertiaryContainer10,
  },
  avisoFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackSm,
  },
  avisoTexto: {
    ...typography.bodySm,
    color: colors.onSurface,
    flex: 1,
  },
  card: {
    gap: spacing.stackSm,
    padding: spacing.containerMargin,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLowest,
    ...shadows.level1,
  },
  cardTitulo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardTituloTexto: {
    ...typography.labelMd,
    color: colors.onSurface,
  },
  direccion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.stackSm,
  },
  direccionTexto: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    flex: 1,
  },
  link: {
    ...typography.labelMd,
    color: colors.primary,
  },
  linkPressed: {
    opacity: 0.6,
  },
  label: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  ayuda: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
  },
  boton: {
    height: sizes.inputHeight + spacing.sm,
    borderRadius: radius.md + 4,
  },
});
