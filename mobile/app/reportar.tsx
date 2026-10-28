/**
 * Encontré una mascota (modal).
 *
 * Reporte de alguien que encontró un perro en la calle (el de una mascota
 * propia es `mi-mascota-perdida.tsx`). Junta los tres componentes nativos:
 * - cámara: escanear el QR de la chapita para identificar a la mascota,
 * - cámara y fototeca: sacarle una foto en el momento o elegir una de la galería,
 * - GPS: precargar en el mini mapa el punto donde está ahora.
 *
 * El encontrado queda vinculado a la mascota de dos formas:
 * - con el QR: apenas se lee uno válido se cierra la cámara y aparece la
 *   tarjeta de la mascota, de solo lectura (nombre, edad, raza, foto y el
 *   nombre de su familia). Se publica con el `codigo` leído, que le prueba al
 *   servidor que quien avisa tiene la chapita, aunque la mascota no esté
 *   perdida (puede que su familia todavía no sepa que se escapó);
 * - desde un perdido del mapa ("Encontré a …" en su detalle): llega con el
 *   `perdidoId` y muestra la mascota de ese perdido, sin escáner.
 * Quien la encontró completa solo el hallazgo: el comentario, una foto del
 * momento y el punto en el mapa. La tarjeta no ofrece contactar a la familia:
 * el contacto aparece recién después de publicar, en su encontrado en
 * Perdidos (o acá mismo, si ya había avisado). No se puede avisar sobre una
 * mascota propia o asignada, ni dos veces sobre la misma (el mismo texto que
 * el 403 y el 409 del servidor).
 *
 * Sin QR se cargan nombre (opcional, porque quien la encuentra muchas veces no
 * lo sabe), raza y descripción, y queda como encontrado anónimo. Al confirmar
 * se crea el reporte "encontrado", vibra, se cierra el modal y se muestra el
 * nuevo marker en Perdidos.
 */
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
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
import { AvisoPermisoFoto } from '@/components/AvisoPermisoFoto';
import { ContactoDueno } from '@/components/ContactoDueno';
import { FotoEditable } from '@/components/FotoEditable';
import { Input } from '@/components/Input';
import { PermissionNotice } from '@/components/PermissionNotice';
import { PrimaryButton } from '@/components/PrimaryButton';
import { EscanerQr, ResultadoLectura } from '@/components/reporte/EscanerQr';
import { MapaSelector } from '@/components/reporte/MapaSelector';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useApp } from '@/context/AppContext';
import { useFototeca } from '@/hooks/useFototeca';
import { Coordenadas, DireccionLegible, useUbicacion } from '@/hooks/useUbicacion';
import { colors, radius, shadows, sizes, spacing, typography } from '@/theme';
import { ErrorApi } from '@/services/http';
import type { MascotaPublica, ReportePerdida } from '@/types/models';
import { CODIGO_MASCOTA_REGEX } from '@/utils/codigos';
import { textoEdad } from '@/utils/etiquetas';
import { CENTRO_CABA } from '@/utils/mapa';
import { encontradoPropio, reporteActivo } from '@/utils/selectores';
import { mensajeLaTengo } from '@/utils/mensajes';
import {
  LIMITES,
  limpiarTexto,
  validarNombreMascota,
  validarRaza,
  validarTexto,
} from '@/utils/validaciones';

type Errores = {
  nombre?: string;
  raza?: string;
  descripcion?: string;
};

/** Nombre que se publica si quien la encontró no lo sabe. */
const SIN_NOMBRE = 'Sin identificar';
/** Aviso si el usuario ya avisó que encontró a esta mascota (el mismo texto que el 409 del servidor). */
const MENSAJE_YA_AVISASTE = 'Ya avisaste que encontraste a esta mascota.';
/** Aviso si la mascota es del usuario (el mismo texto que el 403 del servidor). */
const MENSAJE_ES_TUYA = 'Esta mascota está en tu cuenta: no hace falta avisar que la encontraste.';

/**
 * Pantalla del reporte de mascota encontrada.
 * @returns el formulario de reporte
 */
