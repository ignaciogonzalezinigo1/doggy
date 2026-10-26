/**
 * Pantalla de Registro.
 *
 * Mismo estilo que el Login: fondo teal y el formulario en una card clara.
 * Pide nombre, apellido, email, teléfono y contraseña con confirmación, y
 * valida todo localmente: nombre y apellido solo con letras, email con
 * formato válido, teléfono argentino real (la regla de `telefonos.ts`, con el mismo
 * `InputTelefono` con el +54 fijo y la misma casilla "Es un teléfono fijo" que el perfil) y contraseña de 8 a 64 caracteres,
 * sin espacios, con al menos una letra y un número. Cada campo tiene su largo máximo. Con todo válido crea la cuenta
 * contra la API, deja la sesión abierta y entra a la tab Mascotas con un
 * saludo que invita a completar el perfil. Si el servidor la rechaza (por
 * ejemplo, el email ya tiene cuenta), muestra su mensaje.
 */
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, type TextInputInstance, View } from 'react-native';

import { BackButton } from '@/components/BackButton';
import { Input } from '@/components/Input';
import { InputTelefono } from '@/components/InputTelefono';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenContainer } from '@/components/ScreenContainer';
import { useApp } from '@/context/AppContext';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import { volver } from '@/utils/navegacion';
import {
  LIMITES,
  limpiarTexto,
  normalizarEmail,
  PASSWORD_MIN,
  validarConfirmacion,
  validarEmail,
  validarNombrePersona,
  validarPasswordNueva,
  validarTelefono,
} from '@/utils/validaciones';

type Formulario = {
  nombre: string;
  apellido: string;
  email: string;
  telefonoEmergencia: string;
  password: string;
  confirmacion: string;
};

type Campo = keyof Formulario;
type Errores = Partial<Record<Campo, string>>;

const FORM_INICIAL: Formulario = {
  nombre: '',
  apellido: '',
  email: '',
  telefonoEmergencia: '',
  password: '',
  confirmacion: '',
};

/**
 * Valida el formulario completo.
 * @param form valores actuales
 * @returns un objeto con el error de cada campo (undefined si está bien)
 */
function validarFormulario(form: Formulario): Errores {
  return {
    nombre: validarNombrePersona(form.nombre, 'Ingresá tu nombre.'),
    apellido: validarNombrePersona(form.apellido, 'Ingresá tu apellido.'),
    email: validarEmail(form.email),
    telefonoEmergencia: validarTelefono(form.telefonoEmergencia),
    password: validarPasswordNueva(form.password),
    confirmacion: validarConfirmacion(form.password, form.confirmacion),
  };
}

/**
 * Pantalla de creación de cuenta.
 * @returns el formulario de registro
 */
