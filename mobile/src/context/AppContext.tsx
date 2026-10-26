/**
 * Estado global de la app (Context API).
 *
 * Maneja la sesión: al abrir la app, si hay un token guardado carga los
 * datos y entra directo; si no, queda en el login. Los datos se piden recién
 * con una sesión abierta (login, registro o token guardado), todos en
 * paralelo, y se exponen a las pantallas junto con las acciones para
 * modificarlos. Al cerrar la sesión, o si el servidor responde 401, se borra
 * el token y se vacía todo, así otro usuario no ve datos del anterior.
 *
 * Sesión vencida: `http.ts` deja colgada la promesa del pedido que dio 401,
 * así la pantalla que lo hizo no muestra un error encima del aviso (se
 * desmonta al volver al login). Las cargas de datos que siguen en vuelo de
 * la sesión anterior (otros pedidos del `Promise.all` que fallan o responden
 * tarde) no escriben en el estado: `sesionActual` cambia al vaciarlo y la
 * carga compara con el valor con el que empezó.
 *
 * Cada acción llama primero al service (la API) y recién con la respuesta
 * actualiza el estado, siempre creando arrays nuevos. Si el servidor responde
 * con un error, la acción lo deja pasar para que la pantalla muestre el mensaje.
 *
 * Fotos: las acciones que guardan una foto (mascota, perfil, reporte y
 * registro) pasan antes los datos por `conFotoSubida`, que sube la foto si es
 * un archivo local del celular y manda la ruta del servidor. Si la subida
 * falla, la acción lanza el error y no se guarda nada.
 */
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';

import * as authService from '@/services/auth';
import type { DatosRegistro, SesionAbierta } from '@/services/auth';
import * as cuidadoresService from '@/services/cuidadores';
import { conFotoSubida } from '@/services/fotos';
import * as mascotasService from '@/services/mascotas';
import * as registrosService from '@/services/registros';
import * as reportesService from '@/services/reportes';
import { registrarAlVencerSesion } from '@/services/http';
import * as sesionService from '@/services/sesion';
import * as turnosService from '@/services/turnos';
import * as usuarioService from '@/services/usuario';
import type {
  CambiosReporte,
  Cuidador,
  CambiosUsuario,
  Invitacion,
  Mascota,
  MascotaPublica,
  NuevaMascota,
  NuevoRegistro,
  NuevoReporte,
  NuevoTurno,
  RegistroSanitario,
  ReportePerdida,
  RolMascota,
  Turno,
  Usuario,
} from '@/types/models';

/**
 * Estado de la sesión: `restaurando` mientras se lee el token guardado al
 * abrir la app (se ve la splash), `abierta` con un usuario logueado y
 * `cerrada` cuando hay que pasar por el login.
 */
export type EstadoSesion = 'restaurando' | 'abierta' | 'cerrada';

