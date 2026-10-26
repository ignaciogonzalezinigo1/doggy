/**
 * Formulario de datos de una mascota, compartido por el alta y la edición.
 *
 * Tiene la foto (sacada con la cámara o elegida de la galería), nombre, raza,
 * fecha de nacimiento (dd/mm/aaaa, como las fechas del carnet) y señas particulares, con validación local (largo máximo y caracteres
 * permitidos en cada campo, ver `validaciones.ts`). No sabe si está creando o
 * editando: recibe los valores iniciales y le entrega los datos ya validados
 * y limpios a `onGuardar`, que decide qué hacer con ellos. Mientras
 * `onGuardar` corre, el botón muestra el estado de carga.
 */
import { useRef, useState } from 'react';
import { Alert, StyleSheet, Text, type TextInputInstance, View } from 'react-native';

import { AvisoPermisoFoto } from '@/components/AvisoPermisoFoto';
import { FotoEditable } from '@/components/FotoEditable';
import { Input } from '@/components/Input';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useFototeca } from '@/hooks/useFototeca';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import type { NuevaMascota } from '@/types/models';
import { enmascararFecha, fechaIngresadaAIso, formatearFecha } from '@/utils/fechas';
import {
  LIMITES,
  limpiarTexto,
  validarFechaNacimiento,
  validarNombreMascota,
  validarRaza,
  validarTexto,
} from '@/utils/validaciones';

type Formulario = {
  nombre: string;
  raza: string;
  /** dd/mm/aaaa en hora local; se convierte a AAAA-MM-DD al guardar (sin toISOString). */
  fechaNacimiento: string;
  senas: string;
  foto: string | null;
};

type CampoTexto = 'nombre' | 'raza' | 'fechaNacimiento' | 'senas';
type Errores = Partial<Record<CampoTexto, string>>;

type Props = {
  /** Datos con los que arranca el formulario (vacío en el alta). */
  inicial?: NuevaMascota;
  /** Texto del botón de guardar. */
  textoBoton?: string;
  /** Recibe los datos validados. Si lanza un error, lo maneja la pantalla. */
  onGuardar: (datos: NuevaMascota) => Promise<void>;
};

/**
 * Pasa los datos de una mascota al formato de los inputs.
 * @param mascota datos iniciales (opcional)
 * @returns el estado inicial del formulario
 */
function aFormulario(mascota?: NuevaMascota): Formulario {
  return {
    nombre: mascota?.nombre ?? '',
    raza: mascota?.raza ?? '',
    fechaNacimiento: mascota ? formatearFecha(mascota.fechaNacimiento) : '',
    senas: mascota?.senas ?? '',
    foto: mascota?.foto ?? null,
  };
}

/**
 * Valida los campos de texto del formulario.
 * @param form valores actuales
 * @returns errores por campo
 */
function validarFormulario(form: Formulario): Errores {
  return {
    nombre: validarNombreMascota(form.nombre),
    raza: validarRaza(form.raza),
    fechaNacimiento: validarFechaNacimiento(form.fechaNacimiento),
    senas: validarTexto(form.senas, {
      requerido: 'Contá alguna seña para reconocerla.',
      min: 5,
      max: LIMITES.senas,
      formato: 'texto',
      multilinea: true,
    }),
  };
}

/**
 * Formulario de mascota.
 * @param props ver `Props`
 * @returns la foto, los campos y el botón de guardar
 */
