/**
 * Pantalla Agenda: calendario mensual con los turnos de las mascotas.
 *
 * El calendario marca con puntos de color los días con turnos (una categoría
 * por color). Al elegir un día se listan sus turnos debajo. "Nuevo turno"
 * abre un formulario que agrega el turno al contexto y selecciona su día; el
 * lápiz de cada turno abre el mismo formulario con sus datos para editarlo
 * (o eliminarlo). Deslizar un turno a la izquierda también deja eliminarlo.
 */
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Calendario } from '@/components/agenda/Calendario';
import { TurnoCard } from '@/components/agenda/TurnoCard';
import { TurnoForm } from '@/components/agenda/TurnoForm';
import { AppHeader } from '@/components/AppHeader';
import { Badge } from '@/components/Badge';
import { EstadoVacio } from '@/components/EstadoVista';
import { FormModal } from '@/components/FormModal';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useApp } from '@/context/AppContext';
import { useRefresco } from '@/hooks/useRefresco';
import { colors, spacing, typography } from '@/theme';
import type { CategoriaTurno, Turno } from '@/types/models';
import { claveDeIso, claveDia, mismoDia, sumarMes, textoDiaCompleto } from '@/utils/calendario';
import { hoy as hoyLocal, parsearFecha } from '@/utils/fechas';

/**
 * Pantalla de la agenda.
 * @returns el calendario y los turnos del día elegido
 */