type AppContextValue = {
  // --- Sesión ---
  sesion: EstadoSesion;
  // --- Datos ---
  usuario: Usuario | null;
  mascotas: Mascota[];
  registros: RegistroSanitario[];
  turnos: Turno[];
  reportes: ReportePerdida[];
  cuidadores: Cuidador[];
  /** true mientras se cargan los datos de la sesión. */
  cargando: boolean;
  /** Mensaje de error de la última carga, si falló. */
  error: string | null;
  // --- Acciones ---
  recargar: () => Promise<void>;
  iniciarSesion: (email: string, password: string) => Promise<void>;
  /** Crea la cuenta y deja la sesión abierta con ella. */
  registrarse: (datos: DatosRegistro) => Promise<void>;
  cerrarSesion: () => Promise<void>;
  agregarMascota: (datos: NuevaMascota) => Promise<Mascota>;
  editarMascota: (id: number, cambios: Partial<NuevaMascota>) => Promise<Mascota>;
  /** Busca cualquier mascota por el código de su QR (null si no existe). No toca el estado. */
  buscarMascotaPorCodigo: (codigo: string) => Promise<MascotaPublica | null>;
  crearReporte: (datos: NuevoReporte) => Promise<ReportePerdida>;
  editarReporte: (id: number, cambios: CambiosReporte) => Promise<ReportePerdida>;
  /** Cierra un reporte porque la mascota apareció: sale del mapa. */
  cerrarReporte: (id: number) => Promise<void>;
  agregarRegistro: (datos: NuevoRegistro) => Promise<RegistroSanitario>;
  editarRegistro: (id: number, datos: NuevoRegistro) => Promise<RegistroSanitario>;
  borrarRegistro: (id: number) => Promise<void>;
  agregarTurno: (datos: NuevoTurno) => Promise<Turno>;
  editarTurno: (id: number, datos: NuevoTurno) => Promise<Turno>;
  borrarTurno: (id: number) => Promise<void>;
  actualizarUsuario: (datos: CambiosUsuario) => Promise<Usuario>;
  // --- Asignación de mascotas ---
  generarInvitacion: (mascota: Mascota, rol: RolMascota) => Promise<Invitacion>;
  verInvitacion: (token: string) => Promise<Invitacion>;
  /** Acepta un código y devuelve la mascota que se sumó a la cuenta. */
  aceptarInvitacion: (token: string) => Promise<Mascota>;
  desasignarme: (mascotaId: number) => Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);

/**
 * Extrae un mensaje legible de un error desconocido.
 * @param error lo que se capturó en el catch
 * @returns el mensaje para mostrar
 */
function mensajeDeError(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
}

/**
 * Pide todos los datos iniciales en paralelo (evita pedir uno detrás de otro).
 * No toca el estado: solo devuelve lo que respondieron los services.
 * @returns usuario, mascotas, registros, turnos, reportes y cuidadores, en ese orden
 */
function pedirTodo() {
  return Promise.all([
    usuarioService.obtenerUsuario(),
    mascotasService.obtenerMascotas(),
    registrosService.obtenerRegistros(),
    turnosService.obtenerTurnos(),
    reportesService.obtenerReportes(),
    cuidadoresService.obtenerCuidadores(),
  ]);
}

/** Lo que devuelve `pedirTodo`. */
type DatosIniciales = Awaited<ReturnType<typeof pedirTodo>>;

/**
 * Lee el token guardado y, si hay, pide los datos de esa sesión. No toca el
 * estado. Si el token venció, el 401 lo maneja `http.ts` (vuelve al login).
 * @returns los datos, o null si no había sesión guardada
 */
async function restaurarSesion(): Promise<DatosIniciales | null> {
  const token = await sesionService.cargarToken();
  return token ? pedirTodo() : null;
}

/**
 * Vuelve al login sin dejar historial: cierra los modales abiertos y
 * reemplaza la pantalla actual, así "atrás" no vuelve a la app.
 */
function volverAlLogin() {
  if (router.canDismiss()) router.dismissAll();
  router.replace('/login');
}

/**
 * Provider que envuelve la app y mantiene el estado global.
 * @param props.children el árbol de la app
 * @returns el provider con el estado y las acciones
 */
