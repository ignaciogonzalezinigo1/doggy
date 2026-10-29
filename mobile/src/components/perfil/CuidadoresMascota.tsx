/**
 * Card de "Familia y Cuidadores" de una mascota: la mascota con su raza y
 * las personas asignadas con su rol (Dueño / Invitado); el usuario logueado
 * aparece marcado como "Vos". De cada persona se muestra solo la foto (o su
 * inicial), el nombre y el rol: la app no tiene dónde cargar un detalle del
 * vínculo, así que no se muestra.
 *
 * Solo si el usuario es dueño se muestra "Asignar", que genera un código de
 * asignación, y "Quitar" en la fila de cada invitado (no en la de otro dueño
 * ni en la propia). Un invitado puede irse con "Dejar de cuidar a …"; un
 * dueño no se saca a sí mismo desde acá (para eso está "Eliminar mascota").
 */
import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, shadows, sizes, spacing, typography } from '@/theme';
import type { Cuidador, Mascota, RolMascota, Usuario } from '@/types/models';
import { rolMascota } from '@/utils/etiquetas';
import { Avatar } from '../Avatar';

type Props = {
  mascota: Mascota;
  cuidadores: Cuidador[];
  /** Usuario logueado: su fila muestra sus datos actuales y la marca "Vos". */
  usuario: Usuario;
  /** Abre el formulario para generar un código de asignación. */
  onAsignar: (mascota: Mascota) => void;
  /** Abre la confirmación para dejar de cuidarla (solo invitados). */
  onDesasignarme: (mascota: Mascota) => void;
  /** Pide confirmación y saca a un invitado (solo dueños). */
  onQuitar: (mascota: Mascota, cuidador: Cuidador) => void;
};

/** Colores del badge de cada rol. */
const ROLES: Record<RolMascota, { fondo: string; texto: string }> = {
  dueno: { fondo: colors.primaryFixed, texto: colors.onPrimaryFixedVariant },
  invitado: { fondo: colors.surfaceContainerHigh, texto: colors.onSurfaceVariant },
};

/** Diámetro del avatar de cada cuidador. */
const AVATAR = 36;

/**
 * Texto con la cantidad de personas asignadas.
 * @param cantidad cuántas hay
 * @returns "1 persona asignada" o "N personas asignadas"
 */
function textoCantidad(cantidad: number): string {
  return cantidad === 1 ? '1 persona asignada' : `${cantidad} personas asignadas`;
}

/**
 * Card de cuidadores de una mascota.
 * @param props ver `Props`
 * @returns la card
 */
