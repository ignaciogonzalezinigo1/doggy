/**
 * Asignación de mascota (modal).
 *
 * Es la pantalla que se abre al cargar un código de asignación desde Perfil.
 * Muestra a qué mascota invitaron al usuario y con qué rol (Dueño / Invitado)
 * y, al aceptar, la mascota pasa a su cuenta y se abre su perfil. Si el código
 * no existe, ya se usó o el usuario ya está asignado, lo explica.
 */
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { Chip } from '@/components/Chip';
import { Cargando, EstadoVacio } from '@/components/EstadoVista';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useApp } from '@/context/AppContext';
import { colors, radius, shadows, sizes, spacing, typography } from '@/theme';
import type { Invitacion } from '@/types/models';
import { rolMascota } from '@/utils/etiquetas';
import { volver } from '@/utils/navegacion';

/** Diámetro de la foto de la mascota. */
const FOTO = 112;

/**
 * Pantalla para aceptar un código de asignación.
 * @returns la invitación, o el estado de carga / error
 */
export default function AsignarScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { mascotas, cargando, verInvitacion, aceptarInvitacion } = useApp();
  const insets = useSafeAreaInsets();

  // --- Estado ---
  const [invitacion, setInvitacion] = useState<Invitacion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aceptando, setAceptando] = useState(false);

  // Trae la invitación apenas se abre la pantalla (la respuesta llega en un callback).
  useEffect(() => {
    if (!token) return;
    let vigente = true;
    verInvitacion(token)
      .then((resultado) => {
        if (vigente) setInvitacion(resultado);
      })
      .catch((e: unknown) => {
        if (vigente) setError(e instanceof Error ? e.message : 'No pudimos abrir el código.');
      });
    return () => {
      vigente = false;
    };
  }, [token, verInvitacion]);

  // --- Datos derivados ---
  const mensajeError = token ? error : 'Falta el código de asignación.';
  const yaAsignada = invitacion ? mascotas.find((m) => m.id === invitacion.mascotaId) : undefined;

  // --- Handlers ---
  /**
   * Abre el perfil de una mascota, cerrando antes este modal si se puede.
   * @param id id de la mascota
   */
  const irAMascota = (id: number) => {
    if (router.canGoBack()) router.back();
    router.navigate({ pathname: '/mascotas/[id]', params: { id: String(id) } });
  };

  /** Acepta el código: la mascota pasa a la cuenta del usuario con el rol del código. */
  const handleAceptar = async () => {
    if (!invitacion) return;
    setAceptando(true);
    try {
      const mascota = await aceptarInvitacion(invitacion.token);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      irAMascota(mascota.id);
      Alert.alert(
        '¡Listo!',
        `${mascota.nombre} ya está en tu cuenta. Sos ${rolMascota(invitacion.rol).label.toLowerCase()}.`,
      );
    } catch (e) {
      Alert.alert('No se pudo aceptar', e instanceof Error ? e.message : 'Intentá de nuevo.');
    } finally {
      setAceptando(false);
    }
  };

  // --- Render ---
  /** Contenido según el estado: error, cargando, ya asignada o la invitación. */
  const contenido = () => {
    if (mensajeError) {
      return (
        <EstadoVacio
          icon="error-outline"
          titulo="No pudimos usar este código"
          mensaje={mensajeError}
          accion={{ titulo: 'Ir a mis mascotas', onPress: () => volver('/mascotas') }}
        />
      );
    }
    if (!invitacion || cargando) return <Cargando />;
    if (yaAsignada) {
      return (
        <EstadoVacio
          icon="how-to-reg"
          titulo={`Ya estás asignado a ${yaAsignada.nombre}`}
          mensaje="Este código es para sumar a otra persona. Podés reenviárselo a quien corresponda."
          accion={{ titulo: `Ver a ${yaAsignada.nombre}`, onPress: () => irAMascota(yaAsignada.id) }}
        />
      );
    }

    const rol = rolMascota(invitacion.rol);
    return (
      <>
        <View style={styles.card}>
          <View style={styles.fotoSombra}>
            <Avatar
              foto={invitacion.mascota.foto}
              nombre={invitacion.mascota.nombre}
              size={FOTO}
              borderColor={colors.surfaceContainerLowest}
            />
          </View>
          <Text style={styles.te}>Te invitaron a sumar a</Text>
          <Text style={styles.nombre}>{invitacion.mascota.nombre}</Text>
          <Chip label={invitacion.mascota.raza} size="md" />
        </View>

        <View style={styles.rolCard}>
          <View style={styles.rolFila}>
            <MaterialIcons name="badge" size={sizes.iconMd} color={colors.primary} />
            <Text style={styles.rolTitulo}>Vas a quedar como</Text>
            <Badge label={rol.label} tone={invitacion.rol === 'dueno' ? 'teal' : 'neutral'} />
          </View>
          <Text style={styles.rolDescripcion}>{rol.descripcion}</Text>
          <Text style={styles.rolDescripcion}>Podés desasignarte cuando quieras desde tu perfil.</Text>
          <Text style={styles.unSoloUso}>Es de un solo uso.</Text>
        </View>

        <PrimaryButton
          title={`Aceptar a ${invitacion.mascota.nombre}`}
          icon="check"
          iconLeft
          onPress={handleAceptar}
          loading={aceptando}
        />
        <PrimaryButton
          title="Ahora no"
          variant="outline"
          onPress={() => volver('/mascotas')}
        />
      </>
    );
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Asignación de mascota" variant="bar" fallback="/mascotas" enModal />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.stackLg }]}
        showsVerticalScrollIndicator={false}
      >
        {contenido()}
      </ScrollView>
    </View>
  );
}

// --- Estilos ---
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    flexGrow: 1,
    gap: spacing.stackMd,
    paddingHorizontal: spacing.containerMargin,
    paddingTop: spacing.stackMd,
  },
  card: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.stackMd,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLowest,
    ...shadows.level1,
  },
  fotoSombra: {
    borderRadius: radius.full,
    marginBottom: spacing.sm,
    ...shadows.level2,
  },
  te: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  nombre: {
    ...typography.headlineXl,
    color: colors.primary,
    textAlign: 'center',
  },
  rolCard: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.tealLight10,
  },
  rolFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rolTitulo: {
    ...typography.labelMd,
    color: colors.onSurface,
  },
  rolDescripcion: {
    ...typography.bodySm,
    color: colors.onSurface,
  },
  unSoloUso: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
  },
});