export function MascotaForm({ inicial, textoBoton = 'Guardar', onGuardar }: Props) {
  const fototeca = useFototeca();

  // --- Estado ---
  const [form, setForm] = useState<Formulario>(() => aFormulario(inicial));
  const [errores, setErrores] = useState<Errores>({});
  const [guardando, setGuardando] = useState(false);
  const razaRef = useRef<TextInputInstance>(null);
  const fechaRef = useRef<TextInputInstance>(null);
  const senasRef = useRef<TextInputInstance>(null);

  // --- Handlers ---
  /**
   * Devuelve el handler de cambio de un campo de texto.
   * @param campo campo a actualizar
   */
  const handleChange = (campo: CampoTexto) => (texto: string) => {
    setForm((prev) => ({ ...prev, [campo]: texto }));
    if (errores[campo]) setErrores((prev) => ({ ...prev, [campo]: undefined }));
  };

  /**
   * Pone una imagen como foto de la mascota.
   * @param uri foto sacada o elegida
   */
  const ponerFoto = (uri: string) => setForm((prev) => ({ ...prev, foto: uri }));

  /** Pregunta si sacar la foto o elegirla de la galería y, si se consigue, la pone. */
  const handleElegirFoto = async () => {
    try {
      const uri = await fototeca.pedirFoto();
      if (uri) ponerFoto(uri);
    } catch {
      Alert.alert('No se pudo conseguir la foto', 'Probá de nuevo en unos segundos.');
    }
  };

  /** Valida y, si está todo bien, le pasa los datos limpios a la pantalla. */
  const handleGuardar = async () => {
    const nuevos = validarFormulario(form);
    setErrores(nuevos);
    if (Object.values(nuevos).some(Boolean)) return;

    setGuardando(true);
    try {
      await onGuardar({
        nombre: limpiarTexto(form.nombre),
        raza: limpiarTexto(form.raza),
        // Ya validada: el formato dd/mm/aaaa es correcto.
        fechaNacimiento: fechaIngresadaAIso(form.fechaNacimiento) ?? '',
        senas: limpiarTexto(form.senas, true),
        foto: form.foto,
      });
    } finally {
      setGuardando(false);
    }
  };

  // --- Render ---
  return (
    <>
      <View style={styles.fotoSection}>
        <FotoEditable
          foto={form.foto}
          nombre={form.nombre}
          onPress={handleElegirFoto}
          cargando={fototeca.eligiendo}
        />
        <Text style={styles.fotoAyuda}>
          {form.foto ? 'Tocá la foto para cambiarla' : 'Tocá para sacarle una foto o elegir una de tu galería'}
        </Text>
      </View>

      <AvisoPermisoFoto
        fototeca={fototeca}
        motivo="La foto es lo que más ayuda a que alguien reconozca a tu mascota si se pierde."
        onFoto={ponerFoto}
      />

      <View style={styles.card}>
        <Input
          label="Nombre"
          icon="pets"
          placeholder="Ej: Luna"
          value={form.nombre}
          onChangeText={handleChange('nombre')}
          error={errores.nombre}
          autoCapitalize="words"
          maxLength={LIMITES.nombreMascota}
          returnKeyType="next"
          onSubmitEditing={() => razaRef.current?.focus()}
          submitBehavior="submit"
        />

        <Input
          ref={razaRef}
          label="Raza"
          placeholder="Ej: Golden Retriever"
          value={form.raza}
          onChangeText={handleChange('raza')}
          error={errores.raza}
          autoCapitalize="words"
          maxLength={LIMITES.raza}
          returnKeyType="next"
          onSubmitEditing={() => fechaRef.current?.focus()}
          submitBehavior="submit"
        />
        <Input
          ref={fechaRef}
          label="Fecha de nacimiento"
          icon="cake"
          placeholder="dd/mm/aaaa"
          value={form.fechaNacimiento}
          onChangeText={(texto) => handleChange('fechaNacimiento')(enmascararFecha(texto))}
          error={errores.fechaNacimiento}
          keyboardType="number-pad"
          maxLength={10}
          returnKeyType="next"
          onSubmitEditing={() => senasRef.current?.focus()}
          submitBehavior="submit"
        />

        <Input
          ref={senasRef}
          label="Señas particulares"
          icon="info-outline"
          placeholder="Ej: Mancha blanca en el pecho, collar rojo"
          value={form.senas}
          onChangeText={handleChange('senas')}
          error={errores.senas}
          multiline
          maxLength={LIMITES.senas}
        />
      </View>

      <PrimaryButton title={textoBoton} icon="check" onPress={handleGuardar} loading={guardando} />
    </>
  );
}

// --- Estilos ---
const styles = StyleSheet.create({
  fotoSection: {
    alignItems: 'center',
    gap: spacing.stackSm,
  },
  fotoAyuda: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
  },
  card: {
    gap: spacing.md,
    padding: spacing.containerMargin,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLowest,
    ...shadows.level1,
  },
});