export default function ReportarScreen() {
  const { reportes, mascotas, usuario, buscarMascotaPorCodigo, crearReporte } = useApp();
  const gps = useUbicacion({ automatico: true });
  const fototeca = useFototeca();
  const insets = useSafeAreaInsets();
  const { perdidoId } = useLocalSearchParams<{ perdidoId?: string }>();

  // --- Estado ---
  /** Mascota identificada por el QR, con el nombre de su familia. */
  const [identificada, setIdentificada] = useState<MascotaPublica | null>(null);
  const [nombre, setNombre] = useState('');
  const [raza, setRaza] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [foto, setFoto] = useState<string | null>(null);
  const [coords, setCoords] = useState<Coordenadas>(CENTRO_CABA);
  const [direccion, setDireccion] = useState<DireccionLegible | null>(null);
  const [errores, setErrores] = useState<Errores>({});
  const [enviando, setEnviando] = useState(false);
  /** true después de "Escanear otra": el escáner vuelve a abrir la cámara solo. */
  const [reabrirCamara, setReabrirCamara] = useState(false);
  // Si el usuario movió el pin, la posición del GPS ya no lo pisa.
  const pinAjustado = useRef(false);

  // --- Datos derivados ---
  /** Perdido desde el que se llegó ("Encontré a …"), si todavía está activo. */
  const perdidoOrigen = perdidoId
    ? reportes.find((r) => String(r.id) === perdidoId && r.estado === 'perdido' && r.mascotaId !== null)
    : undefined;
  /** Mascota a la que queda vinculado el encontrado: la del QR o la del perdido. */
  const mascotaId = identificada?.id ?? perdidoOrigen?.mascotaId ?? null;
  // Con QR, lo que ya se sabe de la mascota sale de los reportes activos.
  const perdida = identificada ? !!reporteActivo(reportes, identificada.id) : false;
  /** true si quien la encontró es de la familia (dueño o invitado): no puede avisar. */
  const asignado = mascotaId !== null && mascotas.some((m) => m.id === mascotaId);
  /** Encontrado que ya publicó el usuario sobre esta mascota, si hay. */
  const propio = mascotaId !== null ? encontradoPropio(reportes, mascotaId, usuario?.id) : undefined;
  /** No se muestra el formulario: es de su familia o ya avisó. */
  const bloqueado = asignado || !!propio;

  // --- Identificación por QR ---
  /**
   * Muestra la mascota identificada por el QR. El reporte viaja con su
   * código, aunque sea de otra familia; sus datos no se cargan en el
   * formulario porque no se editan.
   * @param mascota datos públicos de la mascota que devolvió el servidor
   */
  const identificar = useCallback((mascota: MascotaPublica) => {
    setIdentificada(mascota);
    setDescripcion('');
    setFoto(null);
    setErrores({});
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
    setDescripcion('');
    setFoto(null);
    setErrores({});
    setReabrirCamara(true);
  };

  // Cuando llega la posición del GPS, se usa como el punto donde se la encontró.
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
   * Mueve el punto del hallazgo a donde lo dejó el usuario.
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

  /** Pregunta si sacarle una foto a la mascota o elegirla de la galería. */
  const handleFoto = async () => {
    try {
      const uri = await fototeca.pedirFoto();
      if (uri) setFoto(uri);
    } catch {
      Alert.alert('No se pudo conseguir la foto', 'Probá de nuevo en unos segundos.');
    }
  };

  /** Valida, crea el reporte, vibra y vuelve a Perdidos mostrando el nuevo marker. */
  const handleReportar = async () => {
    if (bloqueado) return;
    const vinculada = mascotaId !== null;
    // Sin mascota, nombre y raza son opcionales (quien la encontró puede no saberlos), pero si se cargan se validan.
    // Con mascota no se cargan: el servidor los toma de ella.
    const nuevos: Errores = {
      nombre: vinculada ? undefined : validarNombreMascota(nombre, false),
      raza: vinculada ? undefined : validarRaza(raza, false),
      descripcion: validarTexto(descripcion, {
        requerido: vinculada
          ? 'Contá dónde y cómo fue.'
          : 'Describí cómo es para que su familia la reconozca.',
        min: 5,
        max: LIMITES.descripcion,
        formato: 'texto',
        multilinea: true,
      }),
    };
    setErrores(nuevos);
    if (Object.values(nuevos).some(Boolean)) return;

    setEnviando(true);
    try {
      const reporte = await crearReporte({
        mascotaId,
        // El código del QR prueba que tiene la chapita; desde un perdido alcanza el id.
        ...(identificada && { codigo: identificada.codigo }),
        estado: 'encontrado',
        ...(!vinculada && {
          nombre: limpiarTexto(nombre) || SIN_NOMBRE,
          raza: limpiarTexto(raza) || 'Sin especificar',
        }),
        descripcion: limpiarTexto(descripcion, true),
        foto,
        lat: coords.lat,
        lng: coords.lng,
        // Si no se pudo traducir el punto a un barrio, queda la ciudad.
        zona: direccion?.zona ?? 'CABA',
        fecha: new Date().toISOString(),
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
          <View style={styles.intro}>
            <Text style={styles.titulo}>Reportar Mascota Encontrada</Text>
            <Text style={styles.subtitulo}>
              Si tiene chapita Doggy, escaneala y completamos sus datos. Si no, contanos cómo es y
              dónde la encontraste para que su familia la pueda ubicar.
            </Text>
          </View>

          {identificada ? (
            /* Quién es: lo que el servidor deja ver de una mascota ajena, de solo lectura */
            <View style={styles.card}>
              {/* Arriba: foto, nombre, raza y edad */}
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

              {/* Debajo, a todo el ancho: familia y aviso de perdida. El contacto
                  aparece recién después de publicar el encontrado. */}
              <View style={styles.identificadaDetalle}>
                <Text style={styles.identificadaDato}>{`Su familia: ${identificada.dueno.nombre}`}</Text>
                {perdida && (
                  <Text style={styles.identificadaPerdida}>Se perdió: avisale a su familia.</Text>
                )}
              </View>

              <View style={styles.identificadaAcciones}>
                <PrimaryButton
                  title="Escanear otra"
                  icon="qr-code-scanner"
                  iconLeft
                  variant="outline"
                  size="sm"
                  onPress={escanearOtra}
                />
              </View>
            </View>
          ) : perdidoOrigen ? (
            /* Desde el perdido del mapa: la mascota que busca su familia */
            <View style={styles.card}>
              <View style={styles.identificada}>
                <Avatar foto={perdidoOrigen.foto} nombre={perdidoOrigen.nombre} size={sizes.avatarMd} />
                <View style={styles.identificadaTexto}>
                  <Text style={styles.identificadaNombre} numberOfLines={2}>
                    {perdidoOrigen.nombre}
                  </Text>
                  <Text style={styles.identificadaDato}>{perdidoOrigen.raza}</Text>
                </View>
              </View>
              <Text style={styles.identificadaPerdida}>
                {`Se perdió en ${perdidoOrigen.zona}: contale a su familia dónde está ahora.`}
              </Text>
            </View>
          ) : (
            <EscanerQr onLectura={handleLectura} abrirAlMontar={reabrirCamara} />
          )}

          {bloqueado && (
            <View style={styles.aviso} accessibilityLiveRegion="polite">
              <MaterialIcons name="check-circle" size={sizes.iconMd} color={colors.primaryContainer} />
              <View style={styles.avisoCuerpo}>
                <Text style={styles.avisoTexto}>{asignado ? MENSAJE_ES_TUYA : MENSAJE_YA_AVISASTE}</Text>
                {/* Quien ya avisó ve el contacto de la familia (el servidor se lo manda en su encontrado). */}
                {!asignado && propio?.contacto && (
                  <ContactoDueno
                    telefono={propio.contacto.telefono}
                    nombre={propio.contacto.nombre}
                    armarMensaje={() => mensajeHallazgo(propio)}
                  />
                )}
              </View>
            </View>
          )}

          {mascotaId !== null ? (
            !bloqueado && (
              /* El hallazgo: lo único que completa quien la encontró */
              <View style={styles.card}>
                <Input
                  label="¿Dónde y cómo fue?"
                  placeholder="Ej: la vi en la plaza, tiene collar rojo"
                  value={descripcion}
                  onChangeText={(texto) => {
                    setDescripcion(texto);
                    if (errores.descripcion) setErrores((prev) => ({ ...prev, descripcion: undefined }));
                  }}
                  error={errores.descripcion}
                  multiline
                  maxLength={LIMITES.descripcion}
                />
                <View style={styles.fotoFila}>
                  <FotoEditable
                    foto={foto}
                    nombre={identificada?.nombre ?? perdidoOrigen?.nombre ?? ''}
                    onPress={handleFoto}
                    cargando={fototeca.eligiendo}
                    size={sizes.avatarSm + 16}
                  />
                  <Text style={styles.fotoAyuda}>
                    {foto ? 'Tocá para cambiar la foto' : 'Foto del momento (opcional)'}
                  </Text>
                </View>
                <AvisoPermisoFoto
                  fototeca={fototeca}
                  motivo="Una foto del momento ayuda a su familia a saber cómo está."
                  onFoto={setFoto}
                  compacto
                />
              </View>
            )
          ) : (
            /* Datos de la mascota (sin QR) */
            <View style={styles.card}>
              <View style={styles.fotoFila}>
                <FotoEditable
                  foto={foto}
                  nombre={nombre}
                  onPress={handleFoto}
                  cargando={fototeca.eligiendo}
                  size={sizes.avatarLg - 32}
                />
                <Text style={styles.fotoAyuda}>
                  {foto ? 'Tocá para cambiar la foto' : 'Sacale o sumá una foto: es lo que más ayuda a que su familia la reconozca'}
                </Text>
              </View>
              <AvisoPermisoFoto
                fototeca={fototeca}
                motivo="La foto es lo que más ayuda a que su familia la reconozca."
                onFoto={setFoto}
                compacto
              />

              <Input
                label="Nombre (si lo sabés)"
                placeholder="Ej. Firulais"
                value={nombre}
                onChangeText={(texto) => {
                  setNombre(texto);
                  if (errores.nombre) setErrores((prev) => ({ ...prev, nombre: undefined }));
                }}
                error={errores.nombre}
                autoCapitalize="words"
                maxLength={LIMITES.nombreMascota}
              />
              <Input
                label="Raza"
                placeholder="Ej. Mestizo"
                value={raza}
                onChangeText={(texto) => {
                  setRaza(texto);
                  if (errores.raza) setErrores((prev) => ({ ...prev, raza: undefined }));
                }}
                error={errores.raza}
                autoCapitalize="words"
                maxLength={LIMITES.raza}
              />
              <Input
                label="Descripción / Señas particulares"
                placeholder="Describí el collar, marcas, tamaño, si está lastimada, etc."
                value={descripcion}
                onChangeText={(texto) => {
                  setDescripcion(texto);
                  if (errores.descripcion) setErrores((prev) => ({ ...prev, descripcion: undefined }));
                }}
                error={errores.descripcion}
                multiline
                maxLength={LIMITES.descripcion}
              />
            </View>
          )}

          {!bloqueado && (
            <>
              {/* Dónde se la encontró */}
              <View style={styles.card}>
                <View style={styles.cardTitulo}>
                  <MaterialIcons name="location-on" size={sizes.iconMd} color={colors.primary} />
                  <Text style={styles.cardTituloTexto}>¿Dónde la encontraste?</Text>
                </View>
                <MapaSelector coords={coords} onChange={handleMoverPin} />
                <View style={styles.direccion}>
                  <Text style={styles.direccionTexto} numberOfLines={2}>
                    {direccion?.texto ?? (gps.cargando ? 'Buscando tu ubicación…' : 'Mové el pin hasta donde la encontraste')}
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
              </View>

              {mascotaId !== null ? (
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
                    Su familia va a ver tu nombre y teléfono, y vos el de su familia, para coordinar la vuelta
                  </Text>
                </View>
              ) : (
                <PrimaryButton
                  title="Publicar como encontrada"
                  icon="volunteer-activism"
                  variant="primary"
                  onPress={handleReportar}
                  loading={enviando}
                  style={styles.boton}
                />
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
  identificadaAcciones: {
    gap: spacing.sm,
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
  fotoFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  fotoAyuda: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    flex: 1,
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
