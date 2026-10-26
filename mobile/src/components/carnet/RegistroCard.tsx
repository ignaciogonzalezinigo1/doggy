/**
 * Card de un registro del historial sanitario.
 *
 * Todas las cards tienen la misma estructura para que el historial se lea
 * parejo: arriba el ícono del tipo, el nombre, el badge "Aplicada" (todo
 * registro del carnet es una aplicación hecha) y el botón de editar; abajo,
 * separadas por una línea, siempre las mismas tres filas alineadas:
 * aplicación, profesional y refuerzo (con "—" si no tiene). Las vacunas
 * suman una cuarta fila, "Etiqueta", con el link a la foto de la etiqueta
 * (o "—" si no se cargó), así todas las cards de la pestaña Vacunas quedan iguales.
 *
 * Gestos: deslizar la card a la izquierda muestra "Eliminar", que pide
 * confirmación y borra el registro (ver `DeslizarParaBorrar`, donde están el
 * umbral y la háptica). La alternativa tocable es el botón "Eliminar" del
 * formulario de edición.
 */
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { memo, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useEliminarRegistro } from '@/hooks/useEliminarRegistro';
import { colors, radius, sizes, spacing, typography } from '@/theme';
import type { RegistroSanitario } from '@/types/models';
import { TIPOS_REGISTRO } from '@/utils/etiquetas';
import { formatearFecha } from '@/utils/fechas';
import { Badge } from '../Badge';
import { DeslizarParaBorrar } from '../DeslizarParaBorrar';
import { IconButton } from '../IconButton';
import { VerEtiqueta } from './VerEtiqueta';

type Props = {
  registro: RegistroSanitario;
  /** Abre el formulario para corregir el registro. */
  onEditar: (registro: RegistroSanitario) => void;
};

/** Tamaño de los íconos de las filas de detalle. */
const ICONO = 16;
/** Ancho fijo de la columna de etiquetas, para que los valores queden alineados. */
const ANCHO_ETIQUETA = 92;

/**
 * Indica si el profesional es una persona (Dr./Dra.) o una institución.
 * @param profesional texto cargado en el registro
 * @returns true si parece un médico veterinario
 */
function esVeterinario(profesional: string): boolean {
  return /^dra?\.?\s/i.test(profesional.trim());
}

/**
 * Card del historial, deslizable para borrar.
 * @param props.registro registro a mostrar
 * @param props.onEditar se llama al tocar el lápiz
 * @returns la card
 */
function RegistroCardBase({ registro, onEditar }: Props) {
  const tipo = TIPOS_REGISTRO.find((t) => t.valor === registro.tipo) ?? TIPOS_REGISTRO[0];
  const handleEliminar = useEliminarRegistro(registro);

  // --- Render ---
  return (
    <DeslizarParaBorrar etiqueta={`Eliminar ${registro.nombre}`} onEliminar={handleEliminar}>
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.icono}>
            <MaterialIcons name={tipo.icono} size={sizes.iconMd} color={colors.primary} />
          </View>
          <View style={styles.titulo}>
            <Text style={styles.nombre} numberOfLines={2}>
              {registro.nombre}
            </Text>
            <Badge label="Aplicada" tone="teal" dot />
          </View>
          <IconButton
            icon="edit"
            label={`Editar ${registro.nombre}`}
            onPress={() => onEditar(registro)}
          />
        </View>

        <View style={styles.detalle}>
          <Fila
            icono={<MaterialIcons name="event" size={ICONO} color={colors.onSurfaceVariant} />}
            etiqueta="Aplicación"
            valor={formatearFecha(registro.fecha)}
          />
          <Fila
            icono={
              esVeterinario(registro.profesional) ? (
                <MaterialCommunityIcons
                  name="stethoscope"
                  size={ICONO}
                  color={colors.onSurfaceVariant}
                />
              ) : (
                <MaterialIcons name="local-hospital" size={ICONO} color={colors.onSurfaceVariant} />
              )
            }
            etiqueta="Profesional"
            valor={registro.profesional}
          />
          <Fila
            icono={<MaterialIcons name="update" size={ICONO} color={colors.onSurfaceVariant} />}
            etiqueta="Refuerzo"
            valor={registro.proximaDosis ? formatearFecha(registro.proximaDosis) : '—'}
          />
          {registro.tipo === 'vacuna' && (
            <Fila
              icono={<MaterialIcons name="sell" size={ICONO} color={colors.onSurfaceVariant} />}
              etiqueta="Etiqueta"
              valor={registro.fotoEtiqueta ? <VerEtiqueta registro={registro} /> : '—'}
            />
          )}
        </View>
      </View>
    </DeslizarParaBorrar>
  );
}

type FilaProps = {
  icono: ReactNode;
  etiqueta: string;
  /** Texto del valor, o un elemento propio (por ejemplo, un link). */
  valor: ReactNode;
};

/**
 * Fila de detalle: ícono, etiqueta de ancho fijo y valor.
 * @param props ver `FilaProps`
 * @returns la fila
 */
function Fila({ icono, etiqueta, valor }: FilaProps) {
  return (
    <View style={styles.fila}>
      {icono}
      <Text style={styles.etiqueta}>{etiqueta}</Text>
      {typeof valor === 'string' ? (
        <Text style={styles.valor} numberOfLines={1}>
          {valor}
        </Text>
      ) : (
        valor
      )}
    </View>
  );
}


/** Memoizada: en una lista solo se vuelve a dibujar si cambian sus props. */
export const RegistroCard = memo(RegistroCardBase);
// --- Estilos ---
const styles = StyleSheet.create({
  card: {
    gap: spacing.stackSm,
    padding: spacing.containerMargin,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLowest,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.stackSm,
  },
  icono: {
    width: sizes.avatarSm,
    height: sizes.avatarSm,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryFixed,
  },
  titulo: {
    flex: 1,
    gap: spacing.xs,
  },
  nombre: {
    ...typography.bodyLg,
    fontFamily: typography.labelMd.fontFamily,
    color: colors.onSurface,
  },
  detalle: {
    gap: spacing.sm,
    paddingTop: spacing.stackSm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outlineVariant,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  etiqueta: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    width: ANCHO_ETIQUETA,
  },
  valor: {
    ...typography.bodySm,
    fontFamily: typography.labelMd.fontFamily,
    color: colors.onSurface,
    flex: 1,
  },
});
