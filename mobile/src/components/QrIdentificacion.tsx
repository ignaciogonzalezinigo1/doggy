/**
 * Card "Código QR de Identificación" del perfil de la mascota.
 *
 * Genera un QR real (react-native-qrcode-svg) con el ID único de la mascota.
 * Es el mismo código que se graba en la placa del collar: quien la encuentre
 * lo escanea y la app identifica a la mascota y a su tutor.
 *
 * Es el único lugar con acciones de QR: "Descargar QR" lo guarda en la galería
 * y "Compartir QR" comparte el archivo de imagen (ver `useQrImagen`). La
 * imagen es `FichaQr`, que se dibuja fuera de la pantalla: un PNG cuadrado con
 * fondo blanco y margen, el nombre arriba, el QR grande y "Escaneame con
 * Doggy" abajo, listo para imprimir en la chapita.
 */
import { MaterialIcons } from '@expo/vector-icons';
import { forwardRef, useRef } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewInstance } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { useQrImagen } from '@/hooks/useQrImagen';
import { colors, radius, sizes, spacing, typography } from '@/theme';
import type { Mascota } from '@/types/models';
import { Badge } from './Badge';
import { SectionCard } from './SectionCard';

const logo = require('@/assets/images/logo.png');

/** Lado del QR en puntos. */
const QR_SIZE = 96;
/** Lado de la imagen para imprimir y del QR dentro de ella (en puntos; la captura sale en píxeles físicos). */
const FICHA = 360;
const QR_FICHA = 260;

type Props = {
  mascota: Mascota;
};

/**
 * Card con el QR y las acciones de descargar y compartir.
 * @param props.mascota mascota a identificar
 * @returns la card del QR
 */
export function QrIdentificacion({ mascota }: Props) {
  const ficha = useRef<ViewInstance>(null);
  const { trabajando, compartir, descargar } = useQrImagen(ficha, mascota.nombre);

  // --- Render ---
  return (
    <>
      <SectionCard>
        <View style={styles.header}>
          <View style={styles.titulo}>
            <MaterialIcons name="qr-code-2" size={sizes.iconSm + 2} color={colors.primary} />
            <Text style={styles.tituloTexto}>Código QR de Identificación</Text>
          </View>
          <Badge label="Placa & Collar" />
        </View>

        <View style={styles.cuerpo}>
          <View style={styles.qr} accessibilityLabel={`Código QR con el ID ${mascota.codigo}`}>
            <QRCode
              value={mascota.codigo}
              size={QR_SIZE}
              color={colors.primary}
              backgroundColor={colors.white}
              logo={logo}
              logoSize={QR_SIZE * 0.26}
              logoBackgroundColor={colors.white}
              logoBorderRadius={radius.full}
              // Corrección de errores alta: el logo tapa parte del código y se sigue leyendo.
              ecl="H"
            />
          </View>

          <View style={styles.info}>
            <View style={styles.idFila}>
              <Text style={styles.idLabel}>ID ÚNICO:</Text>
              <Text style={styles.idValor} selectable>
                {mascota.codigo}
              </Text>
            </View>
            <Text style={styles.ayuda}>
              Escaneá para ver ficha médica de emergencia y contacto del tutor.
            </Text>
            <View style={styles.acciones}>
              <Pressable
                onPress={descargar}
                disabled={trabajando}
                accessibilityRole="button"
                accessibilityState={{ busy: trabajando }}
                style={({ pressed }) => [styles.boton, styles.botonPrimario, pressed && styles.pressed]}
              >
                <MaterialIcons name="download" size={sizes.iconSm - 2} color={colors.onPrimary} />
                <Text style={[styles.botonTexto, styles.botonTextoPrimario]}>Descargar QR</Text>
              </Pressable>
              <Pressable
                onPress={compartir}
                disabled={trabajando}
                accessibilityRole="button"
                accessibilityState={{ busy: trabajando }}
                style={({ pressed }) => [styles.boton, styles.botonOutline, pressed && styles.pressed]}
              >
                <MaterialIcons name="share" size={sizes.iconSm - 2} color={colors.primary} />
                <Text style={[styles.botonTexto, styles.botonTextoOutline]}>Compartir QR</Text>
              </Pressable>
              {trabajando && <ActivityIndicator color={colors.primary} />}
            </View>
          </View>
        </View>
      </SectionCard>

      {/* La imagen que se guarda o comparte: no se ve, se captura con view-shot. */}
      <View
        style={styles.fueraDePantalla}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <FichaQr ref={ficha} mascota={mascota} />
      </View>
    </>
  );
}

/**
 * Imagen del QR para imprimir: cuadrada, fondo blanco con margen, el nombre
 * arriba, el QR grande y "Escaneame con Doggy" abajo.
 * `collapsable={false}`: en Android, sin eso la vista se puede optimizar y no se captura.
 */
const FichaQr = forwardRef<ViewInstance, Props>(function FichaQr({ mascota }, ref) {
  return (
    <View ref={ref} collapsable={false} style={styles.ficha}>
      <Text style={styles.fichaNombre} numberOfLines={1}>
        {mascota.nombre}
      </Text>
      <QRCode
        value={mascota.codigo}
        size={QR_FICHA}
        color={colors.onBackground}
        backgroundColor={colors.white}
        logo={logo}
        logoSize={QR_FICHA * 0.22}
        logoBackgroundColor={colors.white}
        logoBorderRadius={radius.full}
        ecl="H"
      />
      <Text style={styles.fichaPie}>Escaneame con Doggy</Text>
    </View>
  );
});

// --- Estilos ---
const styles = StyleSheet.create({
  fueraDePantalla: {
    position: 'absolute',
    left: -10000,
    top: 0,
  },
  ficha: {
    width: FICHA,
    height: FICHA,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.white,
  },
  fichaNombre: {
    ...typography.headlineMd,
    color: colors.onBackground,
  },
  fichaPie: {
    ...typography.labelMd,
    color: colors.onBackground,
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
    ...typography.labelMd,
    fontFamily: typography.labelSm.fontFamily,
    letterSpacing: 0,
    color: colors.primary,
    flexShrink: 1,
  },
  cuerpo: {
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.stackSm + 2,
    borderRadius: radius.md,
    borderWidth: sizes.borderWidth,
    borderColor: colors.surfaceContainerHigh,
    backgroundColor: colors.background,
  },
  qr: {
    padding: spacing.sm,
    borderRadius: radius.md + 4,
    borderWidth: sizes.borderWidth,
    borderColor: colors.surfaceContainerHigh,
    backgroundColor: colors.white,
  },
  info: {
    alignSelf: 'stretch',
    gap: spacing.sm,
  },
  idFila: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  idLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  idValor: {
    ...typography.labelMd,
    fontFamily: typography.labelSm.fontFamily,
    color: colors.primary,
  },
  ayuda: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
  },
  acciones: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  boton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: sizes.avatarSm,
    paddingHorizontal: spacing.stackSm,
    borderRadius: radius.md,
  },
  botonPrimario: {
    flex: 1,
    backgroundColor: colors.primaryContainer,
  },
  botonOutline: {
    borderWidth: sizes.borderWidth,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
  },
  pressed: {
    transform: [{ scale: 0.96 }],
  },
  botonTexto: {
    ...typography.labelSm,
  },
  botonTextoPrimario: {
    color: colors.onPrimary,
  },
  botonTextoOutline: {
    color: colors.primary,
  },
});
