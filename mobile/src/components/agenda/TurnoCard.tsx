/**
 * Card de un turno de la Agenda: hora, categoría, mascota, motivo y lugar,
 * con un borde izquierdo del color de la categoría. El lápiz abre la edición.
 *
 * Gestos: deslizar la card a la izquierda muestra "Eliminar", que pide
 * confirmación y borra el turno (ver `DeslizarParaBorrar`, donde están el
 * umbral y la háptica). La alternativa tocable es el botón "Eliminar" del
 * formulario de edición.
 */
import { memo } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAcciones } from '@/context/AppContext';
import { useConfirmarBorrado } from '@/hooks/useConfirmarBorrado';
import { colors, radius, sizes, spacing, typography } from '@/theme';
import type { Turno } from '@/types/models';
import { categoriaTurno } from '@/utils/etiquetas';
import { formatearHora } from '@/utils/fechas';
import { DeslizarParaBorrar } from '../DeslizarParaBorrar';

type Props = {
  turno: Turno;
  /** Nombre de la mascota del turno. */
  mascota: string;
  /** Abre el formulario para editar el turno. */
  onEditar: (turno: Turno) => void;
};

/**
 * Card de turno, deslizable para borrar.
 * @param props.turno turno a mostrar
 * @param props.mascota nombre de la mascota
 * @param props.onEditar se llama al tocar el lápiz
 * @returns la card
 */
function TurnoCardBase({ turno, mascota, onEditar }: Props) {
  const categoria = categoriaTurno(turno.categoria);
  const { borrarTurno } = useAcciones();
  const { pedirBorrado } = useConfirmarBorrado();

  // --- Handlers ---
  /**
   * Confirma y borra el turno; si se cancela o falla, la card vuelve a su lugar.
   * @param cerrar cierra el swipe
   */
  const handleEliminar = (cerrar: () => void) => {
    pedirBorrado({
      titulo: '¿Eliminar este turno?',
      mensaje: `${turno.motivo} de ${mascota}, ${formatearHora(turno.fecha)} h. No se puede deshacer.`,
      borrar: () => borrarTurno(turno.id),
      onDescartado: cerrar,
    });
  };

  // --- Render ---
  return (
    <DeslizarParaBorrar etiqueta={`Eliminar turno de ${mascota}`} onEliminar={handleEliminar}>
      <View style={[styles.card, { borderLeftColor: categoria.color }]}>
        <View style={styles.info}>
          <View style={styles.fila}>
            <Text style={styles.hora}>{formatearHora(turno.fecha)}</Text>
            <View style={[styles.chip, { backgroundColor: categoria.chipFondo }]}>
              <Text style={[styles.chipTexto, { color: categoria.chipTexto }]}>
                {categoria.chip}
              </Text>
            </View>
            <Text style={styles.mascota} numberOfLines={1}>
              • {mascota}
            </Text>
          </View>
          <Text style={styles.motivo}>{turno.motivo}</Text>
          <Text style={styles.lugar}>{turno.lugar}</Text>
        </View>
        <Pressable
          onPress={() => onEditar(turno)}
          accessibilityRole="button"
          accessibilityLabel={`Editar turno de ${mascota}`}
          style={({ pressed }) => [styles.editar, pressed && styles.editarPressed]}
        >
          <MaterialIcons name="edit" size={sizes.iconSm} color={colors.onSurfaceVariant} />
        </Pressable>
      </View>
    </DeslizarParaBorrar>
  );
}


/** Memoizada: en una lista solo se vuelve a dibujar si cambian sus props. */
export const TurnoCard = memo(TurnoCardBase);
// --- Estilos ---
const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackSm,
    padding: spacing.stackSm + 2,
    borderRadius: radius.lg,
    borderLeftWidth: 4,
    backgroundColor: colors.surfaceContainerLowest,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  hora: {
    ...typography.labelMd,
    fontFamily: typography.labelSm.fontFamily,
    color: colors.onSurface,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  chipTexto: {
    ...typography.labelSm,
  },
  mascota: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    flexShrink: 1,
  },
  motivo: {
    ...typography.bodySm,
    fontFamily: typography.labelMd.fontFamily,
    color: colors.onSurface,
  },
  lugar: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  editar: {
    width: sizes.avatarSm - 8,
    height: sizes.avatarSm - 8,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editarPressed: {
    backgroundColor: colors.surfaceContainer,
  },
});
