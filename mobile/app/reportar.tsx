/**
 * Encontré una mascota (modal).
 *
 * Reporte de alguien que encontró un perro en la calle con chapita Doggy (el
 * de una mascota propia es `mi-mascota-perdida.tsx`). La chapita es la única
 * prueba de que lo tiene, así que el modal arranca en el escáner y sin un QR
 * válido de Doggy no hay formulario: no se puede reportar un perro sin
 * chapita (decisión de negocio: vincular un perro a un dueño sin prueba
 * física puede traer problemas). Usa dos componentes nativos:
 * - cámara (o una imagen de la galería): leer el QR de la chapita,
 * - GPS: precargar en el mini mapa el punto donde está ahora.
 *
 * Apenas se lee un QR válido se cierra la cámara y aparece la tarjeta de la
 * mascota, de solo lectura: foto del perfil, nombre, edad, raza y el nombre de
 * su familia. Quien la encontró no saca foto ni escribe nombre, raza ni
 * descripción (el servidor los toma de la mascota): solo marca dónde está y,
 * si quiere, deja un comentario corto. Al publicar se crea el encontrado con
 * el código del QR, vibra, se cierra el modal y se muestra el marker en
 * Perdidos, donde recién aparece "Escribirle por WhatsApp" a la familia. La
 * tarjeta no ofrece contactar antes de publicar. No se puede avisar sobre una
 * mascota propia o asignada, ni dos veces sobre la misma (los mismos textos
 * que el 403 y el 409 del servidor); si ya había avisado, ve el WhatsApp acá.
 */
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
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

import { Avatar } from '@/components/Avatar';
import { ContactoDueno } from '@/components/ContactoDueno';
import { Input } from '@/components/Input';
import { PermissionNotice } from '@/components/PermissionNotice';
import { PrimaryButton } from '@/components/PrimaryButton';
import { EscanerQr, ResultadoLectura } from '@/components/reporte/EscanerQr';
import { MapaSelector } from '@/components/reporte/MapaSelector';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useApp } from '@/context/AppContext';
import { Coordenadas, DireccionLegible, useUbicacion } from '@/hooks/useUbicacion';
import { colors, radius, shadows, sizes, spacing, typography } from '@/theme';
import { ErrorApi } from '@/services/http';
import type { MascotaPublica, ReportePerdida } from '@/types/models';
import { CODIGO_MASCOTA_REGEX } from '@/utils/codigos';
import { textoEdad } from '@/utils/etiquetas';
import { CENTRO_CABA } from '@/utils/mapa';
import { encontradoPropio, reporteActivo } from '@/utils/selectores';
import { mensajeLaTengo } from '@/utils/mensajes';
import { LIMITES, limpiarTexto, validarTexto } from '@/utils/validaciones';

/** Aviso si el usuario ya avisó que encontró a esta mascota (el mismo texto que el 409 del servidor). */
const MENSAJE_YA_AVISASTE = 'Ya avisaste que encontraste a esta mascota.';
/** Aviso si la mascota es del usuario (el mismo texto que el 403 del servidor). */
const MENSAJE_ES_TUYA = 'Esta mascota está en tu cuenta: no hace falta avisar que la encontraste.';

/**
 * Pantalla del reporte de mascota encontrada.
 * @returns el escáner o, con una mascota identificada, su tarjeta y el mapa
 */
