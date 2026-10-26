/**
 * Formulario "Editar datos personales": nombre, apellido, ubicación, email,
 * teléfono de emergencia. Guarda en el contexto global.
 * Cada campo tiene su largo máximo y sus caracteres permitidos (ver
 * `validaciones.ts`); el teléfono descarta letras y símbolos mientras se escribe.
 */
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { useApp } from '@/context/AppContext';
import { spacing } from '@/theme';
import { aE164, esCelular, formatearTelefono } from '@/utils/telefonos';
import type { Usuario } from '@/types/models';
import {
  filtrarTelefono,
  LIMITES,
  limpiarTexto,
  normalizarEmail,
  validarEmail,
  validarNombrePersona,
  validarTelefono,
  validarUbicacion,
} from '@/utils/validaciones';
import { Input } from '../Input';
import { PrimaryButton } from '../PrimaryButton';

type Props = {
  usuario: Usuario;
  onGuardado: () => void;
};

type Campo = 'nombre' | 'apellido' | 'ubicacion' | 'email' | 'telefonoEmergencia';
type Formulario = Record<Campo, string>;
type Errores = Partial<Record<Campo, string>>;

/**
 * Valida el formulario completo.
 * @param form valores actuales
 * @returns errores por campo
 */
function validar(form: Formulario): Errores {
  return {
    nombre: validarNombrePersona(form.nombre, 'Ingresá tu nombre.'),
    apellido: validarNombrePersona(form.apellido, 'Ingresá tu apellido.'),
    ubicacion: validarUbicacion(form.ubicacion),
    email: validarEmail(form.email),
    telefonoEmergencia: validarTelefono(form.telefonoEmergencia),
  };
}

/**
 * Formulario de edición del perfil.
 * @param props usuario actual y callback al guardar
 * @returns el formulario
 */
export function EditarPerfilForm({ usuario, onGuardado }: Props) {
  const { actualizarUsuario } = useApp();

  // --- Estado ---
  const [form, setForm] = useState<Formulario>({
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    ubicacion: usuario.ubicacion,
    email: usuario.email,
    // Se edita legible ("+54 9 11 4589-2310"); el servidor lo vuelve a guardar en E.164.
    telefonoEmergencia: usuario.telefonoEmergencia ? formatearTelefono(usuario.telefonoEmergencia) : '',
  });
  const [errores, setErrores] = useState<Errores>({});
  const [guardando, setGuardando] = useState(false);

  // --- Handlers ---
  /**
   * Handler de cambio de un campo: actualiza el valor y limpia su error.
   * @param campo campo editado
   */
  const handleChange = (campo: Campo) => (texto: string) => {
    setForm((prev) => ({ ...prev, [campo]: texto }));
    if (errores[campo]) setErrores((prev) => ({ ...prev, [campo]: undefined }));
  };

  /**
   * Valida y guarda. Si el teléfono cambió y es válido pero fijo, avisa antes
   * (sin bloquear) que no se va a poder usar WhatsApp: "Guardar igual" sigue y
   * "Corregir" vuelve al formulario.
   */
  const handleGuardar = () => {
    const nuevos = validar(form);
    setErrores(nuevos);
    if (Object.values(nuevos).some(Boolean)) return;

    const cambioTelefono = aE164(form.telefonoEmergencia) !== usuario.telefonoEmergencia;
    if (cambioTelefono && !esCelular(form.telefonoEmergencia)) {
      Alert.alert(
        'Teléfono fijo',
        'Lo guardamos como teléfono fijo: no se va a poder usar WhatsApp. Si es un celular, agregá el 15.',
        [
          { text: 'Corregir', style: 'cancel' },
          { text: 'Guardar igual', onPress: guardar },
        ],
      );
      return;
    }
    guardar();
  };

  /** Guarda los cambios (PATCH /api/usuarios/me); el servidor guarda el teléfono en E.164. */
  const guardar = async () => {
    setGuardando(true);
    try {
      await actualizarUsuario({
        nombre: limpiarTexto(form.nombre),
        apellido: limpiarTexto(form.apellido),
        ubicacion: limpiarTexto(form.ubicacion),
        email: normalizarEmail(form.email),
        telefonoEmergencia: limpiarTexto(form.telefonoEmergencia),
      });
      onGuardado();
    } catch (e) {
      Alert.alert('No se pudo guardar', e instanceof Error ? e.message : 'Intentá de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  // --- Render ---
  return (
    <View style={styles.form}>
      <View style={styles.fila}>
        <View style={styles.mitad}>
          <Input
            label="Nombre"
            value={form.nombre}
            onChangeText={handleChange('nombre')}
            error={errores.nombre}
            autoCapitalize="words"
            maxLength={LIMITES.nombrePersona}
          />
        </View>
        <View style={styles.mitad}>
          <Input
            label="Apellido"
            value={form.apellido}
            onChangeText={handleChange('apellido')}
            error={errores.apellido}
            autoCapitalize="words"
            maxLength={LIMITES.nombrePersona}
          />
        </View>
      </View>
      <Input
        label="Ubicación"
        icon="location-on"
        placeholder="Ej: Palermo, Buenos Aires"
        value={form.ubicacion}
        onChangeText={handleChange('ubicacion')}
        error={errores.ubicacion}
        autoCapitalize="words"
        maxLength={LIMITES.ubicacion}
      />
      <Input
        label="Email"
        icon="mail"
        value={form.email}
        onChangeText={handleChange('email')}
        error={errores.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        autoCorrect={false}
        maxLength={LIMITES.email}
      />
      <Input
        label="Teléfono de emergencia"
        icon="phone-iphone"
        placeholder="Ej: 11 15 4589-2310"
        ayuda="Si es un celular, incluí el 15 o el 9 para que te puedan escribir por WhatsApp"
        value={form.telefonoEmergencia}
        // Algunos teclados dejan pegar letras: se descartan antes de guardar el valor.
        onChangeText={(texto) => handleChange('telefonoEmergencia')(filtrarTelefono(texto))}
        error={errores.telefonoEmergencia}
        keyboardType="phone-pad"
        maxLength={LIMITES.telefono}
      />

      <PrimaryButton
        title="Guardar cambios"
        icon="check"
        onPress={handleGuardar}
        loading={guardando}
        style={styles.boton}
      />
    </View>
  );
}

// --- Estilos ---
const styles = StyleSheet.create({
  form: {
    gap: spacing.md,
  },
  fila: {
    flexDirection: 'row',
    gap: spacing.stackSm,
  },
  mitad: {
    flex: 1,
  },
  boton: {
    marginTop: spacing.sm,
  },
});
