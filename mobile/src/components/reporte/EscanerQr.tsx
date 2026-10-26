/**
 * Sección "Escanear QR de chapita" del reporte de perdida.
 *
 * HARDWARE: cámara trasera (o frontal con "Girar") mediante expo-camera, con
 * el lector de códigos integrado (`barcodeScannerSettings` + `onBarcodeScanned`)
 * y el flash usado como linterna (`enableTorch`) para leer chapitas de noche.
 * También usa el motor de vibración (expo-haptics) para confirmar la lectura.
 * PERMISO: cámara (NSCameraUsageDescription / CAMERA), con el texto del plugin
 * de expo-camera en app.json. La vibración no pide permiso.
 * POR QUÉ: quien encuentra un perro en la calle escanea el QR de su chapita y
 * la app completa sola el nombre, las señas y la foto, sin tipear nada. El
 * código se busca en el servidor (lo hace `onLectura`), así que la lectura
 * es asíncrona: mientras dura, el lector queda bloqueado y se ve "Buscando…".
 *
 * La cámara solo se monta cuando el usuario toca "Escanear" y se desmonta al
 * leer un código o al cerrar la pantalla, para no gastar batería. Después de
 * la primera lectura se bloquean las siguientes (el lector dispara muchas
 * veces por segundo mientras el QR está en cuadro).
 */
