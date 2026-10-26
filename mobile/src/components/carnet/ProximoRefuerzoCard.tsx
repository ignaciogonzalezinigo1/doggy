/**
 * Card destacada en mostaza con el próximo refuerzo del carnet: el nombre de
 * la aplicación y la fecha de su `proximaDosis`. Como ese registro no se
 * repite en el historial, la card tiene su propio botón de editar y, si es
 * una vacuna con foto de la etiqueta, el link para verla.
 */
import { MaterialIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { useEliminarRegistro } from '@/hooks/useEliminarRegistro';
import { colors, radius, sizes, spacing, typography } from '@/theme';
import type { RegistroSanitario } from '@/types/models';
import { TIPOS_REGISTRO } from '@/utils/etiquetas';
import { formatearFecha } from '@/utils/fechas';
import { DeslizarParaBorrar } from '../DeslizarParaBorrar';
import { IconButton } from '../IconButton';
import { VerEtiqueta } from './VerEtiqueta';

type Props = {
  registro: RegistroSanitario;
  /** Título de la card; cambia según el tipo ("Próximo refuerzo", "Próxima dosis"...). */
  titulo?: string;
  /** Abre el formulario para corregir la aplicación. */
  onEditar: (registro: RegistroSanitario) => void;
};

/**
 * Card del próximo refuerzo.
 * @param props.registro aplicación con la próxima dosis a destacar
 * @param props.titulo título de la card
 * @param props.onEditar se llama al tocar el lápiz
 * @returns la card, o nada si el registro no tiene próxima dosis
 */
export function ProximoRefuerzoCard({ registro, titulo = 'Próximo refuerzo', onEditar }: Props) {
  const handleEliminar = useEliminarRegistro(registro);
  const tipo = TIPOS_REGISTRO.find((t) => t.valor === registro.tipo) ?? TIPOS_REGISTRO[0];
  if (!registro.proximaDosis) return null;

  // Deslizable como las del historial: si es el único registro, es la única card que hay.
  return (
    <DeslizarParaBorrar etiqueta={`Eliminar ${registro.nombre}`} onEliminar={handleEliminar}>
      <View style={styles.card} accessibilityRole="summary">
        <View style={styles.icono}>
          <MaterialIcons name={tipo.icono} size={sizes.iconMd} color={colors.tertiaryContainer} />
        </View>
        <View style={styles.textos}>
          <Text style={styles.label}>{titulo.toUpperCase()}</Text>
          <Text style={styles.nombre}>{registro.nombre}</Text>
          <View style={styles.fecha}>
            <MaterialIcons name="calendar-today" size={sizes.iconSm} color={colors.onTertiaryFixedVariant} />
            <Text style={styles.fechaTexto}>{formatearFecha(registro.proximaDosis)}</Text>
          </View>
          <VerEtiqueta registro={registro} color={colors.tertiaryContainer} />
        </View>
        <IconButton
          icon="edit"
          label={`Editar ${registro.nombre}`}
          onPress={() => onEditar(registro)}
        />
      </View>
    </DeslizarParaBorrar>
  );
}

// --- Estilos ---
const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.stackSm,
    padding: spacing.containerMargin,
    borderRadius: radius.lg,
    backgroundColor: colors.tertiaryFixedDim,
  },
  icono: {
    width: sizes.avatarSm,
    height: sizes.avatarSm,
    marginTop: spacing.xs,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerLowest,
  },
  textos: {
    flex: 1,
    gap: spacing.xs,
  },
  label: {
    ...typography.labelSm,
    color: colors.tertiaryContainer,
  },
  nombre: {
    ...typography.headlineMd,
    color: colors.onBackground,
  },
  fecha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  fechaTexto: {
    ...typography.bodyMd,
    fontFamily: typography.labelMd.fontFamily,
    color: colors.onTertiaryFixedVariant,
  },
});
