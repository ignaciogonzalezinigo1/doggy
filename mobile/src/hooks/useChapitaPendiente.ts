/**
 * Hook del login y el registro para no perder el link de una chapita.
 *
 * Dice si hay una chapita esperando (para explicar por qué se pide la cuenta)
 * y da la función que entra a la app: a la tarjeta de esa mascota o, si no hay
 * ninguna, a Mis Mascotas. Relee al volver a la pantalla, porque el link puede
 * llegar con el login ya abierto.
 */
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { leerChapitaPendiente } from '@/services/chapitaPendiente';
import { abrirChapita } from '@/utils/navegacion';

type UseChapitaPendiente = {
  /** true si se llegó por el link de una chapita. */
  hayChapita: boolean;
  /**
   * Entra a la app reemplazando el login en el historial.
   * @returns true si abrió la tarjeta de una chapita, false si fue a Mis Mascotas
   */
  entrar: () => Promise<boolean>;
};

/**
 * Chapita pendiente de mostrar después de ingresar.
 * @returns si hay una y cómo seguir después del login o el registro
 */
export function useChapitaPendiente(): UseChapitaPendiente {
  const [hayChapita, setHayChapita] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let vigente = true;
      leerChapitaPendiente().then((codigo) => {
        if (vigente) setHayChapita(codigo !== null);
      });
      return () => {
        vigente = false;
      };
    }, []),
  );

  const entrar = useCallback(async () => {
    const codigo = await leerChapitaPendiente();
    if (codigo) abrirChapita(codigo, true);
    else router.replace('/mascotas');
    return codigo !== null;
  }, []);

  return { hayChapita, entrar };
}
