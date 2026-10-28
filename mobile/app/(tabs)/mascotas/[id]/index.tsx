/**
 * Perfil de la mascota.
 *
 * Toma la mascota del contexto según el `id` de la ruta y muestra su foto,
 * raza y edad, el botón para editar sus datos, el QR de identificación para la placa del collar, las señas
 * particulares, un resumen del carnet sanitario y de los turnos, y el acceso
 * para reportarla como perdida ("Se perdió mi mascota", con sus datos ya cargados).
 * Si tiene un reporte de pérdida activo, en lugar de ese botón muestra el aviso
 * con la zona y el radio de búsqueda, "Editar reporte" y "Ya apareció" ("Ya
 * volvió a casa" si alguien la encontró).
 * Si alguien avisó que la encontró, arriba de todo aparece el aviso
 * (`AvisoEncontrada`): "¡Encontraron a …!" con "Ya volvió a casa" si estaba
 * perdida, o "¿Se perdió …?" con "Sí, se perdió" y "No, está conmigo" si no.
 * Al final, solo para un dueño, "Eliminar mascota" (en rojo) abre el doble
 * chequeo (`EliminarMascota`); al borrarla se vuelve a Mis Mascotas.
 */
import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Avatar } from '@/components/Avatar';
import { Chip } from '@/components/Chip';
import { Cargando, EstadoVacio } from '@/components/EstadoVista';
import { AvisoEncontrada } from '@/components/mascotas/AvisoEncontrada';
import { EliminarMascota } from '@/components/mascotas/EliminarMascota';
import { PrimaryButton } from '@/components/PrimaryButton';
import { QrIdentificacion } from '@/components/QrIdentificacion';
import { SectionCard } from '@/components/SectionCard';
import { useApp } from '@/context/AppContext';
import { useCerrarReporte } from '@/hooks/useCerrarReporte';
import { useRefresco } from '@/hooks/useRefresco';
import { colors, radius, shadows, sizes, spacing, typography } from '@/theme';
import { botonCierre, textoEdad } from '@/utils/etiquetas';
import { formatearFecha, formatearHora, tiempoTranscurrido } from '@/utils/fechas';
import { textoRadio } from '@/utils/mapa';
import { volver } from '@/utils/navegacion';
import {
  avisoDeMascota,
  buscarMascota,
  proximoTurno,
  reporteActivo,
  ultimaVacuna,
} from '@/utils/selectores';

/** Diámetro de la foto principal. */
const FOTO = 128;

/**
 * Pantalla de perfil de una mascota.
 * @returns el perfil, o un estado de carga / no encontrada
 */