import { MaterialIcons } from '@expo/vector-icons';
import { CameraType, CameraView, scanFromURLAsync, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { ComponentProps, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { useFototeca } from '@/hooks/useFototeca';
import { colors, radius, shadows, sizes, spacing, typography } from '@/theme';
import { Badge } from '../Badge';
import { PermissionNotice } from '../PermissionNotice';

/**
 * Resultado de procesar un código leído. Si falla, `motivo` decide el título
 * del aviso y la vibración: `no-reconocido` (no es de Doggy o no existe),
 * `sin-conexion` (no se pudo llegar al servidor) o `error` (el servidor falló).
 */
export type ResultadoLectura =
  | { ok: true }
  | { ok: false; motivo: 'no-reconocido' | 'sin-conexion' | 'error'; mensaje: string };

type Props = {
  /** Recibe el texto del QR, busca la mascota y dice si la encontró. */
  onLectura: (codigo: string) => Promise<ResultadoLectura>;
  /** true para abrir la cámara apenas se monta, si ya hay permiso ("Escanear otra"). */
  abrirAlMontar?: boolean;
};

/** Título del aviso según por qué falló la lectura. */
const TITULO_FALLA: Record<Extract<ResultadoLectura, { ok: false }>['motivo'], string> = {
  'no-reconocido': 'Código no reconocido',
  'sin-conexion': 'Sin conexión',
  error: 'No pudimos buscar la mascota',
};

/** Alto del visor de la cámara. */
const VISOR = 240;
/** Lado del marco de escaneo. */
const MARCO = 150;
/** Largo de cada esquina del marco. */
const ESQUINA = 24;

/**
 * Escáner de QR con cámara, linterna, cámara frontal y lectura desde imagen.
 * @param props.onLectura callback con el código leído
 * @param props.abrirAlMontar abre la cámara al montarse si ya hay permiso
 * @returns la sección del escáner
 */
export function EscanerQr({ onLectura, abrirAlMontar = false }: Props) {
  const [permiso, pedirPermiso] = useCameraPermissions();
  const fototeca = useFototeca({ recortar: false });

  // --- Estado ---
  const [activo, setActivo] = useState(false);
  const [facing, setFacing] = useState<CameraType>('back');
  const [linterna, setLinterna] = useState(false);
  const [bloqueado, setBloqueado] = useState(false);
  const [denegado, setDenegado] = useState(false);
  const [leyendoImagen, setLeyendoImagen] = useState(false);
  const [buscando, setBuscando] = useState(false);
  // El ref corta en el acto; el estado además saca el callback del CameraView.
  const bloqueoRef = useRef(false);
  /** true si ya se abrió sola la cámara (solo pasa una vez por montaje). */
  const abiertaAlMontar = useRef(false);

  // "Escanear otra": vuelve directo a la cámara. El permiso llega asíncrono,
  // por eso se espera a que esté; si no se dio, queda el botón "Escanear".
  useEffect(() => {
    if (!abrirAlMontar || abiertaAlMontar.current || !permiso?.granted) return;
    abiertaAlMontar.current = true;
    setActivo(true);
  }, [abrirAlMontar, permiso]);

  // --- Handlers ---
  /** Vuelve a habilitar la lectura (después de un código inválido). */
  const desbloquear = () => {
    bloqueoRef.current = false;
    setBloqueado(false);
  };

  /**
   * Procesa un código: lo busca y, si corresponde a una mascota, vibra con
   * éxito y apaga la cámara. Si no la reconoce vibra con error; si no hubo
   * conexión, con una advertencia. En los dos casos avisa y deja reintentar.
   * @param codigo texto leído del QR
   */
  const procesar = async (codigo: string) => {
    setBuscando(true);
    const resultado = await onLectura(codigo);
    setBuscando(false);
    if (resultado.ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setActivo(false);
      setLinterna(false);
      desbloquear();
      return;
    }
    Haptics.notificationAsync(
      resultado.motivo === 'no-reconocido'
        ? Haptics.NotificationFeedbackType.Error
        : Haptics.NotificationFeedbackType.Warning,
    );
    Alert.alert(TITULO_FALLA[resultado.motivo], resultado.mensaje, [
      { text: 'Reintentar', onPress: desbloquear },
    ]);
  };

  /** Callback del lector: toma solo la primera lectura hasta que se desbloquee. */
  const handleEscaneo = ({ data }: { data: string }) => {
    if (bloqueoRef.current) return;
    bloqueoRef.current = true;
    setBloqueado(true);
    procesar(data);
  };

  /** Pide el permiso de cámara (si hace falta) y monta el visor. */
  const iniciar = async () => {
    if (permiso?.granted) {
      setDenegado(false);
      setActivo(true);
      return;
    }
    const respuesta = await pedirPermiso();
    setDenegado(!respuesta.granted);
    if (respuesta.granted) setActivo(true);
  };

  /** Apaga la cámara y la linterna. */
  const detener = () => {
    setActivo(false);
    setLinterna(false);
    desbloquear();
  };

  /** Alterna entre cámara trasera y frontal (la frontal no tiene linterna). */
  const girar = () => {
    setFacing((prev) => (prev === 'back' ? 'front' : 'back'));
    setLinterna(false);
  };

  /** Elige una imagen de la galería y busca un QR en ella. */
  const subirImagen = async () => {
    const uri = await fototeca.elegirFoto();
    if (!uri) return;
    setLeyendoImagen(true);
    try {
      const resultados = await scanFromURLAsync(uri, ['qr']);
      if (resultados.length === 0) {
        Alert.alert('Sin QR', 'No encontramos un código QR en esa imagen. Probá con una más nítida.');
        return;
      }
      // Se bloquea el lector de la cámara mientras se busca el código de la imagen.
      bloqueoRef.current = true;
      setBloqueado(true);
      await procesar(resultados[0].data);
    } catch {
      Alert.alert(
        'No disponible',
        'Este dispositivo no permite leer QR desde una imagen. Escaneá la chapita con la cámara.',
      );
    } finally {
      setLeyendoImagen(false);
    }
  };

  // --- Render ---
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titulo}>
          <MaterialIcons name="qr-code-scanner" size={sizes.iconMd - 2} color={colors.primary} />
          <Text style={styles.tituloTexto}>Escanear QR de chapita</Text>
        </View>
        <Badge label="URGENTE" tone="error" icon="priority-high" />
      </View>

      <View style={styles.visor}>
        {activo ? (
          <>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing={facing}
              enableTorch={linterna}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={bloqueado ? undefined : handleEscaneo}
            />
            <View style={styles.filaSuperior}>
              <View style={styles.pildoraOscura}>
                {buscando ? (
                  <ActivityIndicator size="small" color={colors.mustard} />
                ) : (
                  <MaterialIcons name="center-focus-strong" size={14} color={colors.mustard} />
                )}
                <Text style={styles.pildoraOscuraTexto}>{buscando ? 'Buscando…' : 'Escaneando...'}</Text>
              </View>
              <View style={styles.controles}>
                <BotonRedondo
                  icon={linterna ? 'flashlight-off' : 'flashlight-on'}
                  label={linterna ? 'Apagar linterna' : 'Encender linterna'}
                  onPress={() => setLinterna((prev) => !prev)}
                  disabled={facing === 'front'}
                />
                <BotonRedondo icon="close" label="Cerrar cámara" onPress={detener} />
              </View>
            </View>
            <Marco />
          </>
        ) : (
          <View style={styles.reposo}>
            <MaterialIcons name="qr-code-2" size={sizes.avatarSm} color={colors.secondaryContainer} />
            <Pressable
              onPress={iniciar}
              accessibilityRole="button"
              style={({ pressed }) => [styles.botonEscanear, pressed && styles.pressed]}
            >
              <MaterialIcons name="photo-camera" size={sizes.iconSm} color={colors.onTertiaryFixed} />
              <Text style={styles.botonEscanearTexto}>Escanear</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.filaInferior}>
          <PildoraClara
            icon="photo-library"
            label="Subir imagen QR"
            onPress={subirImagen}
            cargando={leyendoImagen || fototeca.eligiendo}
          />
          {activo && <PildoraClara icon="cameraswitch" label="Girar" onPress={girar} />}
        </View>
      </View>

      {denegado && (
        <PermissionNotice
          icon="no-photography"
          titulo="Sin acceso a la cámara"
          mensaje="La cámara se usa solo para leer el QR de la chapita. También podés subir una foto del QR."
          puedePreguntar={permiso?.canAskAgain ?? true}
          onReintentar={iniciar}
          onAbrirAjustes={() => Linking.openSettings()}
          compacto
        />
      )}

      <View style={styles.ayuda}>
        <MaterialIcons name="info" size={sizes.iconSm + 2} color={colors.primary} />
        <Text style={styles.ayudaTexto}>
          <Text style={styles.ayudaFuerte}>Apuntá al código QR</Text> de la chapita o collar para
          autocompletar la ficha y datos de contacto al instante.
        </Text>
      </View>
    </View>
  );
}

// --- Piezas internas ---

/** Marco de escaneo con cuatro esquinas y una línea central. */
function Marco() {
  return (
    <View style={styles.marco} pointerEvents="none">
      <View style={[styles.esquina, styles.esquinaSupIzq]} />
      <View style={[styles.esquina, styles.esquinaSupDer]} />
      <View style={[styles.esquina, styles.esquinaInfIzq]} />
      <View style={[styles.esquina, styles.esquinaInfDer]} />
      <View style={styles.linea} />
    </View>
  );
}

type BotonProps = {
  icon: ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

/**
 * Botón redondo oscuro sobre la cámara (linterna, cerrar).
 * @param props ícono, texto accesible, acción y si está deshabilitado
 */
function BotonRedondo({ icon, label, onPress, disabled = false }: BotonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.redondo, disabled && styles.deshabilitado, pressed && styles.pressed]}
    >
      <MaterialIcons name={icon} size={sizes.iconSm} color={colors.white} />
    </Pressable>
  );
}

