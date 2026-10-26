/**
 * Campo de texto de la app.
 *
 * Label arriba, ícono a la izquierda, borde teal claro con foco y mensaje de
 * error debajo. Con `password` oculta el texto, agrega el botón de
 * mostrar/ocultar y apaga la mayúscula automática y el corrector (el teclado
 * de iOS los aplica aunque el texto esté oculto); el padre igual puede pisarlos. Con `multiline` crece para textos largos (señas, descripciones)
 * y, si tiene `maxLength`, muestra debajo cuántos caracteres van del máximo.
 * Acepta el resto de las props de TextInput.
 */
import { MaterialIcons } from '@expo/vector-icons';
import { ComponentProps, forwardRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputInstance,
  TextInputProps,
  View,
} from 'react-native';

import { colors, radius, sizes, spacing, typography } from '@/theme';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

/** Defaults de un campo de contraseña: se manda tal cual se escribió. */
const PROPS_CONTRASENA: TextInputProps = { autoCapitalize: 'none', autoCorrect: false, spellCheck: false };

type Props = Omit<TextInputProps, 'secureTextEntry' | 'style'> & {
  /** Texto arriba del campo; si no viene (por ejemplo, un buscador) se usa el placeholder como nombre accesible. */
  label?: string;
  icon?: IconName;
  /** Mensaje de error; si viene, el borde se pinta de rojo. */
  error?: string;
  /** Modo contraseña con botón para mostrar u ocultar. */
  password?: boolean;
};

/**
 * Input con label, ícono, foco, error y modo contraseña.
 * Se expone la ref del TextInput para poder pasar el foco al siguiente campo.
 */
export const Input = forwardRef<TextInputInstance, Props>(function Input(
  { label, icon, error, password = false, onFocus, onBlur, ...inputProps },
  ref,
) {
  // --- Estado ---
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);

  // --- Handlers ---
  /** Marca el campo con foco y avisa al padre si pasó onFocus. */
  const handleFocus: TextInputProps['onFocus'] = (e) => {
    setFocused(true);
    onFocus?.(e);
  };

  /** Quita el foco y avisa al padre si pasó onBlur. */
  const handleBlur: TextInputProps['onBlur'] = (e) => {
    setFocused(false);
    onBlur?.(e);
  };

  // En los textos largos se muestra cuánto falta para el máximo.
  const contador = !!inputProps.multiline && inputProps.maxLength !== undefined;
  const largo = inputProps.value?.length ?? 0;

  /** Alterna entre mostrar y ocultar la contraseña. */
  const toggleHidden = () => setHidden((prev) => !prev);

  // --- Render ---
  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.field,
          inputProps.multiline && styles.fieldMultiline,
          focused && styles.fieldFocused,
          !!error && styles.fieldError,
        ]}
      >
        {icon && (
          <MaterialIcons
            name={icon}
            size={sizes.iconMd}
            color={focused ? colors.tealLight : colors.outline}
          />
        )}
        <TextInput
          ref={ref}
          style={[styles.input, inputProps.multiline && styles.inputMultiline]}
          placeholderTextColor={colors.outline}
          secureTextEntry={password && hidden}
          onFocus={handleFocus}
          onBlur={handleBlur}
          accessibilityLabel={label ?? inputProps.placeholder}
          {...(password && PROPS_CONTRASENA)}
          {...inputProps}
        />
        {password && (
          <Pressable
            onPress={toggleHidden}
            hitSlop={spacing.sm}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Mostrar contraseña' : 'Ocultar contraseña'}
          >
            {({ pressed }) => (
              <MaterialIcons
                name={hidden ? 'visibility-off' : 'visibility'}
                size={sizes.iconMd}
                color={pressed ? colors.primaryContainer : colors.outline}
              />
            )}
          </Pressable>
        )}
      </View>
      {(!!error || contador) && (
        <View style={styles.pie}>
          {!!error && <Text style={styles.error}>{error}</Text>}
          {contador && (
            <Text style={styles.contador} accessibilityLabel={`${largo} de ${inputProps.maxLength} caracteres`}>
              {largo}/{inputProps.maxLength}
            </Text>
          )}
        </View>
      )}
    </View>
  );
});

// --- Estilos ---
const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.base,
  },
  label: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
  },
  field: {
    height: sizes.inputHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackSm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: sizes.borderWidth,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surface,
  },
  fieldMultiline: {
    height: undefined,
    minHeight: sizes.inputHeight * 2,
    alignItems: 'flex-start',
    paddingVertical: spacing.stackSm,
  },
  fieldFocused: {
    borderColor: colors.tealLight,
    borderWidth: sizes.borderWidthFocus,
    // Compensa el borde más grueso para que el contenido no se mueva.
    paddingHorizontal: spacing.md - (sizes.borderWidthFocus - sizes.borderWidth),
  },
  fieldError: {
    borderColor: colors.error,
  },
  input: {
    flex: 1,
    // Sin esto, en pantallas angostas el campo no se achica y empuja el ícono afuera.
    minWidth: 0,
    height: '100%',
    ...typography.bodyMd,
    color: colors.onSurface,
    // En web el navegador agrega su propio contorno de foco; el borde del campo ya lo indica.
    outlineWidth: 0,
  },
  inputMultiline: {
    height: undefined,
    minHeight: sizes.inputHeight * 2 - spacing.stackSm * 2,
    // Android centra el texto por defecto en los campos de varias líneas.
    textAlignVertical: 'top',
    paddingTop: 0,
  },
  pie: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  error: {
    ...typography.bodySm,
    color: colors.error,
    flex: 1,
  },
  contador: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    marginLeft: 'auto',
  },
});