export default function RegistroScreen() {
  const { registrarse } = useApp();

  // --- Estado ---
  const [form, setForm] = useState<Formulario>(FORM_INICIAL);
  /** "Es un teléfono fijo": desmarcada, el teléfono se guarda como celular. */
  const [telefonoFijo, setTelefonoFijo] = useState(false);
  const [errores, setErrores] = useState<Errores>({});
  const [enviando, setEnviando] = useState(false);
  const apellidoRef = useRef<TextInputInstance>(null);
  const emailRef = useRef<TextInputInstance>(null);
  const telefonoRef = useRef<TextInputInstance>(null);
  const passwordRef = useRef<TextInputInstance>(null);
  const confirmacionRef = useRef<TextInputInstance>(null);

  // --- Handlers ---
  /**
   * Devuelve el handler de cambio de un campo: actualiza el valor y limpia su error.
   * @param campo nombre del campo del formulario
   */
  const handleChange = (campo: Campo) => (texto: string) => {
    setForm((prev) => ({ ...prev, [campo]: texto }));
    if (errores[campo]) setErrores((prev) => ({ ...prev, [campo]: undefined }));
  };

  /**
   * Valida y, si todo está bien, crea la cuenta (queda la sesión abierta),
   * entra a la tab Mascotas sin dejar el registro en el historial y saluda.
   */
  const handleCrearCuenta = async () => {
    if (enviando) return;
    const nuevos = validarFormulario(form);
    setErrores(nuevos);
    if (Object.values(nuevos).some(Boolean)) return;

    const nombre = limpiarTexto(form.nombre);
    setEnviando(true);
    try {
      await registrarse({
        nombre,
        apellido: limpiarTexto(form.apellido),
        email: normalizarEmail(form.email),
        telefonoEmergencia: limpiarTexto(form.telefonoEmergencia),
        telefonoFijo,
        password: form.password,
      });
      router.replace('/mascotas');
      Alert.alert(
        'Cuenta creada',
        `¡Bienvenido/a a Doggy, ${nombre}! Ya podés cargar tus mascotas. Completá tu ubicación desde Perfil.`,
      );
    } catch (e) {
      Alert.alert('No pudimos crear la cuenta', e instanceof Error ? e.message : 'Intentá de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  /** Vuelve al login (o lo abre si no hay historial). */
  const handleIngresar = () => volver('/login');

  // --- Render ---
  return (
    <ScreenContainer
      scroll
      backgroundColor={colors.primaryContainer}
      edges={['top', 'bottom', 'left', 'right']}
      contentStyle={styles.content}
    >
      <StatusBar style="light" />

      <View style={styles.header}>
        <BackButton tone="light" fallback="/login" />
        <View style={styles.headerText}>
          <Text style={styles.title}>Crear cuenta</Text>
          <Text style={styles.subtitle}>
            Registrate para cuidar a tus mascotas y ayudar a encontrar a las que se perdieron.
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowItem}>
            <Input
              label="Nombre"
              placeholder="Sofía"
              value={form.nombre}
              onChangeText={handleChange('nombre')}
              error={errores.nombre}
              autoCapitalize="words"
              autoComplete="given-name"
              maxLength={LIMITES.nombrePersona}
              returnKeyType="next"
              onSubmitEditing={() => apellidoRef.current?.focus()}
              submitBehavior="submit"
            />
          </View>
          <View style={styles.rowItem}>
            <Input
              ref={apellidoRef}
              label="Apellido"
              placeholder="Romero"
              value={form.apellido}
              onChangeText={handleChange('apellido')}
              error={errores.apellido}
              autoCapitalize="words"
              autoComplete="family-name"
              maxLength={LIMITES.nombrePersona}
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
              submitBehavior="submit"
            />
          </View>
        </View>

        <Input
          ref={emailRef}
          label="Email"
          icon="mail"
          placeholder="tu@email.com"
          value={form.email}
          onChangeText={handleChange('email')}
          error={errores.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          autoCorrect={false}
          maxLength={LIMITES.email}
          returnKeyType="next"
          onSubmitEditing={() => telefonoRef.current?.focus()}
          submitBehavior="submit"
        />
        <InputTelefono
          ref={telefonoRef}
          label="Teléfono"
          value={form.telefonoEmergencia}
          onChangeText={handleChange('telefonoEmergencia')}
          error={errores.telefonoEmergencia}
          fijo={telefonoFijo}
          onCambiarFijo={setTelefonoFijo}
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <Input
          ref={passwordRef}
          label="Contraseña"
          icon="lock"
          placeholder={`Mínimo ${PASSWORD_MIN}, con letras y números`}
          password
          value={form.password}
          onChangeText={handleChange('password')}
          error={errores.password}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
          maxLength={LIMITES.password}
          returnKeyType="next"
          onSubmitEditing={() => confirmacionRef.current?.focus()}
          submitBehavior="submit"
        />
        <Input
          ref={confirmacionRef}
          label="Confirmar contraseña"
          icon="lock-outline"
          placeholder="Repetí la contraseña"
          password
          value={form.confirmacion}
          onChangeText={handleChange('confirmacion')}
          error={errores.confirmacion}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
          maxLength={LIMITES.password}
          returnKeyType="go"
          onSubmitEditing={handleCrearCuenta}
        />

        <PrimaryButton
          title="Crear cuenta"
          icon="person-add"
          variant="secondary"
          onPress={handleCrearCuenta}
          loading={enviando}
          style={styles.submit}
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>¿Ya tenés cuenta?</Text>
        <Pressable onPress={handleIngresar} hitSlop={spacing.sm} accessibilityRole="link">
          {({ pressed }) => (
            <Text style={[styles.footerLink, pressed && styles.linkPressed]}>Ingresar</Text>
          )}
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

// --- Estilos ---
const styles = StyleSheet.create({
  content: {
    gap: spacing.stackMd,
    paddingTop: spacing.md,
    paddingBottom: spacing.stackLg,
  },
  header: {
    gap: spacing.stackMd,
  },
  headerText: {
    gap: spacing.sm,
  },
  title: {
    ...typography.headlineLgMobile,
    color: colors.surfaceBright,
  },
  subtitle: {
    ...typography.bodySm,
    color: colors.surfaceContainerHighest,
  },
  card: {
    width: '100%',
    maxWidth: 448,
    alignSelf: 'center',
    gap: spacing.stackSm,
    padding: spacing.stackMd,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceBright,
    ...shadows.level2,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.stackSm,
  },
  rowItem: {
    flex: 1,
  },
  submit: {
    marginTop: spacing.stackSm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  footerText: {
    ...typography.bodySm,
    color: colors.surfaceContainerHighest,
  },
  footerLink: {
    ...typography.labelMd,
    color: colors.surfaceBright,
    textDecorationLine: 'underline',
    textDecorationColor: colors.surfaceContainerHighest,
  },
  linkPressed: {
    opacity: 0.6,
  },
});
