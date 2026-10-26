/**
 * Hoja con el detalle completo de un reporte de Perdidos.
 *
 * Muestra todo lo que se cargó al reportar: foto circular con el estado
 * (tocándola se ve grande y completa en `VisorFoto`), raza y
 * etiquetas, cuándo y dónde (con el radio de búsqueda si lo marcó su tutor),
 * descripción o señas particulares e información adicional (ropa, arnés,
 * cómo reacciona). "Ver en el mapa" cierra la hoja y centra el mapa en el reporte.
 * Si la mascota perdida es del usuario (o él publicó el reporte), suma
 * "Editar reporte" y "Ya apareció", que cierra el reporte y lo saca del mapa.
 */
import { MaterialIcons } from '@expo/vector-icons';
import { useState, type ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fuenteFoto } from '@/data/fotos';
import { colors, radius, shadows, sizes, spacing, typography } from '@/theme';
import type { ReportePerdida } from '@/types/models';
import { formatearFecha, formatearHora, tiempoTranscurrido } from '@/utils/fechas';
import { textoRadio } from '@/utils/mapa';
import { Avatar } from '../Avatar';
import { Chip } from '../Chip';
import { FormModal } from '../FormModal';
import { PrimaryButton } from '../PrimaryButton';
import { VisorFoto } from '../VisorFoto';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

type Props = {
  visible: boolean;
  /** Reporte a mostrar. Se mantiene mientras la hoja se cierra, para que no quede vacía. */
  reporte: ReportePerdida | null;
  /** true si el reporte lo publicó el usuario logueado. */
  esPropio: boolean;
  onClose: () => void;
  /** Cierra la hoja y centra el mapa en el reporte. */
  onVerEnMapa: (reporte: ReportePerdida) => void;
  /** true si el usuario puede editar y cerrar el reporte (ver `puedeGestionarReporte`). */
  puedeGestionar?: boolean;
  /** Abre la edición del reporte. */
  onEditar?: (reporte: ReportePerdida) => void;
  /** Avisa que la mascota ya apareció (pide confirmación y cierra el reporte). */
  onYaAparecio?: (reporte: ReportePerdida) => void;
  /** true mientras se cierra el reporte. */
  cerrando?: boolean;
};

/**
 * Hoja de detalle del reporte.
 * @param props ver `Props`
 * @returns el modal con la información completa
 */
export function DetalleReporte({
  visible,
  reporte,
  esPropio,
  onClose,
  onVerEnMapa,
  puedeGestionar = false,
  onEditar,
  onYaAparecio,
  cerrando = false,
}: Props) {
  if (!reporte) return null;

  const perdido = reporte.estado === 'perdido';

  return (
    <FormModal visible={visible} titulo={reporte.nombre} onClose={onClose}>
      {/* key: al cambiar de reporte, el visor arranca cerrado. */}
      <FotoReporte key={reporte.id} reporte={reporte} />

      {esPropio && (
        <View style={styles.propio}>
          <MaterialIcons name="person" size={sizes.iconSm} color={colors.primary} />
          <Text style={styles.propioTexto}>Publicaste este reporte</Text>
        </View>
      )}

      {/* Raza y etiquetas */}
      <View style={styles.chips}>
        <Chip label={reporte.raza} size="md" />
        {reporte.etiquetas.map((etiqueta) => (
          <Chip key={etiqueta} label={etiqueta} />
        ))}
      </View>

      {/* Cuándo y dónde */}
      <View style={styles.datos}>
        <Dato
          icono="schedule"
          etiqueta={perdido ? 'Se perdió' : 'Se encontró'}
          valor={`${tiempoTranscurrido(reporte.fecha)} · ${formatearFecha(reporte.fecha)} ${formatearHora(reporte.fecha)}`}
        />
        <Dato
          icono="location-on"
          etiqueta={perdido ? 'Última vez vista' : 'Dónde está'}
          valor={reporte.zona}
        />
        {!!reporte.radioMetros && (
          <Dato icono="radar" etiqueta="Radio de búsqueda" valor={textoRadio(reporte.radioMetros)} />
        )}
      </View>

      <Seccion titulo={perdido ? 'Señas particulares' : 'Descripción'} texto={reporte.descripcion} />
      {!!reporte.infoAdicional && (
        <Seccion titulo="Información adicional" texto={reporte.infoAdicional} />
      )}

      <PrimaryButton
        title="Ver en el mapa"
        icon="map"
        iconLeft
        variant="outline"
        onPress={() => onVerEnMapa(reporte)}
      />

      {/* Acciones del tutor: corregir el reporte o sacarlo porque ya apareció. */}
      {puedeGestionar && (
        <View style={styles.gestion}>
          {onEditar && (
            <PrimaryButton
              title="Editar reporte"
              icon="edit"
              iconLeft
              variant="tonal"
              onPress={() => onEditar(reporte)}
              disabled={cerrando}
              style={styles.gestionBoton}
            />
          )}
          {onYaAparecio && (
            <PrimaryButton
              title="Ya apareció"
              icon="celebration"
              iconLeft
              onPress={() => onYaAparecio(reporte)}
              loading={cerrando}
              style={styles.gestionBoton}
            />
          )}
        </View>
      )}
    </FormModal>
  );
}

