/**
 * Formulario de un registro del carnet sanitario: tipo, nombre, fecha de
 * aplicación, veterinario o clínica y, opcional, la fecha del próximo
 * refuerzo. En las vacunas se puede sumar, también opcional, la foto de la
 * etiqueta (sacada en el momento o elegida de la galería, ver `FotoEtiqueta`).
 * Todo lo que se carga es una aplicación ya hecha (no hay registros
 * pendientes). Se muestra dentro de un FormModal.
 *
 * Sirve para dar de alta y para corregir: si recibe `registro`, arranca con
 * sus datos y al guardar lo reemplaza; si no, crea uno nuevo. Al corregir
 * suma el botón "Eliminar", la alternativa tocable al swipe de la `RegistroCard`.
 * Nombre y profesional tienen largo máximo y caracteres permitidos (ver
 * `validaciones.ts`).
 */
import { useRef, useState } from 'react';
import { Alert, StyleSheet, Text, type TextInputInstance, View } from 'react-native';

import { useApp } from '@/context/AppContext';
import { useConfirmarBorrado } from '@/hooks/useConfirmarBorrado';
import { colors, spacing, typography } from '@/theme';
import type { NuevoRegistro, RegistroSanitario, TipoRegistro } from '@/types/models';
import { TIPOS_REGISTRO } from '@/utils/etiquetas';
import { enmascararFecha, fechaATexto, fechaIngresadaAIso, formatearFecha, hoy } from '@/utils/fechas';
import {
  LIMITES,
  limpiarTexto,
  validarFechaAplicacion,
  validarProximaDosis,
  validarTexto,
} from '@/utils/validaciones';
import { Chip } from '../Chip';
import { Input } from '../Input';
import { FotoEtiqueta } from './FotoEtiqueta';
import { PrimaryButton } from '../PrimaryButton';

type Props = {
  mascotaId: number;
  /** Tipo preseleccionado en el alta (el de la pestaña activa). */
  tipoInicial: TipoRegistro;
  /** Registro a corregir. Si no viene, el formulario crea uno nuevo. */
  registro?: RegistroSanitario;
  /** Se llama con el registro ya guardado. */
  onGuardado: (registro: RegistroSanitario) => void;
  /** Se llama cuando el registro que se corregía se eliminó. */
  onBorrado: () => void;
};

type Campo = 'nombre' | 'fecha' | 'profesional' | 'proximaDosis';
type Errores = Partial<Record<Campo, string>>;

/** Ejemplos de nombre según el tipo, para el placeholder. */
const EJEMPLOS: Record<TipoRegistro, string> = {
  vacuna: 'Ej: Antirrábica',
  desparasitacion: 'Ej: Pipeta antipulgas',
  otro: 'Ej: consulta, castración, análisis de sangre, medicación…',
};

/**
 * Formulario de alta o edición de registro sanitario.
 * @param props ver `Props`
 * @returns el formulario
 */
