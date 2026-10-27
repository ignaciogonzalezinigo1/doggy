/**
 * Hoja de doble chequeo para borrar una mascota para siempre (solo dueños).
 *
 * Explica qué se borra (la mascota, su carnet sanitario, sus turnos, sus
 * reportes, sus códigos de asignación y sus fotos), lista quiénes pierden el
 * acceso si hay otras personas asignadas y, para habilitar "Eliminar para
 * siempre", pide escribir el nombre de la mascota (sin importar mayúsculas
 * ni espacios de más). Mientras se borra, el botón queda con el spinner y la
 * hoja no se puede cerrar a medias.
 *
 * Háptica: vibra con `expo-haptics` al terminar (o al fallar). No pide permisos.
 */
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { useAcciones } from '@/context/AppContext';
import { colors, radius, spacing, typography } from '@/theme';
import type { Cuidador, Mascota } from '@/types/models';
import { rolMascota } from '@/utils/etiquetas';
import { FormModal } from '../FormModal';
import { Input } from '../Input';
import { PrimaryButton } from '../PrimaryButton';

type Props = {
  visible: boolean;
  mascota: Mascota;
  /** Las demás personas asignadas (sin el usuario): pierden el acceso. */
  otros: Cuidador[];
  onClose: () => void;
  /** Se llama cuando ya se borró (por ejemplo, para volver a Mis Mascotas). */
  onEliminada: () => void;
};

/**
 * Normaliza un nombre para compararlo con lo que se escribió.
 * @param texto nombre o lo escrito
 * @returns en minúsculas y sin espacios de más
 */
function normalizar(texto: string): string {
  return texto.trim().replace(/\s+/g, ' ').toLocaleLowerCase('es-AR');
}

/**
 * Hoja para eliminar una mascota.
 * @param props ver `Props`
 * @returns el modal
 */
export function EliminarMascota({ visible, mascota, otros, onClose, onEliminada }: Props) {
  const { eliminarMascota } = useAcciones();

  // --- Estado ---
  const [texto, setTexto] = useState('');
  const [eliminando, setEliminando] = useState(false);
  const coincide = normalizar(texto) === normalizar(mascota.nombre);

  // --- Handlers ---
  /** Cierra la hoja y limpia lo escrito (no mientras se está borrando). */
  const cerrar = () => {
    if (eliminando) return;
    setTexto('');
    onClose();
  };

  /** Borra la mascota en el servidor; si falla, muestra el mensaje y la hoja queda abierta. */
  const handleEliminar = async () => {
    if (!coincide) return;
    setEliminando(true);
    try {
      await eliminarMascota(mascota.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTexto('');
      onEliminada();
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('No se pudo eliminar', e instanceof Error ? e.message : 'Intentá de nuevo.');
    } finally {
      setEliminando(false);
    }
  };

  // --- Render ---
  return (
    <FormModal visible={visible} titulo={`¿Eliminar a ${mascota.nombre}?`} onClose={cerrar}>
      <Text style={styles.texto}>
        Se borran para siempre {mascota.nombre}, su carnet sanitario, sus turnos, sus reportes, sus
        códigos de asignación y sus fotos. No se puede deshacer.
      </Text>

      {otros.length > 0 && (
        <View style={styles.otros}>
          <Text style={styles.otrosTitulo}>También pierden el acceso:</Text>
          {otros.map((c) => (
            <Text key={c.id} style={styles.otro}>
              {`· ${c.nombre} (${rolMascota(c.rol).label})`}
            </Text>
          ))}
        </View>
      )}

      <Input
        label={`Escribí "${mascota.nombre}" para confirmar`}
        placeholder={mascota.nombre}
        value={texto}
        onChangeText={setTexto}
        autoCapitalize="words"
        autoCorrect={false}
        editable={!eliminando}
        returnKeyType="done"
      />
      <PrimaryButton
        title="Eliminar para siempre"
        icon="delete-forever"
        iconLeft
        variant="danger"
        onPress={handleEliminar}
        disabled={!coincide}
        loading={eliminando}
      />
      <PrimaryButton title="Cancelar" variant="outline" onPress={cerrar} disabled={eliminando} />
    </FormModal>
  );
}

// --- Estilos ---
const styles = StyleSheet.create({
  texto: {
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  otros: {
    gap: spacing.xs,
    padding: spacing.stackSm,
    borderRadius: radius.md,
    backgroundColor: colors.errorContainer,
  },
  otrosTitulo: {
    ...typography.labelMd,
    color: colors.error,
  },
  otro: {
    ...typography.bodySm,
    color: colors.onSurface,
  },
});
