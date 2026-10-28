/**
 * Hoja con el detalle completo de un reporte de Perdidos.
 *
 * Muestra todo lo que se cargó al reportar: foto circular con el estado
 * (tocándola se ve grande y completa en `VisorFoto`), raza y
 * etiquetas, cuándo y dónde (con el radio de búsqueda si lo marcó su tutor),
 * descripción o señas particulares e información adicional (ropa, arnés,
 * cómo reacciona). "Ver en el mapa" cierra la hoja y centra el mapa en el reporte.
 * Un reencuentro (el reporte es el encontrado más reciente de una mascota
 * perdida) lleva el estado REENCUENTRO y un bloque verde con cuándo y dónde
 * se perdió; los datos de abajo son los del hallazgo (dónde está ahora).
 * Si la mascota es del usuario (dueño o invitado) y alguien la encontró,
 * muestra el mismo aviso que Mis Mascotas (`AvisoEncontrada`): el contacto
 * de quien la encontró y "Ya volvió a casa", o "Sí, se perdió" y "No, está
 * conmigo". Si el perdido es del usuario (o él lo publicó), suma "Editar
 * reporte" y "Ya apareció", que lo cierra y lo saca del mapa.
 * Si el usuario publicó que la encontró (viene `contacto`), lo primero
 * después de la foto es escribirle a la familia por WhatsApp o llamar.
 * Quien ve el perdido de otra familia no tiene contacto: tiene "Encontré a
 * {nombre}", que abre el formulario de encontrado vinculado a esa mascota.
 */
import { MaterialIcons } from '@expo/vector-icons';
import { useState, type ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fuenteFoto } from '@/data/fotos';
import { colors, radius, shadows, sizes, spacing, typography } from '@/theme';
import type { ReportePerdida } from '@/types/models';
import { botonCierre, TEXTO_REENCUENTRO } from '@/utils/etiquetas';
import { formatearFecha, formatearHora, tiempoTranscurrido } from '@/utils/fechas';
import { textoRadio } from '@/utils/mapa';
import type { AvisoMascota, Reencuentro } from '@/utils/selectores';
import { Avatar } from '../Avatar';
import { Chip } from '../Chip';
import { ContactoDueno } from '../ContactoDueno';
import { FormModal } from '../FormModal';
import { AvisoEncontrada } from '../mascotas/AvisoEncontrada';
import { PrimaryButton } from '../PrimaryButton';
import { VisorFoto } from '../VisorFoto';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

type Props = {
  visible: boolean;
  /** Reporte a mostrar. Se mantiene mientras la hoja se cierra, para que no quede vacía. */
  reporte: ReportePerdida | null;
  /** Reencuentro que representa el reporte (ver `reencuentrosPorReporte`), si es uno. */
  reencuentro?: Reencuentro;
  /** Aviso para la familia, si la mascota es del usuario y alguien la encontró (ver `avisoDeMascota`). */
  aviso?: AvisoMascota;
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
  /** Familia a la que le escribe quien la encontró (ver `contactoDeLaFamilia`). */
  contacto?: ReportePerdida['contacto'];
  /** Arma el mensaje de WhatsApp para el reporte. */
  armarMensaje?: (reporte: ReportePerdida) => string;
  /** Perdido sobre el que el usuario puede avisar "Encontré a …" (ver `perdidoParaAvisar`). */
  perdidoParaAvisar?: ReportePerdida;
  /** Abre el formulario de encontrado vinculado a la mascota de ese perdido. */
  onEncontre?: (perdido: ReportePerdida) => void;
};

/**
 * Hoja de detalle del reporte.
 * @param props ver `Props`
 * @returns el modal con la información completa
 */
