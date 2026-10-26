/**
 * Pantalla Mi Perfil.
 *
 * Datos del usuario (foto editable con la cámara o la galería, nombre, ubicación y
 * cantidad de mascotas), contacto de emergencia, familia y cuidadores de cada
 * mascota, menú de opciones y cierre de sesión. Una cuenta recién creada no
 * tiene ubicación ni teléfono: en su lugar se invita a completarlos.
 *
 * Asignación de mascotas: un dueño genera un código con un rol (Dueño /
 * Invitado) desde la card de cada mascota; cualquiera puede desasignarse
 * (salvo el último dueño); y "Tengo un código de asignación" permite cargar
 * el código recibido para abrir la pantalla de aceptación.
 *
 * Háptica: al desasignarse vibra con `expo-haptics` para confirmar que salió
 * bien (o avisar que falló). No pide permisos.
 */
import { MaterialIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Badge } from '@/components/Badge';
import { Cargando, EstadoVacio } from '@/components/EstadoVista';
import { FormModal } from '@/components/FormModal';
import { AvisoPermisoFoto } from '@/components/AvisoPermisoFoto';
import { FotoEditable } from '@/components/FotoEditable';
import { Input } from '@/components/Input';
import { MenuRow } from '@/components/MenuRow';
import { ContactoEmergencia } from '@/components/perfil/ContactoEmergencia';
import { CuidadoresMascota } from '@/components/perfil/CuidadoresMascota';
import { EditarPerfilForm } from '@/components/perfil/EditarPerfilForm';
import { InvitarForm } from '@/components/perfil/InvitarForm';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SectionTitle } from '@/components/SectionTitle';
import { GUIA_PASEO_URL } from '@/config';
import { useApp } from '@/context/AppContext';
import { useFototeca } from '@/hooks/useFototeca';
import { useRefresco } from '@/hooks/useRefresco';
import { colors, radius, shadows, sizes, spacing, typography } from '@/theme';
import type { Mascota } from '@/types/models';
import { codigoDeTexto } from '@/utils/invitaciones';
import { LIMITES } from '@/utils/validaciones';

/** Versión que se muestra en el pie (sale de app.json). */
const VERSION = Constants.expoConfig?.version ?? '1.0.0';

/** Diámetro de la foto de perfil. */
const FOTO = 96;
/** Espera a que se cierre la hoja antes de abrir el modal de asignación (en iOS no se pueden pisar). */
const ESPERA_CIERRE_HOJA_MS = 300;

/** Hoja de asignación abierta. */
type HojaAsignacion = 'invitar' | 'desasignar' | 'codigo' | null;

/**
 * Pantalla de perfil del usuario.
 * @returns el perfil
 */
