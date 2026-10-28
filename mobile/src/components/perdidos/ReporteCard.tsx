/**
 * Card de un reporte de mascota perdida o encontrada: foto con el estado
 * encima, nombre, hace cuánto, zona (con el radio de búsqueda si lo reportó
 * su tutor) y chips (raza y etiquetas). Un reencuentro lleva el estado
 * "REENCUENTRO" en verde y, en lugar de los chips, "¡Reencuentro! Esperando
 * que vuelva con su familia".
 * Se usa en el carrusel debajo del mapa y en el modo lista.
 * Si viene `contacto` (la familia, solo para quien publicó que la encontró),
 * abajo suma "Escribirle por WhatsApp" (`ContactoDueno`), o el texto que
 * explica que no se le puede escribir.
 */
import { memo } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { fuenteFoto } from '@/data/fotos';
import { colors, radius, shadows, sizes, spacing, typography } from '@/theme';
import type { ReportePerdida } from '@/types/models';
import { DETALLE_REENCUENTRO, TEXTO_REENCUENTRO } from '@/utils/etiquetas';
import { tiempoTranscurrido } from '@/utils/fechas';
import { textoRadio } from '@/utils/mapa';
import { ContactoDueno } from '../ContactoDueno';

type Props = {
  reporte: ReportePerdida;
  /** true si el reporte representa un reencuentro (ver `reencuentrosPorReporte`). */
  reencuentro?: boolean;
  onPress: (reporte: ReportePerdida) => void;
  /** Resalta la card (la que está centrada en el mapa). */
  seleccionado?: boolean;
  style?: StyleProp<ViewStyle>;
  /**
   * Familia a la que le escribe quien la encontró (ver `encontradoDelUsuario`):
   * null si no cargó teléfono, undefined si el usuario no la encontró.
   */
  contacto?: ReportePerdida['contacto'] | null;
  /** Arma el mensaje de WhatsApp para este reporte (estable, para no romper el memo). */
  armarMensaje?: (reporte: ReportePerdida) => string;
};

/** Lado de la foto cuadrada. */
const FOTO = 96;
/** Cantidad máxima de chips para que la card no crezca. */
const MAX_CHIPS = 2;

/**
 * Card de reporte.
 * @param props ver `Props`
 * @returns la card tocable
 */
function ReporteCardBase({
  reporte,
  reencuentro = false,
  onPress,
  seleccionado = false,
  style,
  contacto,
  armarMensaje,
}: Props) {
  const perdido = reporte.estado === 'perdido';
  const fuente = fuenteFoto(reporte.foto);
  const chips = [reporte.raza, ...reporte.etiquetas].slice(0, MAX_CHIPS);

  return (
    <Pressable
      onPress={() => onPress(reporte)}
      accessibilityRole="button"
      accessibilityLabel={`${reencuentro ? TEXTO_REENCUENTRO : perdido ? 'Perdido' : 'Encontrado'}: ${reporte.nombre}, ${reporte.zona}`}
      style={({ pressed }) => [
        styles.card,
        seleccionado && styles.seleccionado,
        pressed && styles.pressed,
        style,
      ]}
    >
      <View style={styles.contenido}>
        <View style={styles.foto}>
          {/* expo-image: caché y decodificado al tamaño de la miniatura. */}
          {fuente ? (
            <Image source={fuente} style={styles.imagen} contentFit="cover" transition={150} />
          ) : (
            <View style={[styles.imagen, styles.sinFoto]}>
              <MaterialIcons name="pets" size={sizes.iconLg} color={colors.tealLight} />
            </View>
          )}
          <View
            style={[
              styles.estado,
              reencuentro ? styles.estadoReencuentro : perdido ? styles.estadoPerdido : styles.estadoEncontrado,
            ]}
          >
            <Text style={styles.estadoTexto}>{reencuentro ? 'REENCUENTRO' : perdido ? 'PERDIDO' : 'ENCONTRADO'}</Text>
          </View>
        </View>

        <View style={styles.info}>
          <View style={styles.fila}>
            <Text style={styles.nombre} numberOfLines={1}>
              {reporte.nombre}
            </Text>
            <Text style={styles.tiempo}>{tiempoTranscurrido(reporte.fecha)}</Text>
          </View>
          <View style={styles.zona}>
            <MaterialIcons name="location-on" size={16} color={colors.onSurfaceVariant} />
            <Text style={styles.zonaTexto} numberOfLines={1}>
              {reporte.zona}
              {reporte.radioMetros ? ` · radio ${textoRadio(reporte.radioMetros)}` : ''}
            </Text>
          </View>
          {/* La marca va en el lugar de los chips, así la card no crece. */}
          {reencuentro ? (
            <View style={styles.hallazgo}>
              <MaterialIcons name="where-to-vote" size={16} color={colors.verde} />
              <Text style={styles.hallazgoTexto} numberOfLines={2}>
                {`${TEXTO_REENCUENTRO} ${DETALLE_REENCUENTRO}`}
              </Text>
            </View>
          ) : (
            <View style={styles.chips}>
              {chips.map((chip, indice) => (
                // La raza (primer chip) no se achica; las etiquetas sí.
                <View key={chip} style={[styles.chip, indice === 0 && styles.chipFijo]}>
                  <Text style={styles.chipTexto} numberOfLines={1}>
                    {chip}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
      {contacto !== undefined && armarMensaje && (
        <ContactoDueno contacto={contacto} armarMensaje={() => armarMensaje(reporte)} />
      )}
    </Pressable>
  );
}


/** Memoizada: en una lista solo se vuelve a dibujar si cambian sus props. */
export const ReporteCard = memo(ReporteCardBase);
// --- Estilos ---
const styles = StyleSheet.create({
  card: {
    gap: spacing.stackSm,
    padding: spacing.stackSm,
    borderRadius: radius.lg,
    borderWidth: sizes.borderWidth,
    borderColor: colors.transparent,
    backgroundColor: colors.surfaceContainerLowest,
    ...shadows.level1,
  },
  contenido: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  seleccionado: {
    borderColor: colors.tealLight,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
  foto: {
    width: FOTO,
    height: FOTO,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  imagen: {
    width: '100%',
    height: '100%',
  },
  sinFoto: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.tealLight10,
  },
  estado: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  estadoPerdido: {
    backgroundColor: colors.mustard,
  },
  estadoEncontrado: {
    backgroundColor: colors.primaryContainer,
  },
  estadoReencuentro: {
    backgroundColor: colors.verde,
  },
  estadoTexto: {
    ...typography.labelSm,
    fontSize: 10,
    lineHeight: 12,
    color: colors.white,
  },
  info: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.xs,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  nombre: {
    ...typography.bodyLg,
    fontFamily: typography.headlineMd.fontFamily,
    color: colors.onSurface,
    flex: 1,
  },
  tiempo: {
    ...typography.bodySm,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  zona: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  zonaTexto: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    flexShrink: 1,
  },
  chips: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  chip: {
    flexShrink: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.tealLight10,
  },
  chipFijo: {
    flexShrink: 0,
    maxWidth: '100%',
  },
  chipTexto: {
    ...typography.labelSm,
    color: colors.primaryContainer,
  },
  hallazgo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.tealLight10,
  },
  hallazgoTexto: {
    ...typography.labelSm,
    color: colors.verde,
    flexShrink: 1,
  },
});