/**
 * Foto del reporte: circular y centrada, como en el perfil de la mascota,
 * con el estado (PERDIDO / ENCONTRADO) debajo. Si hay foto, tocarla la abre
 * grande y completa en el visor a pantalla completa.
 * @param props.reporte reporte de la foto
 * @returns la foto con el estado
 */
function FotoReporte({ reporte }: { reporte: ReportePerdida }) {
  const [visorVisible, setVisorVisible] = useState(false);
  const perdido = reporte.estado === 'perdido';
  const tieneFoto = !!fuenteFoto(reporte.foto);

  const avatar = (
    <View style={styles.fotoSombra}>
      <Avatar
        foto={reporte.foto}
        nombre={reporte.nombre}
        size={FOTO}
        borderColor={colors.surfaceContainerLowest}
      />
      {tieneFoto && (
        <View style={styles.zoom}>
          <MaterialIcons name="zoom-in" size={sizes.iconSm} color={colors.white} />
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.fotoSeccion}>
      {tieneFoto ? (
        <Pressable
          onPress={() => setVisorVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={`Ver la foto de ${reporte.nombre} en grande`}
          style={({ pressed }) => pressed && styles.fotoPressed}
        >
          {avatar}
        </Pressable>
      ) : (
        avatar
      )}
      <View style={[styles.estado, perdido ? styles.estadoPerdido : styles.estadoEncontrado]}>
        <Text style={styles.estadoTexto}>{perdido ? 'PERDIDO' : 'ENCONTRADO'}</Text>
      </View>

      <VisorFoto
        visible={visorVisible}
        foto={reporte.foto}
        titulo={reporte.nombre}
        onClose={() => setVisorVisible(false)}
      />
    </View>
  );
}

type DatoProps = {
  icono: IconName;
  etiqueta: string;
  valor: string;
};

/**
 * Fila de dato: ícono, etiqueta y valor.
 * @param props ver `DatoProps`
 * @returns la fila
 */
function Dato({ icono, etiqueta, valor }: DatoProps) {
  return (
    <View style={styles.dato}>
      <MaterialIcons name={icono} size={sizes.iconSm} color={colors.onSurfaceVariant} />
      <Text style={styles.datoEtiqueta}>{etiqueta}</Text>
      <Text style={styles.datoValor}>{valor}</Text>
    </View>
  );
}

/**
 * Bloque de texto con título (descripción, información adicional).
 * @param props.titulo título del bloque
 * @param props.texto contenido
 * @returns el bloque
 */
function Seccion({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <View style={styles.seccion}>
      <Text style={styles.seccionTitulo}>{titulo}</Text>
      <Text style={styles.seccionTexto}>{texto}</Text>
    </View>
  );
}

// --- Estilos ---
/** Ancho fijo de las etiquetas, para que los valores queden alineados. */
const ANCHO_ETIQUETA = 120;
/** Diámetro de la foto circular: el mismo que en el perfil de la mascota. */
const FOTO = 128;

const styles = StyleSheet.create({
  fotoSeccion: {
    alignItems: 'center',
    gap: spacing.stackSm,
  },
  fotoSombra: {
    borderRadius: radius.full,
    ...shadows.level2,
  },
  fotoPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  zoom: {
    position: 'absolute',
    right: spacing.xs,
    bottom: spacing.xs,
    width: sizes.avatarSm,
    height: sizes.avatarSm,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cameraControl,
  },
  estado: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  estadoPerdido: {
    backgroundColor: colors.mustard,
  },
  estadoEncontrado: {
    backgroundColor: colors.primaryContainer,
  },
  estadoTexto: {
    ...typography.labelSm,
    color: colors.white,
  },
  propio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  propioTexto: {
    ...typography.labelMd,
    color: colors.primary,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  datos: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLowest,
  },
  dato: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  datoEtiqueta: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    width: ANCHO_ETIQUETA,
  },
  datoValor: {
    ...typography.bodySm,
    fontFamily: typography.labelMd.fontFamily,
    color: colors.onSurface,
    flex: 1,
  },
  seccion: {
    gap: spacing.xs,
  },
  seccionTitulo: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
  },
  seccionTexto: {
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  gestion: {
    flexDirection: 'row',
    gap: spacing.stackSm,
  },
  gestionBoton: {
    flex: 1,
  },
});