export default function PerfilMascotaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { usuario, mascotas, registros, turnos, reportes, cuidadores, cargando, error, recargar } = useApp();
  const [eliminarVisible, setEliminarVisible] = useState(false);
  const { cerrando, pedirCierre } = useCerrarReporte();
  const refresco = useRefresco();

  // --- Datos derivados ---
  const mascota = useMemo(() => buscarMascota(mascotas, id), [mascotas, id]);
  const vacuna = useMemo(
    () => (mascota ? ultimaVacuna(registros, mascota.id) : undefined),
    [registros, mascota],
  );
  const turno = useMemo(
    () => (mascota ? proximoTurno(turnos, mascota.id) : undefined),
    [turnos, mascota],
  );
  const reporte = useMemo(
    () => (mascota ? reporteActivo(reportes, mascota.id) : undefined),
    [reportes, mascota],
  );
  const aviso = useMemo(
    () => (mascota ? avisoDeMascota(reportes, mascota.id) : undefined),
    [reportes, mascota],
  );
  /** Personas asignadas a la mascota: si el usuario es dueño y quiénes más la tienen. */
  const asignados = useMemo(
    () => (mascota ? cuidadores.filter((c) => c.mascotaId === mascota.id) : []),
    [cuidadores, mascota],
  );
  const esDueno = asignados.some((c) => c.usuarioId === usuario?.id && c.rol === 'dueno');
  const otros = asignados.filter((c) => c.usuarioId !== usuario?.id);

  // --- Handlers ---
  /** Abre el formulario para editar los datos de la mascota. */
  const editarMascota = () => {
    if (!mascota) return;
    router.push({ pathname: '/mascotas/[id]/editar', params: { id: String(mascota.id) } });
  };

  /** Abre el carnet sanitario completo. */
  const verCarnet = () => {
    if (!mascota) return;
    router.push({ pathname: '/mascotas/[id]/carnet', params: { id: String(mascota.id) } });
  };

  /** Cambia a la tab Agenda. */
  const irAgenda = () => router.navigate('/agenda');

  /** Abre "Se perdió mi mascota" con esta mascota ya elegida. */
  const reportarPerdida = () => {
    if (!mascota) return;
    router.push({ pathname: '/mi-mascota-perdida', params: { mascotaId: String(mascota.id) } });
  };

  /** Abre el reporte activo en modo edición (punto, radio, información). */
  const editarReporte = () => {
    if (!reporte) return;
    router.push({ pathname: '/mi-mascota-perdida', params: { reporteId: String(reporte.id) } });
  };

  // --- Render ---
  if (!mascota) {
    return (
      <View style={styles.screen}>
        <AppHeader backTo="/mascotas" />
        {cargando ? (
          <Cargando />
        ) : error ? (
          <EstadoVacio
            icon="cloud-off"
            titulo="No pudimos cargar tus mascotas"
            mensaje={error}
            accion={{ titulo: 'Reintentar', onPress: recargar }}
          />
        ) : (
          <EstadoVacio
            icon="search-off"
            titulo="No encontramos esta mascota"
            mensaje="Puede que se haya borrado o que el link no sea correcto."
            accion={{ titulo: 'Volver a mis mascotas', onPress: () => volver('/mascotas') }}
          />
        )}
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <AppHeader backTo="/mascotas" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={refresco}
      >
        {aviso && <AvisoEncontrada aviso={aviso} />}

        {/* Hero: foto, nombre, raza y edad */}
        <View style={styles.hero}>
          <View style={styles.fotoSombra}>
            <Avatar
              foto={mascota.foto}
              nombre={mascota.nombre}
              size={FOTO}
              borderColor={colors.surfaceContainerLowest}
            />
          </View>
          <Text style={styles.nombre}>{mascota.nombre}</Text>
          <View style={styles.chips}>
            <Chip label={mascota.raza} size="md" />
            <Chip label={textoEdad(mascota.fechaNacimiento)} size="md" />
          </View>
          <PrimaryButton
            title="Editar mascota"
            icon="edit"
            iconLeft
            variant="outline"
            size="sm"
            onPress={editarMascota}
            style={styles.editar}
          />
        </View>

        <QrIdentificacion mascota={mascota} />

        {/* Señas particulares */}
        <View style={styles.senas}>
          <MaterialIcons name="info" size={sizes.iconMd} color={colors.tertiaryContainer} />
          <View style={styles.senasTexto}>
            <Text style={styles.senasLabel}>Señas Particulares</Text>
            <Text style={styles.senasValor}>{mascota.senas}</Text>
          </View>
        </View>

        {/* Carnet sanitario */}
        <SectionCard
          onPress={verCarnet}
          footer="Ver historial completo"
          accessibilityLabel="Carnet sanitario. Ver historial completo"
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitulo}>Carnet Sanitario</Text>
            <View style={[styles.iconCircle, styles.iconCircleTeal]}>
              <MaterialIcons name="vaccines" size={sizes.iconMd} color={colors.primary} />
            </View>
          </View>
          <View style={styles.resumen}>
            <View style={styles.resumenFila}>
              <Text style={styles.resumenLabel}>ÚLTIMA VACUNA</Text>
              <Text style={styles.resumenValor} numberOfLines={1}>
                {vacuna?.nombre ?? 'Sin registros'}
              </Text>
            </View>
            {vacuna && (
              <View style={styles.fecha}>
                <MaterialIcons name="calendar-today" size={16} color={colors.onSurfaceVariant} />
                <Text style={styles.fechaTexto}>{formatearFecha(vacuna.fecha)}</Text>
              </View>
            )}
          </View>
        </SectionCard>

        {/* Turnos */}
        <SectionCard
          tone="mustard"
          onPress={irAgenda}
          footer="Ir a la Agenda de Turnos"
          accessibilityLabel="Turnos. Ir a la agenda"
        >
          <View style={styles.turnosHeader}>
            <View style={[styles.iconCircle, styles.iconCircleMustard]}>
              <MaterialIcons name="calendar-month" size={sizes.iconMd} color={colors.tertiaryContainer} />
            </View>
            <View style={styles.turnosTexto}>
              <Text style={[styles.cardTitulo, styles.cardTituloMustard]}>Turnos</Text>
              <Text style={styles.turnosSub}>
                {turno
                  ? `Próximo: ${turno.motivo} · ${formatearFecha(turno.fecha)} ${formatearHora(turno.fecha)}`
                  : 'Gestioná y agendá visitas veterinarias'}
              </Text>
            </View>
          </View>
        </SectionCard>

        {reporte ? (
          <View style={styles.perdida} accessibilityLiveRegion="polite">
            <View style={styles.perdidaHeader}>
              <MaterialIcons name="campaign" size={sizes.iconMd} color={colors.tertiaryContainer} />
              <Text style={styles.perdidaTitulo}>Reporte de pérdida activo</Text>
            </View>
            <Text style={styles.perdidaTexto}>
              {`Desde ${tiempoTranscurrido(reporte.fecha).toLowerCase()} · ${reporte.zona}`}
              {reporte.radioMetros ? ` · radio ${textoRadio(reporte.radioMetros)}` : ''}
            </Text>
            <View style={styles.perdidaAcciones}>
              <PrimaryButton
                title="Editar reporte"
                icon="edit"
                iconLeft
                variant="outline"
                size="sm"
                onPress={editarReporte}
                disabled={cerrando}
                style={styles.perdidaBoton}
              />
              <PrimaryButton
                title={botonCierre(aviso?.tipo === 'reencuentro').texto}
                icon={botonCierre(aviso?.tipo === 'reencuentro').icono}
                iconLeft
                size="sm"
                onPress={() => pedirCierre(reporte)}
                loading={cerrando}
                style={styles.perdidaBoton}
              />
            </View>
          </View>
        ) : (
          <PrimaryButton
            title="Reportar pérdida"
            icon="campaign"
            variant="secondary"
            onPress={reportarPerdida}
          />
        )}

        {esDueno && (
          <PrimaryButton
            title="Eliminar mascota"
            icon="delete-outline"
            iconLeft
            variant="danger"
            size="sm"
            onPress={() => setEliminarVisible(true)}
            style={styles.eliminar}
          />
        )}
      </ScrollView>

      {esDueno && (
        <EliminarMascota
          visible={eliminarVisible}
          mascota={mascota}
          otros={otros}
          onClose={() => setEliminarVisible(false)}
          onEliminada={() => {
            setEliminarVisible(false);
            router.dismissTo('/mascotas');
          }}
        />
      )}
    </View>
  );
}