export default function PerfilScreen() {
  const {
    usuario,
    mascotas,
    cuidadores,
    reportes,
    error,
    recargar,
    actualizarUsuario,
    desasignarme,
    cerrarSesion,
  } = useApp();
  const refresco = useRefresco();
  const fototeca = useFototeca();

  // --- Estado ---
  const [editando, setEditando] = useState(false);
  /** true mientras se sube y guarda la foto de perfil: la foto queda con el spinner y no se puede tocar. */
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [hoja, setHoja] = useState<HojaAsignacion>(null);
  // La mascota de la hoja se guarda aparte para que no quede vacía mientras se cierra.
  const [mascotaHoja, setMascotaHoja] = useState<Mascota | null>(null);
  const [textoCodigo, setTextoCodigo] = useState('');
  const [errorCodigo, setErrorCodigo] = useState<string | undefined>(undefined);
  const [desasignando, setDesasignando] = useState(false);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);

  // --- Datos derivados ---
  const reportesActivos = useMemo(
    () => reportes.filter((r) => r.autorId === usuario?.id && r.estado === 'perdido').length,
    [reportes, usuario?.id],
  );

  // --- Handlers ---
  /**
   * Guarda una imagen como foto de perfil (el contexto la sube primero al servidor).
   * @param uri foto sacada o elegida
   */
  const guardarFoto = async (uri: string) => {
    setSubiendoFoto(true);
    try {
      await actualizarUsuario({ foto: uri });
    } catch (e) {
      Alert.alert('No se pudo cambiar la foto', e instanceof Error ? e.message : 'Intentá de nuevo.');
    } finally {
      setSubiendoFoto(false);
    }
  };

  /** Pregunta si sacar una foto o elegirla de la galería y la pone como foto de perfil. */
  const handleFoto = async () => {
    try {
      const uri = await fototeca.pedirFoto();
      if (uri) await guardarFoto(uri);
    } catch {
      Alert.alert('No se pudo conseguir la foto', 'Probá de nuevo en unos segundos.');
    }
  };

  /**
   * Abre una hoja de asignación para una mascota.
   * @param tipo hoja a abrir
   * @returns el handler que recibe la mascota
   */
  const abrirHoja = (tipo: 'invitar' | 'desasignar') => (mascota: Mascota) => {
    setMascotaHoja(mascota);
    setHoja(tipo);
  };

  /** Cierra la hoja de asignación abierta. */
  const cerrarHoja = () => setHoja(null);

  /**
   * true si el usuario es el único dueño de la mascota (entonces no puede desasignarse).
   * @param mascota mascota a revisar
   */
  const esUnicoDueno = (mascota: Mascota) => {
    const duenos = cuidadores.filter((c) => c.mascotaId === mascota.id && c.rol === 'dueno');
    return duenos.length === 1 && duenos[0].usuarioId === usuario?.id;
  };

  /**
   * Desasigna al usuario de la mascota de la hoja (ya confirmado en la hoja):
   * la mascota sale de su cuenta, vibra y se cierra la hoja. Si el servidor
   * no lo deja (por ejemplo, quedó como único dueño), muestra su mensaje.
   */
  const handleDesasignarme = async () => {
    if (!mascotaHoja) return;
    setDesasignando(true);
    try {
      await desasignarme(mascotaHoja.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setHoja(null);
      Alert.alert('Listo', `${mascotaHoja.nombre} ya no está en tu cuenta.`);
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('No se pudo desasignar', e instanceof Error ? e.message : 'Intentá de nuevo.');
    } finally {
      setDesasignando(false);
    }
  };

  /** Lee el código cargado y abre la pantalla para aceptarlo. */
  const handleAbrirCodigo = () => {
    const token = codigoDeTexto(textoCodigo);
    if (!token) {
      setErrorCodigo('Ingresá el código de 8 caracteres.');
      return;
    }
    setHoja(null);
    setTextoCodigo('');
    setTimeout(
      () => router.push({ pathname: '/asignar', params: { token } }),
      ESPERA_CIERRE_HOJA_MS,
    );
  };

  /** Abre en el navegador la página oficial de la Ciudad con las reglas de paseo. */
  const abrirGuiaPaseo = async () => {
    try {
      await Linking.openURL(GUIA_PASEO_URL);
    } catch {
      Alert.alert('No se pudo abrir la página', `Podés entrar desde el navegador: ${GUIA_PASEO_URL}`);
    }
  };

  /**
   * Cierra la sesión (en el servidor y en el celular, con todo el estado) y
   * vuelve al login sin dejar historial.
   */
  const handleCerrarSesion = async () => {
    setCerrandoSesion(true);
    await cerrarSesion();
    router.replace('/login');
  };

  // --- Render ---
  // Sin usuario: si la carga falló se ofrece reintentar, si no, todavía está cargando.
  if (!usuario) {
    return (
      <View style={styles.screen}>
        <AppHeader />
        {error ? (
          <EstadoVacio
            icon="cloud-off"
            titulo="No pudimos cargar tu perfil"
            mensaje={error}
            accion={{ titulo: 'Reintentar', onPress: recargar }}
          />
        ) : (
          <Cargando />
        )}
      </View>
    );
  }

  const cantidadMascotas =
    mascotas.length === 1 ? '1 Mascota registrada' : `${mascotas.length} Mascotas registradas`;

  return (
    <View style={styles.screen}>
      <AppHeader />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={refresco}
      >
        {/* 1. Datos del usuario */}
        <View style={styles.perfilCard}>
          <View style={styles.degrade} pointerEvents="none" />
          <FotoEditable
            foto={usuario.foto}
            nombre={usuario.nombre}
            onPress={handleFoto}
            cargando={fototeca.eligiendo || subiendoFoto}
            size={FOTO}
          />
          <AvisoPermisoFoto
            fototeca={fototeca}
            motivo="Tu foto ayuda a que te reconozcan quienes cuidan a tus mascotas."
            onFoto={guardarFoto}
            compacto
          />
          <Text style={styles.nombre}>
            {usuario.nombre} {usuario.apellido}
          </Text>
          <View style={styles.ubicacion}>
            <MaterialIcons name="location-on" size={sizes.iconSm} color={colors.primary} />
            <Text style={styles.ubicacionTexto}>
              {usuario.ubicacion || 'Agregá tu barrio'}
            </Text>
          </View>
          <View style={styles.mascotasBadge}>
            <MaterialIcons name="pets" size={sizes.iconSm} color={colors.primary} />
            <Text style={styles.mascotasTexto}>{cantidadMascotas}</Text>
          </View>
          <PrimaryButton
            title="Editar datos personales"
            icon="edit"
            iconLeft
            variant="tonal"
            size="sm"
            onPress={() => setEditando(true)}
            style={styles.editar}
          />
        </View>

        {/* 2. Contacto de emergencia */}
        <View style={styles.seccion}>
          <SectionTitle
            icon="shield"
            titulo="Contacto de Emergencia"
            iconoFondo={colors.tertiaryFixed}
            iconoColor={colors.onTertiaryFixed}
            derecha={<Badge label="VITAL" tone="mustard" />}
          />
          <ContactoEmergencia usuario={usuario} />
        </View>

        {/* 3. Familia y cuidadores */}
        <View style={styles.seccion}>
          <SectionTitle
            icon="group"
            titulo="Familia y Cuidadores"
            derecha={
              <Badge
                label={mascotas.length === 1 ? '1 mascota' : `${mascotas.length} mascotas`}
                tone="neutral"
              />
            }
          />
          <Text style={styles.seccionAyuda}>
            Personas asignadas a cada perrito. Los dueños pueden sumar a otras personas con un
            código; los invitados, no. Cualquiera puede desasignarse.
          </Text>
          {mascotas.map((mascota) => (
            <CuidadoresMascota
              key={mascota.id}
              mascota={mascota}
              cuidadores={cuidadores.filter((c) => c.mascotaId === mascota.id)}
              usuario={usuario}
              onAsignar={abrirHoja('invitar')}
              onDesasignarme={abrirHoja('desasignar')}
            />
          ))}
        </View>

        {/* 4. Menú */}
        <View style={styles.menu}>
          <MenuRow
            icon="campaign"
            titulo="Mis reportes activos"
            badge={reportesActivos === 1 ? '1 activo' : `${reportesActivos} activos`}
            onPress={() => router.navigate('/perdidos')}
          />
          <View style={styles.separador} />
          <MenuRow
            icon="vpn-key"
            titulo="Tengo un código de asignación"
            subtitulo="Cargá el código que te mandaron para sumar una mascota."
            onPress={() => {
              setErrorCodigo(undefined);
              setHoja('codigo');
            }}
          />
          <View style={styles.separador} />
          <MenuRow
            icon="menu-book"
            titulo="Guía de paseos y normativas CABA"
            subtitulo="Correa, bozal, chapita, caca y caniles. Web oficial de la Ciudad."
            derecha={<MaterialIcons name="open-in-new" size={sizes.iconSm} color={colors.onSurfaceVariant} />}
            onPress={abrirGuiaPaseo}
          />
        </View>

        <PrimaryButton
          title="Cerrar sesión"
          icon="logout"
          iconLeft
          variant="danger"
          size="sm"
          onPress={handleCerrarSesion}
          loading={cerrandoSesion}
          style={styles.cerrar}
        />
        <Text style={styles.version}>Doggy v{VERSION}</Text>
      </ScrollView>

      <FormModal visible={editando} titulo="Datos personales" onClose={() => setEditando(false)}>
        <EditarPerfilForm usuario={usuario} onGuardado={() => setEditando(false)} />
      </FormModal>

      {/* Generar un código de asignación (solo dueños llegan acá). */}
      <FormModal
        visible={hoja === 'invitar'}
        titulo={`Asignar a ${mascotaHoja?.nombre ?? ''}`}
        onClose={cerrarHoja}
      >
        {mascotaHoja && <InvitarForm key={mascotaHoja.id} mascota={mascotaHoja} />}
      </FormModal>

      {/* Confirmar la desasignación. */}
      <FormModal
        visible={hoja === 'desasignar'}
        titulo={`¿Desasignarte de ${mascotaHoja?.nombre ?? ''}?`}
        onClose={cerrarHoja}
      >
        {mascotaHoja && esUnicoDueno(mascotaHoja) ? (
          <>
            <Text style={styles.hojaTexto}>
              Sos el único dueño de {mascotaHoja.nombre}. Para desasignarte, primero sumá a otra
              persona como dueña con un código de asignación.
            </Text>
            <PrimaryButton title="Entendido" variant="outline" onPress={cerrarHoja} />
          </>
        ) : (
          <>
            <Text style={styles.hojaTexto}>
              {mascotaHoja?.nombre} va a salir de tu cuenta junto con su carnet y sus turnos. Las
              demás personas asignadas la siguen teniendo. Para volver, vas a necesitar un código nuevo.
            </Text>
            <PrimaryButton
              title="Desasignarme"
              icon="person-remove"
              iconLeft
              variant="danger"
              onPress={handleDesasignarme}
              loading={desasignando}
            />
            <PrimaryButton
              title="Cancelar"
              variant="outline"
              onPress={cerrarHoja}
              disabled={desasignando}
            />
          </>
        )}
      </FormModal>

      {/* Cargar un código recibido. */}
      <FormModal visible={hoja === 'codigo'} titulo="Tengo un código de asignación" onClose={cerrarHoja}>
        <Input
          label="Código"
          icon="vpn-key"
          placeholder="Ej: TOBY2026"
          value={textoCodigo}
          onChangeText={(texto) => {
            setTextoCodigo(texto);
            setErrorCodigo(undefined);
          }}
          error={errorCodigo}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={LIMITES.codigoAsignacion}
          returnKeyType="go"
          onSubmitEditing={handleAbrirCodigo}
        />
        <PrimaryButton title="Ver invitación" icon="arrow-forward" onPress={handleAbrirCodigo} />
      </FormModal>
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
    gap: spacing.stackMd,
    paddingHorizontal: spacing.containerMargin,
    paddingTop: spacing.stackMd,
    paddingBottom: spacing.stackLg,
  },
  perfilCard: {
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.stackMd,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLowest,
    overflow: 'hidden',
    ...shadows.level1,
  },
  degrade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: colors.secondaryContainer20,
  },
  nombre: {
    ...typography.headlineMd,
    fontFamily: typography.headlineLg.fontFamily,
    color: colors.onSurface,
    marginTop: spacing.stackSm,
    textAlign: 'center',
  },
  ubicacion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  ubicacionTexto: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
  },
  mascotasBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.stackSm,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    backgroundColor: colors.secondaryContainer30,
  },
  mascotasTexto: {
    ...typography.labelMd,
    color: colors.primary,
  },
  editar: {
    alignSelf: 'stretch',
    marginTop: spacing.md,
    borderRadius: radius.md,
  },
  seccion: {
    gap: spacing.stackSm,
  },
  seccionAyuda: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    paddingHorizontal: spacing.xs,
  },
  menu: {
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLowest,
    overflow: 'hidden',
    ...shadows.level1,
  },
  separador: {
    height: sizes.borderWidth,
    marginHorizontal: spacing.containerMargin,
    backgroundColor: colors.surfaceContainerHigh,
  },
  cerrar: {
    alignSelf: 'center',
  },
  version: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  hojaTexto: {
    ...typography.bodyMd,
    color: colors.onSurface,
  },
});
