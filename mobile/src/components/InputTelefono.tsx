/**
 * Input de teléfono, el mismo en el registro y en el perfil: placeholder con
 * un ejemplo, teclado de teléfono, descarte de letras y símbolos mientras se
 * escribe, y la casilla "Es un teléfono fijo" (desmarcada por defecto: todo
 * número se guarda como celular, salvo que se marque). La validación es
 * `validarTelefono`; el número se manda junto con `telefonoFijo`.
 */
import { forwardRef } from 'react';
import { StyleSheet, View, type TextInputInstance } from 'react-native';

import { spacing } from '@/theme';
import { filtrarTelefono, LIMITES } from '@/utils/validaciones';
import { Casilla } from './Casilla';
import { Input } from './Input';

type Props = {
  label?: string;
  value: string;
  /** Recibe el texto ya filtrado (sin letras ni símbolos). */
  onChangeText: (texto: string) => void;
  error?: string;
  /** true si está marcada "Es un teléfono fijo". */
  fijo: boolean;
  onCambiarFijo: (fijo: boolean) => void;
  returnKeyType?: 'next' | 'done' | 'go';
  onSubmitEditing?: () => void;
};

/**
 * Campo de teléfono con la casilla de fijo.
 * @param props ver `Props`
 * @returns el input y la casilla
 */
export const InputTelefono = forwardRef<TextInputInstance, Props>(function InputTelefono(
  { label = 'Teléfono de emergencia', value, onChangeText, error, fijo, onCambiarFijo, returnKeyType, onSubmitEditing },
  ref,
) {
  return (
    <View style={styles.grupo}>
      <Input
        ref={ref}
        label={label}
        icon="phone-iphone"
        placeholder="Ej: 11 4589-2310"
        value={value}
        // Algunos teclados dejan pegar letras: se descartan antes de guardar el valor.
        onChangeText={(texto) => onChangeText(filtrarTelefono(texto))}
        error={error}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        maxLength={LIMITES.telefono}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        submitBehavior={onSubmitEditing ? 'submit' : undefined}
      />
      <Casilla label="Es un teléfono fijo" marcada={fijo} onCambiar={onCambiarFijo} />
    </View>
  );
});

// --- Estilos ---
const styles = StyleSheet.create({
  grupo: {
    gap: spacing.xs,
  },
});