export function CuidadoresMascota({ mascota, cuidadores, usuario, onAsignar, onDesasignarme, onQuitar }: Props) {
  const miRol = cuidadores.find((c) => c.usuarioId === usuario.id)?.rol;
  // El usuario logueado va primero; después los dueños y al final los invitados.
  const ordenados = [...cuidadores].sort((a, b) => {
    if (a.usuarioId === usuario.id) return -1;
    if (b.usuarioId === usuario.id) return 1;
    return a.rol === b.rol ? 0 : a.rol === 'dueno' ? -1 : 1;
  });

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Avatar foto={mascota.foto} nombre={mascota.nombre} size={sizes.avatarSm} />
        <View style={styles.headerTexto}>
          <View style={styles.nombreFila}>
            <Text style={styles.nombre}>{mascota.nombre}</Text>
            <View style={styles.raza}>
              <Text style={styles.razaTexto} numberOfLines={1}>
                {mascota.raza}
              </Text>
            </View>
          </View>
          <Text style={styles.cantidad}>{textoCantidad(cuidadores.length)}</Text>
        </View>
      </View>

      {ordenados.map((cuidador) => {
        const rol = ROLES[cuidador.rol];
        const esVos = cuidador.usuarioId === usuario.id;
        // La fila propia usa los datos actuales del usuario (pudo cambiar su foto).
        const nombre = esVos ? `${usuario.nombre} ${usuario.apellido}` : cuidador.nombre;
        const foto = esVos ? usuario.foto : cuidador.foto;
        return (
          <View key={cuidador.id} style={[styles.cuidador, esVos && styles.cuidadorVos]}>
            {/* Sin foto, Avatar muestra la inicial. */}
            <Avatar foto={foto} nombre={nombre} size={AVATAR} borderColor={colors.white} />
            <View style={styles.cuidadorTexto}>
              <Text style={styles.cuidadorNombre} numberOfLines={1}>
                {nombre}
                {esVos && <Text style={styles.vos}> · Vos</Text>}
              </Text>
            </View>
            <View style={[styles.rol, { backgroundColor: rol.fondo }]}>
              <Text style={[styles.rolTexto, { color: rol.texto }]}>{rolMascota(cuidador.rol).label}</Text>
            </View>
            {miRol === 'dueno' && cuidador.rol === 'invitado' && !esVos && (
              <Pressable
                onPress={() => onQuitar(mascota, { ...cuidador, nombre })}
                accessibilityRole="button"
                accessibilityLabel={`Quitar a ${nombre}`}
                hitSlop={spacing.sm}
                style={({ pressed }) => [styles.quitar, pressed && styles.desasignarPressed]}
              >
                <Text style={styles.quitarTexto}>Quitar</Text>
              </Pressable>
            )}
          </View>
        );
      })}

      {/* Solo un dueño puede asignar a otras personas. */}
      {miRol === 'dueno' && (
        <Pressable
          onPress={() => onAsignar(mascota)}
          accessibilityRole="button"
          style={({ pressed }) => [styles.asignar, pressed && styles.asignarPressed]}
        >
          <MaterialIcons name="person-add" size={sizes.iconSm} color={colors.primary} />
          <Text style={styles.asignarTexto}>+ Asignar a {mascota.nombre}</Text>
        </Pressable>
      )}

      {/* Solo un invitado se va por su cuenta; un dueño, eliminando la mascota. */}
      {miRol === 'invitado' && (
        <Pressable
          onPress={() => onDesasignarme(mascota)}
          accessibilityRole="button"
          hitSlop={spacing.xs}
          style={({ pressed }) => [styles.desasignar, pressed && styles.desasignarPressed]}
        >
          <MaterialIcons name="person-remove" size={sizes.iconSm} color={colors.error} />
          <Text style={styles.desasignarTexto}>Dejar de cuidar a {mascota.nombre}</Text>
        </Pressable>
      )}
    </View>
  );
}

// --- Estilos ---
const styles = StyleSheet.create({
  card: {
    gap: spacing.sm + 2,
    padding: spacing.stackSm + 2,
    borderRadius: radius.lg,
    borderWidth: sizes.borderWidth,
    borderColor: colors.surfaceContainerHigh,
    backgroundColor: colors.surfaceContainerLowest,
    ...shadows.level1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    paddingBottom: spacing.sm + 2,
    borderBottomWidth: sizes.borderWidth,
    borderBottomColor: colors.surfaceContainerHigh,
  },
  headerTexto: {
    flex: 1,
  },
  nombreFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  nombre: {
    ...typography.bodyMd,
    fontFamily: typography.headlineLg.fontFamily,
    color: colors.onSurface,
  },
  raza: {
    flexShrink: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: colors.secondaryContainer30,
  },
  razaTexto: {
    ...typography.labelSm,
    fontSize: 11,
    color: colors.onSecondaryContainer,
  },
  cantidad: {
    ...typography.labelSm,
    fontFamily: typography.bodySm.fontFamily,
    color: colors.onSurfaceVariant,
  },
  cuidador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainerLow,
  },
  cuidadorTexto: {
    flex: 1,
  },
  cuidadorNombre: {
    ...typography.bodySm,
    fontFamily: typography.headlineLg.fontFamily,
    color: colors.onSurface,
  },
  rol: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  rolTexto: {
    ...typography.labelSm,
    fontSize: 11,
  },
  asignar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.secondaryContainer30,
  },
  asignarPressed: {
    backgroundColor: colors.secondaryContainer,
  },
  asignarTexto: {
    ...typography.labelSm,
    color: colors.primary,
  },
  cuidadorVos: {
    borderWidth: sizes.borderWidth,
    borderColor: colors.primaryFixed,
  },
  vos: {
    color: colors.primary,
  },
  desasignar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
    paddingVertical: spacing.xs,
  },
  desasignarPressed: {
    opacity: 0.6,
  },
  quitar: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  quitarTexto: {
    ...typography.labelSm,
    color: colors.error,
  },
  desasignarTexto: {
    ...typography.labelSm,
    color: colors.error,
  },
});
