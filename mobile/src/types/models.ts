/**
 * Modelos de datos de Doggy.
 *
 * Son la forma del JSON que viaja con doggy-backend: ids numéricos, fechas
 * como string ISO 8601 y relaciones por id (por ejemplo, `mascotaId`).
 */

/** Usuario dueño de la cuenta (tutor de las mascotas). */
export type Usuario = {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  /** Barrio y ciudad, por ejemplo "Palermo, Buenos Aires". */
  ubicacion: string;
  /** Clave de una foto del seed o ruta en el servidor ("/uploads/abc.jpg"); null si no cargó foto. */
  foto: string | null;
  telefonoEmergencia: string;
};

/** Perro registrado por el usuario (Doggy es solo para perros). */
export type Mascota = {
  id: number;
  tutorId: number;
  nombre: string;
  raza: string;
  /** Edad en años. */
  edad: number;
  /** ID único que se codifica en el QR de la chapita: DOGGY-XXXX-NOMBRE. */
  codigo: string;
  /** Señas particulares para reconocerla. */
  senas: string;
  foto: string | null;
};

/**
 * Lo que devuelve el servidor de una mascota buscada por el código de su
 * chapita: lo necesario para identificarla y el nombre de su tutor, aunque
 * sea de otra familia. El teléfono del tutor solo viene si la mascota está
 * reportada como perdida (o si el usuario está asignado a ella): lo filtra el servidor.
 */
export type MascotaPublica = Pick<Mascota, 'id' | 'nombre' | 'raza' | 'edad' | 'senas' | 'foto' | 'codigo'> & {
  dueno: { nombre: string; telefono?: string };
};

export type TipoRegistro = 'vacuna' | 'desparasitacion' | 'otro';
/**
 * Entrada del carnet sanitario de una mascota. Todo registro es una
 * aplicación ya hecha: no hay registros "pendientes". Lo que viene se indica
 * con `proximaDosis`, como lo anota el veterinario en la libreta.
 * TODO: sumar el código único de la vacuna validado con SENASA.
 */
export type RegistroSanitario = {
  id: number;
  mascotaId: number;
  tipo: TipoRegistro;
  /** Nombre de la vacuna, antiparasitario o práctica. */
  nombre: string;
  /** Fecha de aplicación (ISO, nunca futura). */
  fecha: string;
  /** Veterinario o clínica. */
  profesional: string;
  /** Fecha del próximo refuerzo (ISO), si el veterinario la indicó. */
  proximaDosis?: string;
  /**
   * Foto de la etiqueta de la vacuna (el sticker con marca, lote y
   * vencimiento que se pega en la libreta), como constancia. Opcional y solo
   * en vacunas. Clave del seed o ruta "/uploads/...", como el resto de las fotos.
   */
  fotoEtiqueta?: string;
};

export type CategoriaTurno = 'vacunas' | 'veterinario' | 'peluqueria';

/** Turno agendado para una mascota. */
export type Turno = {
  id: number;
  mascotaId: number;
  categoria: CategoriaTurno;
  /** Fecha y hora del turno. */
  fecha: string;
  motivo: string;
  lugar: string;
};

export type EstadoReporte = 'perdido' | 'encontrado';

/** Reporte de un perro perdido o encontrado en la vía pública. */
export type ReportePerdida = {
  id: number;
  /** Mascota registrada en la app, o null si la reportó alguien que la encontró. */
  mascotaId: number | null;
  /** Usuario que hizo el reporte. */
  autorId: number;
  estado: EstadoReporte;
  nombre: string;
  raza: string;
  descripcion: string;
  foto: string | null;
  /** Etiquetas libres ("Collar rojo", "Asustadizo"). En Prisma va a ser una tabla aparte. */
  etiquetas: string[];
  lat: number;
  lng: number;
  /** Zona legible, por ejemplo "Palermo, CABA". */
  zona: string;
  /** Momento en que se perdió o se encontró. */
  fecha: string;
  /**
   * Radio de búsqueda en metros alrededor de `lat`/`lng`: la zona donde el
   * tutor la vio por última vez. Solo lo tienen los reportes de mascotas propias.
   */
  radioMetros?: number;
  /** Datos extra del tutor: ropa que tenía puesta, arnés, cómo reacciona, etc. */
  infoAdicional?: string;
  /**
   * Quién encontró a la mascota, para avisarle. Solo viene en los reportes
   * "encontrado" de una mascota del usuario que publicó otra persona.
   */
  contacto?: { nombre: string; telefono: string };
};

export type TipoCuidador = 'familia' | 'clinica' | 'paseador';

/**
 * Rol de una persona sobre una mascota.
 * - dueno: puede asignar a otras personas (generar códigos de asignación).
 * - invitado: tiene la mascota en su cuenta pero no puede asignar a nadie.
 * Cualquiera de los dos puede desasignarse, salvo el último dueño.
 */
export type RolMascota = 'dueno' | 'invitado';

/**
 * Persona o institución asignada a una mascota (la tabla que une usuarios y
 * mascotas). El tutor que la dio de alta también figura acá, como dueño.
 */
export type Cuidador = {
  id: number;
  mascotaId: number;
  /** Usuario asignado. */
  usuarioId: number;
  nombre: string;
  rol: RolMascota;
  /** Detalle de la tarea o el vínculo: "Hogar secundario", "Paseos de lunes a viernes". */
  detalle: string;
  /** Tipo de vínculo, para el ícono: familia, clínica o paseador. */
  tipo: TipoCuidador;
  foto: string | null;
};

/**
 * Código de asignación de una mascota. Lo genera un dueño con un rol; quien lo
 * carga y lo acepta queda asignado con ese rol. Es de un solo uso.
 */
export type Invitacion = {
  /** Código de asignación. */
  token: string;
  mascotaId: number;
  rol: RolMascota;
  /** Dueño que generó el código. */
  creadaPorId: number;
  usada: boolean;
  /** Datos de la mascota para mostrar la invitación antes de aceptarla. */
  mascota: Pick<Mascota, 'nombre' | 'raza' | 'foto'>;
};

/** Datos que se mandan para crear una mascota (el id y el código los asigna el servidor). */
export type NuevaMascota = Omit<Mascota, 'id' | 'codigo' | 'tutorId'>;
export type NuevoRegistro = Omit<RegistroSanitario, 'id'>;
export type NuevoTurno = Omit<Turno, 'id'>;
/**
 * Reporte nuevo. La app ya no carga etiquetas: solo se muestran las que ya
 * tenían. Con `mascotaId`, el nombre y la raza no hace falta mandarlos: el
 * servidor los toma de la mascota (y los ignora si vienen).
 */
export type NuevoReporte = Omit<
  ReportePerdida,
  'id' | 'autorId' | 'etiquetas' | 'contacto' | 'nombre' | 'raza'
> &
  Partial<Pick<ReportePerdida, 'nombre' | 'raza'>>;
/**
 * Cambios de un reporte publicado (PATCH): lo que no viene no se toca y
 * `infoAdicional: null` la borra (un `undefined` no viaja en el JSON).
 */
export type CambiosReporte = Partial<Omit<NuevoReporte, 'infoAdicional'>> & {
  infoAdicional?: string | null;
};
export type DatosUsuario = Partial<Omit<Usuario, 'id'>>;
