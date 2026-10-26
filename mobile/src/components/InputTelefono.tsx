/**
 * Input de teléfono, el mismo en el registro y en el perfil: placeholder con
 * un celular de ejemplo, ayuda para que incluyan el 15 o el 9 (si no, el
 * número queda como fijo y no sirve para WhatsApp), teclado de teléfono y
 * descarte de letras y símbolos mientras se escribe. La validación es
 * `validarTelefono` y el aviso de fijo al guardar, `confirmarSiEsFijo`.
 */
import { forwardRef } from 'react';
import type { TextInputInstance } from 'react-native';

import { filtrarTelefono, LIMITES } from '@/utils/validaciones';
import { Input } from './Input';

type Props = {
  label?: string;
  value: string;
  /** Recibe el texto ya filtrado (sin letras ni símbolos). */
  onChangeText: (texto: string) => void;
  error?: string;
  returnKeyType?: 'next' | 'done' | 'go';
  onSubmitEditing?: () => void;
};

/**
 * Campo de teléfono.
 * @param props ver `Props`
 * @returns el input
 */
export const InputTelefono = forwardRef<TextInputInstance, Props>(function InputTelefono(
  { label = 'Teléfono de emergencia', value, onChangeText, error, returnKeyType, onSubmitEditing },
  ref,
) {
  return (
    <Input
      ref={ref}
      label={label}
      icon="phone-iphone"
      placeholder="Ej: 11 15 4589-2310"
      ayuda="Si es un celular, incluí el 15 o el 9 para que te puedan escribir por WhatsApp"
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
  );
});
