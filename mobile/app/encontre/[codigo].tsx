/**
 * Entrada del link de la chapita ("/encontre/DOGGY-XXXX-NOMBRE").
 *
 * Es la ruta que abre el QR escaneado con la cámara del celular, fuera de la
 * app. No tiene interfaz: guarda el código, espera a saber si hay sesión y
 * lleva a "Encontré una mascota" con el código ya leído (con sesión) o al
 * login (sin sesión), que después sigue en la misma tarjeta.
 *
 * El código se guarda antes de mirar la sesión para no perderlo tampoco si el
 * token estaba vencido y el servidor recién lo rechaza al buscar la mascota.
 */
import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { useApp } from '@/context/AppContext';
import { guardarChapitaPendiente } from '@/services/chapitaPendiente';
import { extraerCodigoMascota } from '@/utils/codigos';
import { abrirChapita, volver } from '@/utils/navegacion';

/** Guarda el código del link y sigue a la tarjeta o al login. */
export default function EncontreScreen() {
  const { codigo } = useLocalSearchParams<{ codigo: string }>();
  const { sesion } = useApp();

  useEffect(() => {
    let vigente = true;
    const leido = extraerCodigoMascota(codigo);
    const guardado = leido ? guardarChapitaPendiente(leido) : Promise.resolve();
    guardado
      // Si no se pudo guardar, con sesión el link funciona igual.
      .catch((e: unknown) => console.warn('No se pudo guardar la chapita del link:', e))
      .then(() => {
        if (!vigente || sesion === 'restaurando') return;
        if (sesion === 'abierta') abrirChapita(codigo);
        // Vuelve al login o al registro que estaba abierto, sin perder lo tipeado.
        else volver('/login');
      });
    return () => {
      vigente = false;
    };
  }, [codigo, sesion]);

  return null;
}