// --- Estilos ---
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    gap: spacing.stackMd,
    paddingHorizontal: spacing.containerMargin,
    paddingTop: spacing.stackMd,
    paddingBottom: spacing.stackLg,
  },
  hero: {
    alignItems: 'center',
  },
  fotoSombra: {
    borderRadius: radius.full,
    marginBottom: spacing.md,
    ...shadows.level2,
  },
  nombre: {
    ...typography.headlineXl,
    color: colors.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  editar: {
    marginTop: spacing.stackSm,
    paddingHorizontal: spacing.lg,
  },
  senas: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.stackSm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLowest,
    ...shadows.level1,
  },
  senasTexto: {
    flex: 1,
    gap: spacing.xs,
  },
  senasLabel: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
  },
  senasValor: {
    ...typography.bodyMd,
    color: colors.onBackground,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitulo: {
    ...typography.headlineMd,
    color: colors.primary,
  },
  cardTituloMustard: {
    color: colors.tertiaryContainer,
  },
  iconCircle: {
    width: sizes.avatarSm + 4,
    height: sizes.avatarSm + 4,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleTeal: {
    backgroundColor: colors.primaryFixed,
  },
  iconCircleMustard: {
    backgroundColor: colors.tertiaryFixed,
  },
  resumen: {
    gap: spacing.sm,
    padding: spacing.stackSm,
    borderRadius: radius.md,
    borderWidth: sizes.borderWidth,
    borderColor: colors.surfaceContainerHigh,
    backgroundColor: colors.background,
  },
  resumenFila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  resumenLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  resumenValor: {
    ...typography.labelMd,
    color: colors.primary,
    flexShrink: 1,
  },
  fecha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  fechaTexto: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
  },
  turnosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackSm,
  },
  turnosTexto: {
    flex: 1,
  },
  turnosSub: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
  },
  perdida: {
    gap: spacing.stackSm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.tertiaryContainer10,
  },
  perdidaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  perdidaTitulo: {
    ...typography.labelMd,
    color: colors.tertiaryContainer,
  },
  perdidaTexto: {
    ...typography.bodySm,
    color: colors.onSurface,
  },
  perdidaAcciones: {
    flexDirection: 'row',
    gap: spacing.stackSm,
  },
  perdidaBoton: {
    flex: 1,
  },
  eliminar: {
    alignSelf: 'center',
    marginTop: spacing.stackMd,
  },
});