/**
 * Píldora clara con ícono sobre el visor (subir imagen, girar).
 * @param props ícono, texto, acción y estado de carga
 */
function PildoraClara({
  icon,
  label,
  onPress,
  cargando = false,
}: Omit<BotonProps, 'disabled'> & { cargando?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={cargando}
      accessibilityRole="button"
      style={({ pressed }) => [styles.pildoraClara, pressed && styles.pressed]}
    >
      {cargando ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <MaterialIcons name={icon} size={16} color={colors.primary} />
      )}
      <Text style={styles.pildoraClaraTexto}>{label}</Text>
    </Pressable>
  );
}

// --- Estilos ---
const BORDE_MARCO = 4;

const styles = StyleSheet.create({
  card: {
    gap: spacing.stackSm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLowest,
    ...shadows.level1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  titulo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tituloTexto: {
    ...typography.headlineMd,
    fontFamily: typography.headlineLg.fontFamily,
    fontSize: 18,
    lineHeight: 24,
    color: colors.onSurface,
    flexShrink: 1,
  },
  visor: {
    height: VISOR,
    borderRadius: radius.lg,
    overflow: 'hidden',
    justifyContent: 'space-between',
    padding: spacing.stackSm,
    // Teal casi negro de la paleta: se ve como "pantalla apagada" sin salirse de la marca.
    backgroundColor: colors.onPrimaryFixed,
  },
  reposo: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  botonEscanear: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.stackSm,
    borderRadius: radius.full,
    backgroundColor: colors.mustard,
  },
  botonEscanearTexto: {
    ...typography.labelMd,
    color: colors.onTertiaryFixed,
  },
  filaSuperior: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  controles: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pildoraOscura: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.cameraControl,
  },
  pildoraOscuraTexto: {
    ...typography.labelSm,
    color: colors.white,
  },
  redondo: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cameraControl,
  },
  deshabilitado: {
    opacity: 0.4,
  },
  pressed: {
    transform: [{ scale: 0.94 }],
  },
  marco: {
    position: 'absolute',
    top: (VISOR - MARCO) / 2,
    alignSelf: 'center',
    width: MARCO,
    height: MARCO,
    justifyContent: 'center',
  },
  esquina: {
    position: 'absolute',
    width: ESQUINA,
    height: ESQUINA,
    borderColor: colors.secondaryContainer,
  },
  esquinaSupIzq: {
    top: 0,
    left: 0,
    borderTopWidth: BORDE_MARCO,
    borderLeftWidth: BORDE_MARCO,
    borderTopLeftRadius: radius.sm + 2,
  },
  esquinaSupDer: {
    top: 0,
    right: 0,
    borderTopWidth: BORDE_MARCO,
    borderRightWidth: BORDE_MARCO,
    borderTopRightRadius: radius.sm + 2,
  },
  esquinaInfIzq: {
    bottom: 0,
    left: 0,
    borderBottomWidth: BORDE_MARCO,
    borderLeftWidth: BORDE_MARCO,
    borderBottomLeftRadius: radius.sm + 2,
  },
  esquinaInfDer: {
    bottom: 0,
    right: 0,
    borderBottomWidth: BORDE_MARCO,
    borderRightWidth: BORDE_MARCO,
    borderBottomRightRadius: radius.sm + 2,
  },
  linea: {
    height: 2,
    marginHorizontal: spacing.sm,
    backgroundColor: colors.secondaryContainer,
    opacity: 0.8,
  },
  filaInferior: {
    // Siempre abajo, esté o no la cámara encendida.
    marginTop: 'auto',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  pildoraClara: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.stackSm,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    backgroundColor: colors.whiteTranslucent,
  },
  pildoraClaraTexto: {
    ...typography.labelSm,
    color: colors.primary,
  },
  ayuda: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm + 2,
    padding: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: sizes.borderWidth,
    borderColor: colors.primary15,
    backgroundColor: colors.primary5,
  },
  ayudaTexto: {
    ...typography.bodySm,
    fontSize: 13,
    lineHeight: 18,
    color: colors.onSurfaceVariant,
    flex: 1,
  },
  ayudaFuerte: {
    fontFamily: typography.labelSm.fontFamily,
    color: colors.onSurface,
  },
});