export function DetalleReporte({
  visible,
  reporte,
  reencuentro,
  aviso,
  esPropio,
  onClose,
  onVerEnMapa,
  puedeGestionar = false,
  onEditar,
  onYaAparecio,
  cerrando = false,
  contacto,
  armarMensaje,
  perdidoParaAvisar,
  onEncontre,
}: Props) {
  if (!reporte) return null;

  const perdido = reporte.estado === 'perdido';

  return (
    <FormModal visible={visible} titulo={reporte.nombre} onClose={onClose}>
      {/* key: al cambiar de reporte, el visor arranca cerrado. */}
      <FotoReporte key={reporte.id} reporte={reporte} reencuentro={!!reencuentro} />

      {esPropio && (
        <View style={styles.propio}>
          <MaterialIcons name="person" size={sizes.iconSm} color={colors.primary} />
          <Text style={styles.propioTexto}>Publicaste este reporte</Text>
        </View>
      )}

      {contacto && armarMensaje && (
        <View style={styles.contacto}>
          <Text style={styles.contactoTexto}>
            Avisaste que encontraste a {reporte.nombre}. Escribile a {contacto.nombre}, de su familia, para
            coordinar la vuelta.
          </Text>
          <ContactoDueno
            telefono={contacto.telefono}
            nombre={contacto.nombre}
            armarMensaje={() => armarMensaje(reporte)}
          />
        </View>
      )}

      {aviso && <AvisoEncontrada aviso={aviso} onRespondido={onClose} />}

      {reencuentro && (
        <View style={styles.hallazgo} accessibilityLiveRegion="polite">
          <View style={styles.hallazgoTitulo}>
            <MaterialIcons name="where-to-vote" size={sizes.iconMd} color={colors.verde} />
            <Text style={styles.hallazgoTexto} accessibilityRole="header">
              {`${TEXTO_REENCUENTRO} Alguien encontró a ${reporte.nombre}.`}
            </Text>
          </View>
          <Dato
            icono="schedule"
            etiqueta="Se perdió"
            valor={`${tiempoTranscurrido(reencuentro.perdido.fecha)} · ${formatearFecha(reencuentro.perdido.fecha)} ${formatearHora(reencuentro.perdido.fecha)}`}
          />
          <Dato icono="location-on" etiqueta="Última vez vista" valor={reencuentro.perdido.zona} />
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

      {/* Quien la encontró en la calle avisa desde el perdido, ya vinculado a la mascota. */}
      {perdidoParaAvisar && onEncontre && (
        <PrimaryButton
          title={`Encontré a ${perdidoParaAvisar.nombre}`}
          icon="volunteer-activism"
          iconLeft
          onPress={() => onEncontre(perdidoParaAvisar)}
        />
      )}

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
              title={botonCierre(false).texto}
              icon={botonCierre(false).icono}
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
 * con el estado (PERDIDO / ENCONTRADO / REENCUENTRO) debajo. Si hay foto,
 * tocarla la abre grande y completa en el visor a pantalla completa.
 * @param props.reporte reporte de la foto
 * @param props.reencuentro true si el reporte representa un reencuentro
 * @returns la foto con el estado
 */
function FotoReporte({ reporte, reencuentro }: { reporte: ReportePerdida; reencuentro: boolean }) {
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
      <View
        style={[
          styles.estado,
          reencuentro ? styles.estadoReencuentro : perdido ? styles.estadoPerdido : styles.estadoEncontrado,
        ]}
      >
        <Text style={styles.estadoTexto}>{reencuentro ? 'REENCUENTRO' : perdido ? 'PERDIDO' : 'ENCONTRADO'}</Text>
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
  estadoReencuentro: {
    backgroundColor: colors.verde,
  },
  estadoTexto: {
    ...typography.labelSm,
    color: colors.white,
  },
  contacto: {
    gap: spacing.stackSm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLowest,
    ...shadows.level1,
  },
  contactoTexto: {
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  hallazgo: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: sizes.borderWidth,
    borderColor: colors.verde,
    backgroundColor: colors.verde10,
  },
  hallazgoTitulo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  hallazgoTexto: {
    ...typography.labelMd,
    color: colors.verde,
    flex: 1,
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