export default function AgendaScreen() {
  const { turnos, mascotas, error, recargar } = useApp();
  const refresco = useRefresco();
  const hoy = useMemo(() => hoyLocal(), []);

  // --- Estado ---
  const [visible, setVisible] = useState({ anio: hoy.getFullYear(), mes: hoy.getMonth() });
  const [seleccionado, setSeleccionado] = useState<Date>(hoy);
  const [formVisible, setFormVisible] = useState(false);
  /** Turno que se está editando; null si el formulario es de alta. */
  const [editando, setEditando] = useState<Turno | null>(null);

  // --- Datos derivados ---
  /** Turnos agrupados por día (AAAA-MM-DD) y ordenados por hora. */
  const turnosPorDia = useMemo(() => {
    const grupos: Record<string, Turno[]> = {};
    for (const turno of turnos) {
      const clave = claveDeIso(turno.fecha);
      grupos[clave] = [...(grupos[clave] ?? []), turno];
    }
    for (const clave of Object.keys(grupos)) {
      grupos[clave] = grupos[clave].sort(
        (a, b) => parsearFecha(a.fecha).getTime() - parsearFecha(b.fecha).getTime(),
      );
    }
    return grupos;
  }, [turnos]);

  /** Categorías distintas de cada día, para los puntos del calendario. */
  const categoriasPorDia = useMemo(() => {
    const resultado: Record<string, CategoriaTurno[]> = {};
    for (const [clave, lista] of Object.entries(turnosPorDia)) {
      resultado[clave] = Array.from(new Set(lista.map((t) => t.categoria)));
    }
    return resultado;
  }, [turnosPorDia]);

  const nombres = useMemo(
    () => Object.fromEntries(mascotas.map((m) => [m.id, m.nombre])),
    [mascotas],
  );
  const delDia = turnosPorDia[claveDia(seleccionado)] ?? [];
  const esHoy = mismoDia(seleccionado, hoy);

  // --- Handlers ---
  /**
   * Cambia de mes y selecciona hoy (si cae en ese mes) o el día 1.
   * @param delta +1 o -1
   */
  const handleCambiarMes = (delta: number) => {
    const siguiente = sumarMes(visible.anio, visible.mes, delta);
    setVisible(siguiente);
    const contieneHoy = hoy.getFullYear() === siguiente.anio && hoy.getMonth() === siguiente.mes;
    setSeleccionado(contieneHoy ? hoy : new Date(siguiente.anio, siguiente.mes, 1));
  };

  /** Cierra el formulario y muestra el día del turno guardado (pudo cambiar de fecha). */
  const handleGuardado = useCallback((turno: Turno) => {
    setFormVisible(false);
    setEditando(null);
    const dia = parsearFecha(turno.fecha);
    setVisible({ anio: dia.getFullYear(), mes: dia.getMonth() });
    setSeleccionado(new Date(dia.getFullYear(), dia.getMonth(), dia.getDate()));
  }, []);

  /** Abre el formulario de nuevo turno. */
  const abrirAlta = () => {
    setEditando(null);
    setFormVisible(true);
  };

  /** Abre el formulario con los datos del turno tocado. */
  const abrirEdicion = useCallback((turno: Turno) => {
    setEditando(turno);
    setFormVisible(true);
  }, []);

  /** Cierra el formulario sin guardar. */
  const cerrarFormulario = () => {
    setFormVisible(false);
    setEditando(null);
  };

  // --- Render ---
  return (
    <View style={styles.screen}>
      <AppHeader />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={refresco}
      >
        <View style={styles.encabezado}>
          <View style={styles.encabezadoTexto}>
            <Text style={styles.titulo}>Agenda</Text>
            <Text style={styles.subtitulo}>Turnos y cuidados del mes</Text>
          </View>
          <PrimaryButton
            title="Nuevo turno"
            icon="add"
            iconLeft
            size="sm"
            onPress={abrirAlta}
          />
        </View>

        <Calendario
          anio={visible.anio}
          mes={visible.mes}
          seleccionado={seleccionado}
          hoy={hoy}
          categoriasPorDia={categoriasPorDia}
          onSeleccionar={setSeleccionado}
          onCambiarMes={handleCambiarMes}
        />

        <View style={styles.dia}>
          <View style={styles.diaHeader}>
            <Text style={styles.diaTitulo}>{textoDiaCompleto(seleccionado)}</Text>
            <View style={styles.diaMeta}>
              {esHoy && <Badge label="Hoy" />}
              <Text style={styles.cantidad}>
                {delDia.length === 1 ? '1 turno' : `${delDia.length} turnos`}
              </Text>
            </View>
          </View>

          {delDia.length === 0 && error ? (
            <EstadoVacio
              icon="cloud-off"
              titulo="No pudimos cargar tus turnos"
              mensaje={error}
              accion={{ titulo: 'Reintentar', onPress: recargar }}
            />
          ) : delDia.length === 0 ? (
            <EstadoVacio
              icon="event-available"
              titulo="Sin turnos este día"
              mensaje="Elegí otro día marcado en el calendario o agendá uno nuevo."
              accion={{ titulo: 'Agendar turno', onPress: abrirAlta }}
            />
          ) : (
            delDia.map((turno) => (
              <TurnoCard
                key={turno.id}
                turno={turno}
                mascota={nombres[turno.mascotaId] ?? 'Mascota'}
                onEditar={abrirEdicion}
              />
            ))
          )}
        </View>
      </ScrollView>

      <FormModal
        visible={formVisible}
        titulo={editando ? 'Editar turno' : 'Nuevo turno'}
        onClose={cerrarFormulario}
      >
        {/* key: al pasar de un turno a otro (o al alta) el formulario arranca de cero. */}
        <TurnoForm
          key={editando?.id ?? 'nuevo'}
          diaInicial={seleccionado}
          turno={editando ?? undefined}
          onGuardado={handleGuardado}
          onBorrado={cerrarFormulario}
        />
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
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.stackSm,
  },
  encabezadoTexto: {
    flex: 1,
  },
  titulo: {
    ...typography.headlineLgMobile,
    color: colors.primary,
  },
  subtitulo: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
  },
  dia: {
    gap: spacing.stackSm,
  },
  diaHeader: {
    gap: spacing.xs,
  },
  diaTitulo: {
    ...typography.headlineMd,
    fontFamily: typography.headlineLg.fontFamily,
    color: colors.onSurface,
  },
  diaMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cantidad: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
  },
});