export function AppProvider({ children }: { children: ReactNode }) {
  // --- Estado ---
  const [sesion, setSesion] = useState<EstadoSesion>('restaurando');
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [mascotas, setMascotas] = useState<Mascota[]>([]);
  const [registros, setRegistros] = useState<RegistroSanitario[]>([]);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [reportes, setReportes] = useState<ReportePerdida[]>([]);
  const [cuidadores, setCuidadores] = useState<Cuidador[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /**
   * Número de la sesión actual: aumenta cada vez que se vacía el estado
   * (logout o sesión vencida). Una carga que empezó con otro número es de la
   * sesión anterior y no toca el estado.
   */
  const sesionActual = useRef(0);

  // --- Carga de datos ---
  /**
   * Guarda en el estado los datos que trajo `pedirTodo`.
   * @param datos usuario, mascotas, registros, turnos, reportes y cuidadores
   */
  const aplicarDatos = useCallback(([u, m, r, t, rep, c]: DatosIniciales) => {
    setUsuario(u);
    setMascotas(m);
    setRegistros(r);
    setTurnos(t);
    setReportes(rep);
    setCuidadores(c);
  }, []);

  /** Vacía todos los datos y deja la sesión cerrada (logout o sesión vencida). */
  const limpiarEstado = useCallback(() => {
    sesionActual.current += 1;
    setSesion('cerrada');
    setUsuario(null);
    setMascotas([]);
    setRegistros([]);
    setTurnos([]);
    setReportes([]);
    setCuidadores([]);
    setCargando(false);
    setError(null);
  }, []);

  /** Vuelve a cargar todo desde cero (después del login o con "Reintentar"). */
  const recargar = useCallback(async () => {
    const sesionDeLaCarga = sesionActual.current;
    /** true si mientras se esperaba no se cerró la sesión ni venció. */
    const sigueVigente = () => sesionDeLaCarga === sesionActual.current;
    setCargando(true);
    setError(null);
    try {
      const datos = await pedirTodo();
      if (sigueVigente()) aplicarDatos(datos);
    } catch (e) {
      if (sigueVigente()) setError(mensajeDeError(e));
    } finally {
      if (sigueVigente()) setCargando(false);
    }
  }, [aplicarDatos]);

  // Al abrir la app se busca una sesión guardada. El estado se actualiza en los
  // callbacks de la promesa, y `vigente` evita tocarlo si el provider se
  // desmontó antes de que respondan.
  useEffect(() => {
    let vigente = true;
    const sesionDeLaCarga = sesionActual.current;
    restaurarSesion()
      .then((datos) => {
        if (!vigente || sesionDeLaCarga !== sesionActual.current) return;
        if (datos) aplicarDatos(datos);
        setSesion(datos ? 'abierta' : 'cerrada');
      })
      .catch((e: unknown) => {
        // Si el token venció, `limpiarEstado` ya cerró la sesión: no se pisa.
        if (!vigente || sesionDeLaCarga !== sesionActual.current) return;
        // Con token pero sin servidor (sin red, API apagada) se entra igual:
        // las pantallas muestran el error con "Reintentar".
        setError(mensajeDeError(e));
        setSesion(sesionService.tokenDeSesion() ? 'abierta' : 'cerrada');
      });
    return () => {
      vigente = false;
    };
  }, [aplicarDatos]);

  // Si un pedido responde 401, `http.ts` ya borró el token: acá se vacía el
  // estado y se vuelve al login con un aviso.
  useEffect(() => {
    registrarAlVencerSesion(() => {
      limpiarEstado();
      volverAlLogin();
      Alert.alert('Tu sesión venció', 'Volvé a ingresar con tu email y contraseña.');
    });
    return () => registrarAlVencerSesion(null);
  }, [limpiarEstado]);

  // --- Acciones ---
  /**
   * Guarda el token de una sesión nueva y carga los datos de ese usuario.
   * @param nueva usuario y token que devolvió el servidor
   */
  const abrirSesion = useCallback(
    async (nueva: SesionAbierta) => {
      await sesionService.guardarToken(nueva.token);
      setUsuario(nueva.usuario);
      setSesion('abierta');
      await recargar();
    },
    [recargar],
  );

  /** Inicia sesión con email y contraseña y carga los datos del usuario. */
  const iniciarSesion = useCallback(
    async (email: string, password: string) => {
      await abrirSesion(await authService.iniciarSesion(email, password));
    },
    [abrirSesion],
  );

  /** Crea la cuenta y entra con ella. */
  const registrarse = useCallback(
    async (datos: DatosRegistro) => {
      await abrirSesion(await authService.registrarse(datos));
    },
    [abrirSesion],
  );

  /**
   * Cierra la sesión en el servidor, borra el token y vacía todo el estado.
   * Si el servidor no responde, igual se cierra en el celular: sin el token
   * guardado nadie más puede usar esa sesión desde la app.
   */
  const cerrarSesion = useCallback(async () => {
    try {
      await authService.cerrarSesion();
    } catch (e) {
      console.warn('No se pudo cerrar la sesión en el servidor:', e);
    }
    await sesionService.borrarToken();
    limpiarEstado();
  }, [limpiarEstado]);

  /** Crea una mascota, la suma al final de la lista y trae su asignación (el usuario como dueño). */
  const agregarMascota = useCallback(async (datos: NuevaMascota) => {
    const nueva = await mascotasService.crearMascota(await conFotoSubida(datos, 'foto'));
    setMascotas((prev) => [...prev, nueva]);
    setCuidadores(await cuidadoresService.obtenerCuidadores());
    return nueva;
  }, []);

  /** Modifica los datos de una mascota y la reemplaza en la lista. */
  const editarMascota = useCallback(async (id: number, cambios: Partial<NuevaMascota>) => {
    const actualizada = await mascotasService.actualizarMascota(id, await conFotoSubida(cambios, 'foto'));
    setMascotas((prev) => prev.map((m) => (m.id === id ? actualizada : m)));
    return actualizada;
  }, []);

  /** Publica un reporte de mascota perdida o encontrada. */
  const crearReporte = useCallback(async (datos: NuevoReporte) => {
    const nuevo = await reportesService.crearReporte(await conFotoSubida(datos, 'foto'));
    setReportes((prev) => [...prev, nuevo]);
    return nuevo;
  }, []);

  /** Modifica un reporte publicado y lo reemplaza en la lista. */
  const editarReporte = useCallback(async (id: number, cambios: CambiosReporte) => {
    const actualizado = await reportesService.actualizarReporte(id, await conFotoSubida(cambios, 'foto'));
    setReportes((prev) => prev.map((r) => (r.id === id ? actualizado : r)));
    return actualizado;
  }, []);

  /** Cierra un reporte (la mascota ya apareció) y lo saca de la lista. */
  const cerrarReporte = useCallback(async (id: number) => {
    await reportesService.cerrarReporte(id);
    setReportes((prev) => prev.filter((r) => r.id !== id));
  }, []);

  /** Agrega un registro al carnet sanitario. */
  const agregarRegistro = useCallback(async (datos: NuevoRegistro) => {
    const nuevo = await registrosService.crearRegistro(await conFotoSubida(datos, 'fotoEtiqueta'));
    setRegistros((prev) => [...prev, nuevo]);
    return nuevo;
  }, []);

  /** Corrige un registro del carnet y lo reemplaza en la lista. */
  const editarRegistro = useCallback(async (id: number, datos: NuevoRegistro) => {
    const actualizado = await registrosService.actualizarRegistro(id, await conFotoSubida(datos, 'fotoEtiqueta'));
    setRegistros((prev) => prev.map((r) => (r.id === id ? actualizado : r)));
    return actualizado;
  }, []);

  /** Borra un registro del carnet y lo saca de la lista. */
  const borrarRegistro = useCallback(async (id: number) => {
    await registrosService.borrarRegistro(id);
    setRegistros((prev) => prev.filter((r) => r.id !== id));
  }, []);

  /** Agenda un turno. */
  const agregarTurno = useCallback(async (datos: NuevoTurno) => {
    const nuevo = await turnosService.crearTurno(datos);
    setTurnos((prev) => [...prev, nuevo]);
    return nuevo;
  }, []);

  /** Modifica un turno y lo reemplaza en la lista. */
  const editarTurno = useCallback(async (id: number, datos: NuevoTurno) => {
    const actualizado = await turnosService.actualizarTurno(id, datos);
    setTurnos((prev) => prev.map((t) => (t.id === id ? actualizado : t)));
    return actualizado;
  }, []);

  /** Borra un turno de la agenda y lo saca de la lista. */
  const borrarTurno = useCallback(async (id: number) => {
    await turnosService.borrarTurno(id);
    setTurnos((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /** Actualiza los datos personales del usuario. */
  const actualizarUsuario = useCallback(async (datos: CambiosUsuario) => {
    const actualizado = await usuarioService.actualizarUsuario(await conFotoSubida(datos, 'foto'));
    setUsuario(actualizado);
    return actualizado;
  }, []);

  /**
   * Busca una mascota por el código de su chapita en el servidor, no en
   * `mascotas`: quien encuentra un perro casi nunca está asignado a él.
   */
  const buscarMascotaPorCodigo = useCallback(
    (codigo: string) => mascotasService.buscarMascotaPorCodigo(codigo),
    [],
  );

  /** Genera un código de asignación (solo si el usuario es dueño de la mascota). */
  const generarInvitacion = useCallback(
    (mascota: Mascota, rol: RolMascota) => cuidadoresService.crearInvitacion(mascota, rol),
    [],
  );

  /** Trae una invitación por su código para mostrarla antes de aceptarlo. */
  const verInvitacion = useCallback(
    (token: string) => cuidadoresService.obtenerInvitacion(token),
    [],
  );

  /**
   * Acepta un código: el usuario queda asignado y la mascota aparece en su cuenta
   * (se vuelven a traer las mascotas, las asignaciones, el carnet y los turnos,
   * así la mascota nueva llega con todo lo suyo).
   */
  const aceptarInvitacion = useCallback(async (token: string) => {
    const asignacion = await cuidadoresService.aceptarInvitacion(token);
    const [m, c, r, t] = await Promise.all([
      mascotasService.obtenerMascotas(),
      cuidadoresService.obtenerCuidadores(),
      registrosService.obtenerRegistros(),
      turnosService.obtenerTurnos(),
    ]);
    setMascotas(m);
    setCuidadores(c);
    setRegistros(r);
    setTurnos(t);
    const mascota = m.find((x) => x.id === asignacion.mascotaId);
    if (!mascota) throw new Error('No encontramos la mascota asignada.');
    return mascota;
  }, []);

  /** Desasigna al usuario: la mascota y todo lo suyo salen de su cuenta. */
  const desasignarme = useCallback(async (mascotaId: number) => {
    await cuidadoresService.desasignarme(mascotaId);
    setMascotas((prev) => prev.filter((m) => m.id !== mascotaId));
    setCuidadores((prev) => prev.filter((c) => c.mascotaId !== mascotaId));
    setRegistros((prev) => prev.filter((r) => r.mascotaId !== mascotaId));
    setTurnos((prev) => prev.filter((t) => t.mascotaId !== mascotaId));
  }, []);

  // useMemo evita re-renderizar a todos los consumidores si no cambió nada.
  const value = useMemo<AppContextValue>(
    () => ({
      sesion,
      usuario,
      mascotas,
      registros,
      turnos,
      reportes,
      cuidadores,
      cargando,
      error,
      recargar,
      iniciarSesion,
      registrarse,
      cerrarSesion,
      agregarMascota,
      editarMascota,
      buscarMascotaPorCodigo,
      crearReporte,
      editarReporte,
      cerrarReporte,
      agregarRegistro,
      editarRegistro,
      borrarRegistro,
      agregarTurno,
      editarTurno,
      borrarTurno,
      actualizarUsuario,
      generarInvitacion,
      verInvitacion,
      aceptarInvitacion,
      desasignarme,
    }),
    [
      sesion,
      usuario,
      mascotas,
      registros,
      turnos,
      reportes,
      cuidadores,
      cargando,
      error,
      recargar,
      iniciarSesion,
      registrarse,
      cerrarSesion,
      agregarMascota,
      editarMascota,
      buscarMascotaPorCodigo,
      crearReporte,
      editarReporte,
      cerrarReporte,
      agregarRegistro,
      editarRegistro,
      borrarRegistro,
      agregarTurno,
      editarTurno,
      borrarTurno,
      actualizarUsuario,
      generarInvitacion,
      verInvitacion,
      aceptarInvitacion,
      desasignarme,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/**
 * Hook para leer el estado global desde cualquier pantalla.
 * @returns el valor del contexto
 * @throws si se usa fuera de AppProvider
 */
export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp tiene que usarse dentro de AppProvider.');
  return ctx;
}
