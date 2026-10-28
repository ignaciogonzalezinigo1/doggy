/**
 * Aviso para la familia de una mascota que alguien encontró. Se muestra en
 * Mis Mascotas, en el perfil de la mascota y en el detalle del reporte en
 * Perdidos, solo a quienes están asignados a ella. Tiene dos formas:
 * - reencuentro (la mascota tenía un perdido activo): "¡Encontraron a
 *   {nombre}!" y "Ya volvió a casa", que cierra el perdido y los encontrados;
 * - caso dudoso (no estaba perdida, alguien escaneó su QR): "Alguien
 *   encontró a {nombre}. ¿Se perdió {nombre}?" con "Sí, se perdió" (crea el
 *   perdido con el lugar del encontrado y pasa a reencuentro) y "No, está
 *   conmigo" (cierra el aviso).
 * En los dos muestra la foto de la mascota, dónde está y cuándo la
 * encontraron, el comentario de quien la encontró (si dejó uno) y, por cada
 * persona que avisó, "Escribirle por WhatsApp" con el agradecimiento ya
 * escrito (`mensajeGracias`, sin ubicación); si no cargó un celular, un texto
 * que lo explica. No se ofrece llamar. El contacto lo manda el servidor solo
 * a los asignados a la mascota.
 * Las acciones están en `useRecuperarMascota`.
 */
import { MaterialIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useApp } from '@/context/AppContext';
import { TEXTO_ESTA_CONMIGO, TEXTO_SE_PERDIO, useRecuperarMascota } from '@/hooks/useRecuperarMascota';
import { colors, radius, shadows, sizes, spacing, typography } from '@/theme';
import { formatearFecha, formatearHora, tiempoTranscurrido } from '@/utils/fechas';
import { botonCierre } from '@/utils/etiquetas';
import { mensajeGracias } from '@/utils/mensajes';
import type { AvisoMascota } from '@/utils/selectores';
import { Avatar } from '../Avatar';
import { ContactoDueno } from '../ContactoDueno';
import { PrimaryButton } from '../PrimaryButton';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

type Props = {
  /** Aviso de la mascota (ver `avisoDeMascota`). */
  aviso: AvisoMascota;
  /** Se llama cuando la familia respondió y salió bien (el detalle de Perdidos cierra su hoja). */
  onRespondido?: () => void;
};

/**
 * Aviso de mascota encontrada.
 * @param props ver `Props`
 * @returns la card con el hallazgo, los contactos y las respuestas de la familia
 */
export function AvisoEncontrada({ aviso, onRespondido }: Props) {
  const { usuario } = useApp();
  const { recuperando, pedirRecuperacion, confirmarPerdida, pedirDescarte } = useRecuperarMascota(onRespondido);
  const [ultimo] = aviso.encontrados;
  const reencuentro = aviso.tipo === 'reencuentro';
  const cuando = `${tiempoTranscurrido(ultimo.fecha)} · ${formatearFecha(ultimo.fecha)} ${formatearHora(ultimo.fecha)}`;

  return (
    <View style={[styles.card, reencuentro ? styles.cardReencuentro : styles.cardDudoso]} accessibilityLiveRegion="polite">
      <View style={styles.header}>
        <MaterialIcons
          name={reencuentro ? 'celebration' : 'help-outline'}
          size={sizes.iconMd}
          color={reencuentro ? colors.verde : colors.primary}
        />
        <View style={styles.tituloBloque}>
          <Text style={[styles.titulo, reencuentro && styles.tituloReencuentro]} accessibilityRole="header">
            {reencuentro ? `¡Encontraron a ${ultimo.nombre}!` : `Alguien encontró a ${ultimo.nombre}`}
          </Text>
          {!reencuentro && <Text style={styles.pregunta}>¿Se perdió {ultimo.nombre}?</Text>}
        </View>
      </View>

      <View style={styles.hallazgo}>
        <Avatar foto={ultimo.foto} nombre={ultimo.nombre} size={sizes.avatarMd} />
        <View style={styles.datos}>
          <Dato icono="location-on" etiqueta="Dónde" valor={ultimo.zona} />
          <Dato icono="schedule" etiqueta="Cuándo" valor={cuando} />
        </View>
      </View>
      {!!ultimo.infoAdicional && <Text style={styles.descripcion}>{ultimo.infoAdicional}</Text>}

      {aviso.encontrados.map((encontrado) => (
        <View key={encontrado.id} style={styles.contacto}>
          {encontrado.contacto && (
            <Text style={styles.contactoTexto}>Avisó {encontrado.contacto.nombre}. Coordiná la vuelta:</Text>
          )}
          <ContactoDueno
            contacto={encontrado.contacto ?? null}
            armarMensaje={() =>
              mensajeGracias({ para: encontrado.contacto?.nombre, yo: usuario?.nombre, mascota: encontrado.nombre })
            }
          />
        </View>
      ))}

      {reencuentro ? (
        <PrimaryButton
          title={botonCierre(true).texto}
          icon={botonCierre(true).icono}
          iconLeft
          onPress={() => pedirRecuperacion(ultimo)}
          loading={recuperando}
        />
      ) : (
        <View style={styles.respuestas}>
          <PrimaryButton
            title={TEXTO_SE_PERDIO}
            icon="campaign"
            iconLeft
            onPress={() => confirmarPerdida(ultimo)}
            loading={recuperando}
            style={styles.respuesta}
          />
          <PrimaryButton
            title={TEXTO_ESTA_CONMIGO}
            icon="home"
            iconLeft
            variant="outline"
            onPress={() => pedirDescarte(ultimo)}
            disabled={recuperando}
            style={styles.respuesta}
          />
        </View>
      )}
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

// --- Estilos ---
const styles = StyleSheet.create({
  card: {
    gap: spacing.stackSm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: sizes.borderWidth,
    ...shadows.level1,
  },
  cardReencuentro: {
    borderColor: colors.verde,
    backgroundColor: colors.verde10,
  },
  cardDudoso: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryFixed,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tituloBloque: {
    flex: 1,
    gap: spacing.xs,
  },
  titulo: {
    ...typography.headlineMd,
    color: colors.primary,
  },
  tituloReencuentro: {
    color: colors.verde,
  },
  pregunta: {
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  hallazgo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackSm,
  },
  datos: {
    flex: 1,
    gap: spacing.xs,
  },
  dato: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  datoEtiqueta: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    width: 64,
  },
  datoValor: {
    ...typography.bodySm,
    color: colors.onSurface,
    flex: 1,
  },
  descripcion: {
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  contacto: {
    gap: spacing.xs,
  },
  contactoTexto: {
    ...typography.bodySm,
    color: colors.onSurface,
  },
  respuestas: {
    gap: spacing.sm,
  },
  respuesta: {
    alignSelf: 'stretch',
  },
});