export function RegistroForm({ mascotaId, tipoInicial, registro, onGuardado, onBorrado }: Props) {
  const { agregarRegistro, editarRegistro, borrarRegistro } = useApp();
  const { borrando, pedirBorrado } = useConfirmarBorrado();

  // --- Estado ---
  // Las fechas se editan como dd/mm/aaaa: las del registro se pasan a ese formato.
  // Un registro nuevo arranca con la fecha de hoy en hora local (no con toISOString,
  // que después de las 21 en Argentina ya da el día siguiente).
  const [tipo, setTipo] = useState<TipoRegistro>(registro?.tipo ?? tipoInicial);
  const [nombre, setNombre] = useState(registro?.nombre ?? '');
  const [fecha, setFecha] = useState(() =>
    registro ? formatearFecha(registro.fecha) : fechaATexto(hoy()),
  );
  const [profesional, setProfesional] = useState(registro?.profesional ?? '');
  const [proximaDosis, setProximaDosis] = useState(
    registro?.proximaDosis ? formatearFecha(registro.proximaDosis) : '',
  );
  const [fotoEtiqueta, setFotoEtiqueta] = useState<string | null>(registro?.fotoEtiqueta ?? null);
  const [errores, setErrores] = useState<Errores>({});
  const [guardando, setGuardando] = useState(false);
  const fechaRef = useRef<TextInputInstance>(null);
  const profesionalRef = useRef<TextInputInstance>(null);
  const proximaDosisRef = useRef<TextInputInstance>(null);

  /** Textos del tipo elegido ("Próximo refuerzo", "Próxima dosis"...). */
  const textos = TIPOS_REGISTRO.find((t) => t.valor === tipo) ?? TIPOS_REGISTRO[0];

  // --- Handlers ---
  /**
   * Limpia el error de un campo cuando el usuario lo corrige.
   * @param campo campo editado
   */
  const limpiarError = (campo: Campo) => {
    if (errores[campo]) setErrores((prev) => ({ ...prev, [campo]: undefined }));
  };

  /** Valida todos los campos y devuelve los errores encontrados. */
  const validar = (): Errores => ({
    nombre: validarTexto(nombre, {
      requerido: tipo === 'otro' ? 'Describí qué se hizo.' : 'Ingresá el nombre del registro.',
      min: 3,
      max: LIMITES.nombreRegistro,
      formato: 'texto',
    }),
    fecha: validarFechaAplicacion(fecha),
    profesional: validarTexto(profesional, {
      requerido: 'Indicá el veterinario o la clínica.',
      min: 3,
      max: LIMITES.profesional,
      formato: 'texto',
    }),
    proximaDosis: validarProximaDosis(proximaDosis, fecha),
  });

  /** Valida y guarda el registro (nuevo o corregido) en el contexto. */
  const handleGuardar = async () => {
    const nuevos = validar();
    setErrores(nuevos);
    const iso = fechaIngresadaAIso(fecha);
    if (Object.values(nuevos).some(Boolean) || !iso) return;
    // Opcional: si quedó vacío, el registro se guarda sin refuerzo.
    const isoProxima = fechaIngresadaAIso(proximaDosis);

    const datos: NuevoRegistro = {
      mascotaId,
      tipo,
      nombre: limpiarTexto(nombre),
      fecha: iso,
      profesional: limpiarTexto(profesional),
      ...(isoProxima && { proximaDosis: isoProxima }),
      // La etiqueta es solo de vacunas: si se cambió el tipo, la foto no se guarda.
      ...(tipo === 'vacuna' && fotoEtiqueta && { fotoEtiqueta }),
    };

    setGuardando(true);
    try {
      const guardado = registro
        ? await editarRegistro(registro.id, datos)
        : await agregarRegistro(datos);
      onGuardado(guardado);
    } catch (e) {
      Alert.alert('No se pudo guardar', e instanceof Error ? e.message : 'Intentá de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  /** Confirma y elimina el registro que se está corrigiendo. */
  const handleEliminar = () => {
    if (!registro) return;
    pedirBorrado({
      titulo: `¿Eliminar ${registro.nombre}?`,
      mensaje: 'Se borra esta aplicación del carnet. No se puede deshacer.',
      borrar: () => borrarRegistro(registro.id),
      onBorrado,
    });
  };

  // --- Render ---
  return (
    <View style={styles.form}>
      <View style={styles.grupo}>
        <Text style={styles.label}>Tipo</Text>
        <View style={styles.chips}>
          {TIPOS_REGISTRO.map((t) => (
            <Chip
              key={t.valor}
              label={t.singular}
              selected={tipo === t.valor}
              onPress={() => setTipo(t.valor)}
            />
          ))}
        </View>
      </View>

      <Input
        // En "Otro" el nombre es la descripción: es lo que se ve como título en el carnet.
        label={tipo === 'otro' ? 'Descripción' : 'Nombre'}
        icon={textos.icono}
        placeholder={EJEMPLOS[tipo]}
        value={nombre}
        onChangeText={(texto) => {
          setNombre(texto);
          limpiarError('nombre');
        }}
        error={errores.nombre}
        autoCapitalize="sentences"
        maxLength={LIMITES.nombreRegistro}
        returnKeyType="next"
        onSubmitEditing={() => fechaRef.current?.focus()}
        submitBehavior="submit"
      />
      <Input
        ref={fechaRef}
        label="Fecha de aplicación"
        icon="event"
        placeholder="dd/mm/aaaa"
        value={fecha}
        onChangeText={(texto) => {
          setFecha(enmascararFecha(texto));
          limpiarError('fecha');
          // El refuerzo se valida contra esta fecha: si cambia, su error ya no aplica.
          limpiarError('proximaDosis');
        }}
        error={errores.fecha}
        keyboardType="number-pad"
        maxLength={10}
        returnKeyType="next"
        onSubmitEditing={() => profesionalRef.current?.focus()}
        submitBehavior="submit"
      />
      <Input
        ref={profesionalRef}
        label="Veterinario o clínica"
        icon="local-hospital"
        placeholder="Ej: Dra. Martínez"
        value={profesional}
        onChangeText={(texto) => {
          setProfesional(texto);
          limpiarError('profesional');
        }}
        error={errores.profesional}
        autoCapitalize="words"
        maxLength={LIMITES.profesional}
        returnKeyType="next"
        onSubmitEditing={() => proximaDosisRef.current?.focus()}
        submitBehavior="submit"
      />
      <Input
        ref={proximaDosisRef}
        label={`${textos.proximo} (opcional)`}
        icon="update"
        placeholder="dd/mm/aaaa"
        value={proximaDosis}
        onChangeText={(texto) => {
          setProximaDosis(enmascararFecha(texto));
          limpiarError('proximaDosis');
        }}
        error={errores.proximaDosis}
        keyboardType="number-pad"
        maxLength={10}
        returnKeyType="done"
        onSubmitEditing={handleGuardar}
      />

      {tipo === 'vacuna' && <FotoEtiqueta foto={fotoEtiqueta} onChange={setFotoEtiqueta} />}

      <PrimaryButton
        title={registro ? 'Guardar cambios' : 'Guardar registro'}
        icon="check"
        onPress={handleGuardar}
        loading={guardando}
        disabled={borrando}
        style={styles.boton}
      />
      {registro && (
        <PrimaryButton
          title="Eliminar registro"
          icon="delete-outline"
          iconLeft
          variant="danger"
          onPress={handleEliminar}
          loading={borrando}
          disabled={guardando}
        />
      )}
    </View>
  );
}

// --- Estilos ---
const styles = StyleSheet.create({
  form: {
    gap: spacing.md,
  },
  grupo: {
    gap: spacing.base,
  },
  label: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  boton: {
    marginTop: spacing.sm,
  },
});
