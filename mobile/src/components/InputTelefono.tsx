/**
 * Input de teléfono, el mismo en el registro y en el perfil: "+54" fijo
 * adelante (solo se aceptan teléfonos de la Argentina), placeholder con un
 * ejemplo, teclado de teléfono, descarte de letras y símbolos mientras se
 * escribe, y la casilla "Es un teléfono fijo" (desmarcada por defecto: todo
 * número se guarda como celular, salvo que se marque).
 *
 * El usuario escribe la característica y el número en cualquier formato. Si
 * pega o escribe el número con el código de país (+54, 54, 0054, 549), al
 * pegarlo y al salir del campo se saca solo (`quitarCodigoPais`) y se muestra
 * unos segundos "Ya agregamos el +54, escribí solo tu número". No es un
 * error: si lo que queda no es un número válido, lo dice `validarTelefono`
 * como siempre. El número se manda junto con `telefonoFijo`.
 *
 * Diseño: el "+54" y el número van dentro del mismo borde de `Input`, con la
 * misma altura, fuente y tamaño que el resto de los campos y un separador
 * entre los dos. Debajo, con el mismo espaciado que el label y el error de
 * `Input` (8), el aviso del +54 y la casilla, alineados al borde izquierdo
 * del campo. Con `disabled` (mientras se guarda) se apagan el campo y la casilla.
 */
import { MaterialIcons } from '@expo/vector-icons';
import { forwardRef, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, type TextInputInstance } from 'react-native';

import { colors, sizes, spacing, typography } from '@/theme';
import { quitarCodigoPais } from '@/utils/telefonos';
import { filtrarTelefono, LIMITES } from '@/utils/validaciones';
import { Casilla } from './Casilla';
import { Input } from './Input';

type Props = {
  label?: string;
  /** Característica y número, sin el +54 (que el input ya muestra). */
  value: string;
  /** Recibe el texto ya filtrado (sin letras ni símbolos) y sin el código de país si se pegó. */
  onChangeText: (texto: string) => void;
  error?: string;
  /** true si está marcada "Es un teléfono fijo". */
  fijo: boolean;
  onCambiarFijo: (fijo: boolean) => void;
  returnKeyType?: 'next' | 'done' | 'go';
  onSubmitEditing?: () => void;
  /** true mientras se guarda el formulario: no se puede editar. */
  disabled?: boolean;
};

/** Prefijo fijo del campo: el código de país de la Argentina. */
const PREFIJO = '+54';
/** Aviso cuando se saca el código de país que escribió el usuario. */
const AVISO_CODIGO_PAIS = 'Ya agregamos el +54, escribí solo tu número';
/** Cuánto se ve el aviso. */
const AVISO_MS = 4000;

/**
 * Campo de teléfono con el +54 fijo y la casilla de fijo.
 * @param props ver `Props`
 * @returns el input, el aviso (si corresponde) y la casilla
 */
export const InputTelefono = forwardRef<TextInputInstance, Props>(function InputTelefono(
  {
    label = 'Teléfono de emergencia',
    value,
    onChangeText,
    error,
    fijo,
    onCambiarFijo,
    returnKeyType,
    onSubmitEditing,
    disabled = false,
  },
  ref,
) {
  // --- Estado ---
  const [aviso, setAviso] = useState(false);
  const timerAviso = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Si el campo se desmonta con el aviso a la vista, no queda el timer andando.
  useEffect(
    () => () => {
      if (timerAviso.current) clearTimeout(timerAviso.current);
    },
    [],
  );

  // --- Handlers ---
  /** Muestra el aviso del +54 unos segundos (si ya estaba, vuelve a contar). */
  const mostrarAviso = () => {
    setAviso(true);
    if (timerAviso.current) clearTimeout(timerAviso.current);
    timerAviso.current = setTimeout(() => setAviso(false), AVISO_MS);
  };

  /**
   * Saca el código de país si el texto lo trae, y avisa.
   * @param texto lo que hay en el campo
   * @returns el texto sin el código de país, o el mismo si no lo traía
   */
  const sinCodigoPais = (texto: string): string => {
    const limpio = quitarCodigoPais(texto);
    if (limpio === null) return texto;
    mostrarAviso();
    return limpio;
  };

  /**
   * Filtra lo escrito y, si se pegó (entró más de un carácter de golpe), saca
   * el código de país enseguida. Si se tipea, se saca al salir del campo.
   * @param texto nuevo valor del TextInput
   */
  const handleChange = (texto: string) => {
    const filtrado = filtrarTelefono(texto);
    const pegado = filtrado.length - value.length > 1;
    onChangeText(pegado ? sinCodigoPais(filtrado) : filtrado);
  };

  /** Al salir del campo, saca el código de país que se haya tipeado. */
  const handleBlur = () => {
    const limpio = sinCodigoPais(value);
    if (limpio !== value) onChangeText(limpio);
  };

  // --- Render ---
  return (
    <View style={styles.grupo}>
      <Input
        ref={ref}
        label={label}
        icon="phone-iphone"
        prefijo={PREFIJO}
        placeholder="Ej: 11 4589-2310"
        value={value}
        onChangeText={handleChange}
        onBlur={handleBlur}
        error={error}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        maxLength={LIMITES.telefono}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        submitBehavior={onSubmitEditing ? 'submit' : undefined}
        editable={!disabled}
      />
      {aviso && (
        <View style={styles.aviso} accessibilityLiveRegion="polite">
          <MaterialIcons name="info-outline" size={sizes.iconSm} color={colors.primary} />
          <Text style={styles.avisoTexto}>{AVISO_CODIGO_PAIS}</Text>
        </View>
      )}
      <Casilla label="Es un teléfono fijo" marcada={fijo} onCambiar={onCambiarFijo} disabled={disabled} />
    </View>
  );
});

// --- Estilos ---
const styles = StyleSheet.create({
  grupo: {
    // El mismo espacio que hay entre el label, el campo y el error de `Input`.
    gap: spacing.base,
  },
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avisoTexto: {
    ...typography.bodySm,
    color: colors.primary,
    flex: 1,
  },
});