export default function ReportarScreen() {
  const { reportes, mascotas, usuario, buscarMascotaPorCodigo, avisarEncontrado } = useApp();
  const gps = useUbicacion({ automatico: true });
  const insets = useSafeAreaInsets();

  // --- Estado ---
  /** Mascota identificada por el QR, con el nombre de su familia. */
  const [identificada, setIdentificada] = useState<MascotaPublica | null>(null);
  /** Comentario opcional de quien la encontró. */
  const [comentario, setComentario] = useState('');
  const [errorComentario, setErrorComentario] = useState<string | undefined>(undefined);
  const [coords, setCoords] = useState<Coordenadas>(CENTRO_CABA);
  const [direccion, setDireccion] = useState<DireccionLegible | null>(null);
  const [enviando, setEnviando] = useState(false);
  /** true después de "Escanear otra": el escáner vuelve a abrir la cámara solo. */
  const [reabrirCamara, setReabrirCamara] = useState(false);
  // Si el usuario movió el pin, la posición del GPS ya no lo pisa.
  const pinAjustado = useRef(false);

  // --- Datos derivados ---
  // Lo que ya se sabe de la mascota sale de los reportes activos.
  const perdida = identificada ? !!reporteActivo(reportes, identificada.id) : false;
  /** true si quien la escaneó es de la familia (dueño o invitado): no puede avisar. */
  const asignado = identificada !== null && mascotas.some((m) => m.id === identificada.id);
  /** Encontrado que ya publicó el usuario sobre esta mascota, si hay. */
  const propio = identificada ? encontradoPropio(reportes, identificada.id, usuario?.id) : undefined;
  /** No se muestra el formulario: es de su familia o ya avisó. */
  const bloqueado = asignado || !!propio;

  // --- Identificación por QR ---
  /**
   * Muestra la mascota identificada por el QR. El encontrado se publica con
   * su código; sus datos no se cargan en ningún formulario porque no se editan.
   * @param mascota datos públicos de la mascota que devolvió el servidor
   */
  const identificar = useCallback((mascota: MascotaPublica) => {
    setIdentificada(mascota);
    setComentario('');
    setErrorComentario(undefined);
  }, []);

  /**
   * Mensaje de WhatsApp para la familia, si el usuario ya avisó que la
   * encontró (`mensajeLaTengo`). Va sin ubicación.
   * @param encontrado el encontrado que publicó el usuario
   * @returns el texto del mensaje
   */
  const mensajeHallazgo = (encontrado: ReportePerdida): string =>
    mensajeLaTengo({ para: encontrado.contacto?.nombre, yo: usuario?.nombre, mascota: encontrado.nombre });

  /** Descarta la mascota identificada y vuelve a la cámara. */
  const escanearOtra = () => {
    setIdentificada(null);
    setComentario('');
    setErrorComentario(undefined);
    setReabrirCamara(true);
  };

  // Cuando llega la posición del GPS, se usa como el punto donde está la mascota.
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
   * Procesa el texto leído del QR: valida el formato y busca la mascota en el
   * servidor (no en `mascotas`, que son solo las del usuario).
   * @param codigo texto del QR
   * @returns si se pudo identificar a la mascota y, si no, por qué
   */
  const handleLectura = async (codigo: string): Promise<ResultadoLectura> => {
    const normalizado = codigo.trim().toUpperCase();
    if (!CODIGO_MASCOTA_REGEX.test(normalizado)) {
      return { ok: false, motivo: 'no-reconocido', mensaje: 'Ese QR no es de una chapita Doggy.' };
    }
    try {
      const mascota = await buscarMascotaPorCodigo(normalizado);
      if (!mascota) {
        return {
          ok: false,
          motivo: 'no-reconocido',
          mensaje: `No encontramos ninguna mascota registrada con el código ${normalizado}.`,
        };
      }
      identificar(mascota);
      return { ok: true };
    } catch (e) {
      // Si el servidor respondió, es un error suyo; si no, no hubo conexión.
      const mensaje = e instanceof Error ? e.message : 'Intentá de nuevo.';
      return { ok: false, motivo: e instanceof ErrorApi ? 'error' : 'sin-conexion', mensaje };
    }
  };

  /**
   * Mueve el punto donde está la mascota a donde lo dejó el usuario.
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

  /** Valida el comentario, publica el encontrado, vibra y vuelve a Perdidos mostrando el marker. */
  const handleReportar = async () => {
    if (!identificada || bloqueado) return;
    const error = validarTexto(comentario, {
      max: LIMITES.infoAdicional,
      formato: 'texto',
      multilinea: true,
    });
    setErrorComentario(error);
    if (error) return;

    setEnviando(true);
    try {
      const info = limpiarTexto(comentario, true);
      const reporte = await avisarEncontrado({
        estado: 'encontrado',
        codigo: identificada.codigo,
        mascotaId: identificada.id,
        lat: coords.lat,
        lng: coords.lng,
        // Si no se pudo traducir el punto a un barrio, queda la ciudad.
        zona: direccion?.zona ?? 'CABA',
        fecha: new Date().toISOString(),
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

  // --- Render ---
  return (
    <View style={styles.screen}>
      <ScreenHeader title="Encontré una mascota" variant="bar" fallback="/perdidos" enModal />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.stackLg }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {!identificada ? (
            <>
              <View style={styles.intro}>
                <Text style={styles.titulo}>Escaneá su chapita</Text>
                <Text style={styles.subtitulo}>
                  Para avisarle a su familia, escaneá el QR de la chapita Doggy con la cámara o subí una
                  foto del QR. Sin chapita no se puede reportar.
                </Text>
              </View>
              <EscanerQr onLectura={handleLectura} abrirAlMontar={reabrirCamara} />
            </>
          ) : (
            <>
              {/* Quién es: lo que el servidor deja ver de una mascota ajena, de solo lectura */}
              <View style={styles.card}>
                <View style={styles.identificada}>
                  <Avatar foto={identificada.foto} nombre={identificada.nombre} size={sizes.avatarMd} />
                  <View style={styles.identificadaTexto}>
                    <Text style={styles.identificadaNombre} numberOfLines={2}>
                      {identificada.nombre}
                    </Text>
                    <Text style={styles.identificadaDato}>
                      {`${identificada.raza} · ${textoEdad(identificada.edadMeses)}`}
                    </Text>
                  </View>
                </View>
                <View style={styles.identificadaDetalle}>
                  <Text style={styles.identificadaDato}>{`Su familia: ${identificada.dueno.nombre}`}</Text>
                  {perdida && (
                    <Text style={styles.identificadaPerdida}>Se perdió: avisale a su familia.</Text>
                  )}
                </View>
                <PrimaryButton
                  title="Escanear otra"
                  icon="qr-code-scanner"
                  iconLeft
                  variant="outline"
                  size="sm"
                  onPress={escanearOtra}
                />
              </View>

              {bloqueado ? (
                <View style={styles.aviso} accessibilityLiveRegion="polite">
                  <MaterialIcons name="check-circle" size={sizes.iconMd} color={colors.primaryContainer} />
                  <View style={styles.avisoCuerpo}>
                    <Text style={styles.avisoTexto}>{asignado ? MENSAJE_ES_TUYA : MENSAJE_YA_AVISASTE}</Text>
                    {/* Quien ya avisó ve el WhatsApp de la familia (el servidor se lo manda en su encontrado). */}
                    {!asignado && propio && (
                      <ContactoDueno contacto={propio.contacto ?? null} armarMensaje={() => mensajeHallazgo(propio)} />
                    )}
                  </View>
                </View>
              ) : (
                <>
                  {/* Dónde está ahora */}
                  <View style={styles.card}>
                    <View style={styles.cardTitulo}>
                      <MaterialIcons name="location-on" size={sizes.iconMd} color={colors.primary} />
                      <Text style={styles.cardTituloTexto}>¿Dónde está ahora?</Text>
                    </View>
                    <MapaSelector coords={coords} onChange={handleMoverPin} />
                    <View style={styles.direccion}>
                      <Text style={styles.direccionTexto} numberOfLines={2}>
                        {direccion?.texto ?? (gps.cargando ? 'Buscando tu ubicación…' : 'Mové el pin hasta donde está')}
                      </Text>
                      <Pressable onPress={usarMiUbicacion} hitSlop={spacing.sm} accessibilityRole="button">
                        {({ pressed }) => (
                          <Text style={[styles.link, pressed && styles.linkPressed]}>Usar mi ubicación</Text>
                        )}
                      </Pressable>
                    </View>
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
                    <Input
                      label="Comentario (opcional)"
                      placeholder="Ej: la tengo en casa, está bien"
                      value={comentario}
                      onChangeText={(texto) => {
                        setComentario(texto);
                        if (errorComentario) setErrorComentario(undefined);
                      }}
                      error={errorComentario}
                      multiline
                      maxLength={LIMITES.infoAdicional}
                    />
                  </View>

                  <View style={styles.publicar}>
                    <PrimaryButton
                      title="Avisarle a su familia"
                      icon="volunteer-activism"
                      variant="primary"
                      onPress={handleReportar}
                      loading={enviando}
                      style={styles.boton}
                    />
                    <Text style={styles.publicarAyuda}>
                      Al publicar, su familia va a ver tu nombre y teléfono, y vos vas a poder escribirle por
                      WhatsApp para coordinar la vuelta
                    </Text>
                  </View>
                </>
              )}
            </>
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
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackSm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.secondaryContainer30,
  },
  avisoCuerpo: {
    flex: 1,
    gap: spacing.sm,
  },
  avisoTexto: {
    ...typography.bodySm,
    color: colors.onSurface,
  },
  publicar: {
    gap: spacing.sm,
  },
  publicarAyuda: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  identificada: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  identificadaTexto: {
    flex: 1,
    gap: spacing.xs,
  },
  identificadaDetalle: {
    gap: spacing.xs,
  },
  identificadaNombre: {
    ...typography.headlineMd,
    color: colors.primary,
  },
  identificadaDato: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
  },
  identificadaPerdida: {
    ...typography.labelMd,
    color: colors.tertiaryContainer,
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
  boton: {
    height: sizes.inputHeight + spacing.sm,
    borderRadius: radius.md + 4,
  },
});
