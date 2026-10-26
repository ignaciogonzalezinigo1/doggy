/**
 * Encontré una mascota (modal).
 *
 * Reporte de alguien que encontró un perro en la calle (el de una mascota
 * propia es `mi-mascota-perdida.tsx`). Junta los tres componentes nativos:
 * - cámara: escanear el QR de la chapita para identificar a la mascota y
 *   autocompletar sus datos,
 * - cámara y fototeca: sacarle una foto en el momento o elegir una de la galería,
 * - GPS: precargar en el mini mapa el punto donde se la encontró.
 * Al identificarla por el QR se muestra quién es: nombre, edad, raza, foto y
 * el nombre de su tutor. Si está reportada como perdida, el servidor suma el
 * teléfono del tutor y aparece como link para llamarlo; si no, no lo manda.
 * El nombre es opcional porque quien la encuentra muchas veces no lo sabe.
 * Al confirmar se crea el reporte "encontrado", vibra, se cierra el modal y
 * se muestra el nuevo marker en Perdidos.
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
import { AvisoPermisoFoto } from '@/components/AvisoPermisoFoto';
import { FotoEditable } from '@/components/FotoEditable';
import { Input } from '@/components/Input';
import { LinkTelefono } from '@/components/LinkTelefono';
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
import type { MascotaPublica } from '@/types/models';
import { CODIGO_MASCOTA_REGEX } from '@/utils/codigos';
import { textoEdad } from '@/utils/etiquetas';
import { CENTRO_CABA } from '@/utils/mapa';
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

/**
 * Pantalla del reporte de mascota encontrada.
 * @returns el formulario de reporte
 */
export default function ReportarScreen() {
  const { buscarMascotaPorCodigo, crearReporte } = useApp();
  const gps = useUbicacion({ automatico: true });
  const fototeca = useFototeca();
  const insets = useSafeAreaInsets();

  // --- Estado ---
  const [mascotaId, setMascotaId] = useState<number | null>(null);
  /** Mascota identificada por el QR, con el nombre (y si está perdida, el teléfono) de su tutor. */
  const [identificada, setIdentificada] = useState<MascotaPublica | null>(null);
  const [nombre, setNombre] = useState('');
  const [raza, setRaza] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [foto, setFoto] = useState<string | null>(null);
  const [coords, setCoords] = useState<Coordenadas>(CENTRO_CABA);
  const [direccion, setDireccion] = useState<DireccionLegible | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [errores, setErrores] = useState<Errores>({});
  const [enviando, setEnviando] = useState(false);
  // Si el usuario movió el pin, la posición del GPS ya no lo pisa.
  const pinAjustado = useRef(false);

  // --- Precarga ---
  /**
   * Completa el formulario con los datos de la mascota identificada por el QR.
   * Su id viaja como `mascotaId` del reporte, aunque sea de otra familia.
   * @param mascota datos públicos de la mascota que devolvió el servidor
   */
  const precargar = useCallback((mascota: MascotaPublica) => {
    setMascotaId(mascota.id);
    setIdentificada(mascota);
    setNombre(mascota.nombre);
    setRaza(mascota.raza);
    setDescripcion(mascota.senas);
    setFoto(mascota.foto);
    setErrores({});
  }, []);

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
      precargar(mascota);
      setAviso(`Identificamos a ${mascota.nombre}. Revisá los datos y confirmá el reporte.`);
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
    // Nombre y raza son opcionales (quien la encontró puede no saberlos), pero si se cargan se validan.
    const nuevos: Errores = {
      nombre: validarNombreMascota(nombre, false),
      raza: validarRaza(raza, false),
      descripcion: validarTexto(descripcion, {
        requerido: 'Describí cómo es para que su familia la reconozca.',
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
        estado: 'encontrado',
        nombre: limpiarTexto(nombre) || SIN_NOMBRE,
        raza: limpiarTexto(raza) || 'Sin especificar',
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

          <EscanerQr onLectura={handleLectura} />

          {aviso && (
            <View style={styles.aviso} accessibilityLiveRegion="polite">
              <MaterialIcons name="check-circle" size={sizes.iconMd} color={colors.primaryContainer} />
              <Text style={styles.avisoTexto}>{aviso}</Text>
            </View>
          )}

          {/* Quién es: lo que el servidor deja ver de una mascota ajena */}
          {identificada && (
            <View style={[styles.card, styles.identificada]}>
              <Avatar foto={identificada.foto} nombre={identificada.nombre} size={sizes.avatarLg - 32} />
              <View style={styles.identificadaTexto}>
                <Text style={styles.identificadaNombre}>{identificada.nombre}</Text>
                <Text style={styles.identificadaDato}>
                  {`${identificada.raza} · ${textoEdad(identificada.edad)}`}
                </Text>
                <Text style={styles.identificadaDato}>{`Su familia: ${identificada.dueno.nombre}`}</Text>
                {identificada.dueno.telefono && (
                  <>
                    <Text style={styles.identificadaPerdida}>Está perdida: avisale a su familia.</Text>
                    <LinkTelefono telefono={identificada.dueno.telefono} nombre={identificada.dueno.nombre} />
                  </>
                )}
              </View>
            </View>
          )}

          {/* Datos de la mascota */}
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

          <PrimaryButton
            title="Publicar como encontrada"
            icon="volunteer-activism"
            variant="primary"
            onPress={handleReportar}
            loading={enviando}
            style={styles.boton}
          />
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
  avisoTexto: {
    ...typography.bodySm,
    color: colors.onSurface,
    flex: 1,
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
