/**
 * Pantalla de Login.
 *
 * Primera pantalla para quien no tiene sesión. Muestra el logo y un
 * formulario de email y contraseña con validación local (formato del email y
 * largo máximo de los dos campos). Con datos válidos hace el login contra la
 * API y entra a la tab Mascotas; si el servidor lo rechaza, muestra su mensaje.
 */
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, type TextInputInstance, View } from 'react-native';

import { Input } from '@/components/Input';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenContainer } from '@/components/ScreenContainer';
import { useApp } from '@/context/AppContext';
import { colors, radius, shadows, sizes, spacing, typography } from '@/theme';
import {
  LIMITES,
  normalizarEmail,
  validarEmail,
  validarPasswordRequerida,
} from '@/utils/validaciones';

const logo = require('@/assets/images/logo.png');

type Errores = {
  email?: string;
  password?: string;
};

/**
 * Pantalla de ingreso.
 * @returns el formulario de login
 */
export default function LoginScreen() {
  const { iniciarSesion } = useApp();

  // --- Estado ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errores, setErrores] = useState<Errores>({});
  const [enviando, setEnviando] = useState(false);
  const passwordRef = useRef<TextInputInstance>(null);

  // --- Handlers ---
  /** Actualiza el email y limpia su error mientras el usuario corrige. */
  const handleEmailChange = (texto: string) => {
    setEmail(texto);
    if (errores.email) setErrores((prev) => ({ ...prev, email: undefined }));
  };

  /** Actualiza la contraseña y limpia su error. */
  const handlePasswordChange = (texto: string) => {
    setPassword(texto);
    if (errores.password) setErrores((prev) => ({ ...prev, password: undefined }));
  };

  /**
   * Valida el formulario, inicia la sesión (guarda el token y carga los datos)
   * y entra a la app reemplazando el login en el historial.
   */
  const handleIngresar = async () => {
    if (enviando) return;
    const nuevos: Errores = {
      email: validarEmail(email),
      password: validarPasswordRequerida(password),
    };
    setErrores(nuevos);
    if (nuevos.email || nuevos.password) return;

    setEnviando(true);
    try {
      await iniciarSesion(normalizarEmail(email), password);
      router.replace('/mascotas');
    } catch (e) {
      Alert.alert('No pudimos ingresar', e instanceof Error ? e.message : 'Intentá de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  /** Lleva a la pantalla de registro. */
  const handleRegistrarme = () => router.push('/registro');

  // --- Render ---
  return (
    <ScreenContainer
      scroll
      backgroundColor={colors.primaryContainer}
      edges={['top', 'bottom', 'left', 'right']}
      contentStyle={styles.content}
    >
      <StatusBar style="light" />

      <View style={styles.brand}>
        <Image source={logo} style={styles.logo} accessibilityLabel="Logo de Doggy" />
        <Text style={styles.appName}>Doggy</Text>
        <Text style={styles.tagline}>
          Tu amigo confiable para el cuidado y seguridad de tu mascota.
        </Text>
      </View>

      <View style={styles.card}>
        <Input
          label="Email"
          icon="mail"
          placeholder="tu@email.com"
          value={email}
          onChangeText={handleEmailChange}
          error={errores.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          autoCorrect={false}
          maxLength={LIMITES.email}
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          submitBehavior="submit"
        />
        <Input
          ref={passwordRef}
          label="Contraseña"
          icon="lock"
          placeholder="••••••••"
          password
          value={password}
          onChangeText={handlePasswordChange}
          error={errores.password}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="password"
          textContentType="password"
          maxLength={LIMITES.password}
          returnKeyType="go"
          onSubmitEditing={handleIngresar}
        />

        <PrimaryButton
          title="Ingresar"
          icon="login"
          variant="secondary"
          onPress={handleIngresar}
          loading={enviando}
          style={styles.submit}
        />
      </View>

      <View style={styles.register}>
        <Text style={styles.registerText}>¿No tenés cuenta?</Text>
        <Pressable onPress={handleRegistrarme} hitSlop={spacing.sm} accessibilityRole="link">
          {({ pressed }) => (
            <Text style={[styles.registerLink, pressed && styles.linkPressed]}>Registrarme</Text>
          )}
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

// --- Estilos ---
const styles = StyleSheet.create({
  content: {
    justifyContent: 'center',
    gap: spacing.stackLg,
    paddingVertical: spacing.stackLg,
  },
  brand: {
    alignItems: 'center',
    gap: spacing.stackSm,
  },
  logo: {
    width: sizes.avatarLg,
    height: sizes.avatarLg,
    borderRadius: radius.full,
    ...shadows.level2,
  },
  appName: {
    ...typography.headlineLgMobile,
    color: colors.surfaceBright,
  },
  tagline: {
    ...typography.bodySm,
    color: colors.surfaceContainerHighest,
    textAlign: 'center',
    maxWidth: 250,
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
  submit: {
    marginTop: spacing.stackSm,
  },
  register: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  registerText: {
    ...typography.bodySm,
    color: colors.surfaceContainerHighest,
  },
  registerLink: {
    ...typography.labelMd,
    color: colors.surfaceBright,
    textDecorationLine: 'underline',
    textDecorationColor: colors.surfaceContainerHighest,
  },
  linkPressed: {
    opacity: 0.6,
  },
});
