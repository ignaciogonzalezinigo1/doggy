# Doggy — reglas del proyecto (Sprint 2)

Proyecto de la materia Programación de Aplicaciones Móviles (UCA).

- **Sprint 1 (hecho):** frontend en `mobile/` con Expo (hoy en SDK 58), TypeScript estricto y Expo Router. Los datos vivían en memoria y los services simulaban la red.
- **Sprint 2 (ahora):**
  - conectar la app al backend, que vive en **otro repositorio**: `doggy-backend`, clonado al lado de este (`../doggy-backend`). Usa Express + TypeScript + Prisma + SQLite;
  - sumar gestos con `react-native-gesture-handler` + `react-native-reanimated` (ya instalados en `mobile/`, no reinstalar).

Material de referencia en `_referencias/` (diseño, consignas, apuntes de la cátedra y las reglas del Sprint 1). No se versiona. Este archivo sí se versiona: lo compartimos entre los integrantes.

## Dos repositorios: este es solo el front

La cátedra pide el front y el back en repositorios separados.

- **Este repo (`doggy`) nunca contiene código del backend:** ni carpeta `backend/`, ni `schema.prisma`, ni rutas de Express, ni la base SQLite.
- La app solo conoce la API por HTTP, en la URL de `EXPO_PUBLIC_API_URL` (`mobile/src/config.ts`). Desde el celular hay que usar la IP local de la PC, no `localhost`.
- Las reglas de Express y Prisma (validación en el servidor, filtrado del body, manejo de errores de Prisma) están en el `CLAUDE.md` de `doggy-backend`.

```
doggy (este repo): pantallas → AppContext → services → HTTP ──► doggy-backend: Express → Prisma → SQLite
```

## Conectar el frontend sin tocar las pantallas

- Las pantallas y `mobile/src/context/AppContext.tsx` **no deberían cambiar** al conectar el backend.
- Lo que cambia son las funciones de `mobile/src/services/`: usan `pedirJson()` o, para los 204, `pedirSinRespuesta()` (`mobile/src/services/http.ts`), manteniendo la misma firma y los mismos tipos de retorno.
- Los dos revisan `response.ok` y lanzan un `Error` con el `{ error }` que manda el servidor. El contexto deja pasar esos errores y cada pantalla o formulario muestra el mensaje.
- Si una pantalla necesita un cambio para el backend, frená y explicá por qué antes de tocarla.

## Contrato con doggy-backend

Lo que sigue lo tienen que respetar los dos repos. **Si algo del contrato cambia, hay que cambiarlo en los dos:** acá (services, tipos y esta sección) y en `doggy-backend` (rutas y su `CLAUDE.md`).

### Endpoints

Cada función de `services/` tiene comentado su endpoint, con la ruta y el cuerpo que manda.

| Recurso | Endpoints |
| --- | --- |
| Auth | `POST /api/auth/registro`, `POST /api/auth/login`, `POST /api/auth/logout` |
| Usuario | `GET /api/usuarios/me`, `PATCH /api/usuarios/me` |
| Mascotas | `GET /api/mascotas`, `GET /api/mascotas/codigo/:codigo`, `POST /api/mascotas`, `PATCH /api/mascotas/:id` |
| Registros | `GET /api/registros`, `POST /api/mascotas/:id/registros`, `PATCH /api/registros/:id`, `DELETE /api/registros/:id` |
| Turnos | `GET /api/turnos`, `POST /api/turnos`, `PATCH /api/turnos/:id`, `DELETE /api/turnos/:id` |
| Reportes | `GET /api/reportes`, `POST /api/reportes`, `PATCH /api/reportes/:id` (también para cerrarlo) |
| Cuidadores | `GET /api/cuidadores`, `DELETE /api/mascotas/:id/cuidadores/me` |
| Invitaciones | `POST /api/mascotas/:id/invitaciones`, `GET /api/invitaciones/:token`, `POST /api/invitaciones/:token/aceptar` |
| Fotos | `POST /api/fotos` (multipart), `GET /uploads/<nombre>` (público) |

- Los modelos de `mobile/src/types/models.ts` son la forma del JSON que viaja: ids numéricos, fechas como string ISO y relaciones por id.
- Para modificar se usa **PATCH, nunca PUT**: un campo que no viene no se toca.
- **Para borrar un opcional en un PATCH se manda `null`** (`proximaDosis`, `fotoEtiqueta`, `infoAdicional`, `foto`). Mandar `undefined` no sirve: `JSON.stringify` lo descarta y el servidor deja el valor viejo.
- **Cerrar un reporte ("Ya apareció") es `PATCH /api/reportes/:id` con `{ cerrado: true }`**, no un DELETE: el reporte queda guardado como historial y `GET /api/reportes` devuelve solo los activos. Un reporte cerrado no se puede editar ni reabrir (409).
- **Permisos:** solo se escribe sobre mascotas a las que el usuario está asignado, como dueño o invitado (403 si no). Generar códigos de asignación es solo para dueños. Un reporte `encontrado` puede llevar el `mascotaId` de una mascota ajena (la que identificó el QR).
- **Quién edita o cierra un reporte:** quien lo publicó o cualquier usuario asignado a la mascota del reporte. Un reporte sin `mascotaId` solo lo edita o cierra su autor. Si no, 403.
- Una mascota tiene como mucho un reporte `perdido` activo: un segundo responde 409 con "Esta mascota ya está reportada como perdida. No se puede reportar de nuevo.". Y como mucho un `encontrado` activo: el segundo responde 409 "Ya le avisaron a su familia.". Con `mascotaId`, el `nombre` y la `raza` no hace falta mandarlos: el servidor los toma de la mascota.
- **Buscar por el código del QR:** `GET /api/mascotas/codigo/:codigo` (con token) → 200 `MascotaPublica` (`id`, `nombre`, `raza`, `edadMeses`, `senas`, `foto`, `codigo` y `dueno: { nombre, telefono? }`, con el teléfono en E.164; sin `tutorId`, carnet ni otros datos del dueño; `telefono` solo si la mascota tiene un `perdido` activo o el usuario está asignado), 400 si no es `DOGGY-XXXX-NOMBRE`, 404 si no existe. Es la única lectura de una mascota ajena y acepta minúsculas o espacios alrededor. La usa el escáner de "Encontré una mascota" (con cámara o desde una foto) por medio de `buscarMascotaPorCodigo` (`services/mascotas.ts`, devuelve `null` en un 404) y del `AppContext`, que no guarda nada en el estado. El código **nunca se busca en `mascotas` del contexto**: ahí están solo las del usuario, y quien encuentra un perro casi nunca es su dueño. Con la respuesta se completa el formulario y el reporte `encontrado` se publica con ese `id` como `mascotaId`.
- Cuando el servidor responde un error, `http.ts` lanza un `ErrorApi` con el `status`; si no se pudo llegar al servidor, un `Error` común. Así el escáner distingue "no reconocido" (404, vibración de error) de "sin conexión".
- Las reglas de `mobile/src/utils/validaciones.ts` (`LIMITES`, caracteres permitidos, formatos y rangos de fechas) son las mismas que aplica el servidor. Si una cambia acá, cambia allá.

### Fotos

- **`POST /api/fotos`** (con token): `multipart/form-data` con el archivo en el campo `foto` → 201 `{ foto: "/uploads/<nombre>.jpg" }`. 400 si no vino o no es JPG, PNG ni WEBP (el servidor mira el contenido, no el nombre); 413 si pesa más de 5 MB. Lo hace `subirFoto(uri)` en `mobile/src/services/fotos.ts`: arma un FormData con un `File` de `expo-file-system` (en web, un Blob sacado de la URI `blob:`) y no pone `Content-Type` a mano (`http.ts` lo omite si el body es un FormData y `expo/fetch` lo arma con el boundary). Ver "Subir archivos en SDK 58" en Stack. Espera hasta 30 s en vez de 10.
- **`GET /uploads/<nombre>`** es público (sin token), así `Image` carga la foto sin headers.
- **En los modelos se guarda la ruta relativa** (`/uploads/abc.jpg`), no la URL completa, porque la IP de la PC cambia. `fuenteFoto` (`mobile/src/data/fotos.ts`) la convierte en `{ uri: API_URL + foto }`. Las claves de las fotos del seed (`luna`, `sofia`, …) siguen resolviéndose a las imágenes empaquetadas.
- **Los campos de foto** (`foto` de mascota, usuario y reporte; `fotoEtiqueta` de registro) solo aceptan `null`, una clave del seed o una ruta `/uploads/` que exista. Una URI del celular (`file://`, `content://`, `blob:`) da 400: es un archivo temporal que se pierde al cerrar la app y nadie más ve.
- **Subir antes de guardar, en un solo lugar:** las acciones del `AppContext` que guardan fotos (`agregarMascota`, `editarMascota`, `actualizarUsuario`, `crearReporte`, `editarReporte`, `agregarRegistro`, `editarRegistro`) pasan los datos por `conFotoSubida(datos, campo)`. Si la foto es local la sube y manda la ruta que devolvió el servidor; si no cambió (ya es `/uploads/...` o una clave del seed) no sube nada. Si la subida falla, la acción lanza el error: el formulario lo muestra y no se cierra, y el botón de guardar queda deshabilitado mientras dura (es el mismo estado `guardando`/`enviando` del formulario; en el perfil, la foto muestra el spinner).
- Cuando una foto se reemplaza o se borra, el servidor borra el archivo viejo si ningún otro registro lo usa.

### Sesión

- `POST /api/auth/registro` `{ nombre, apellido, email, telefonoEmergencia, telefonoFijo?, password }` → 201 `{ usuario, token }`; 400 si un dato no es válido (también si falta el teléfono o no es un número real; se guarda en E.164) (mismas reglas que la pantalla de registro), 409 si el email ya tiene cuenta. El email se guarda en minúsculas. `ubicacion` y `telefonoEmergencia` quedan como `""` hasta que el usuario los complete con `PATCH /api/usuarios/me`.
- `POST /api/auth/login` `{ email, password }` → 200 `{ usuario, token }`; 401 con `"Email o contraseña incorrectos"`, el mismo mensaje si el email no existe o si la contraseña no coincide.
- `POST /api/auth/logout` → 204 sin body; desde ahí ese token responde 401.
- **Todas las demás rutas mandan `Authorization: Bearer <token>`**, salvo `/api/health`. Sin header, con un token que no existe, vencido (30 días) o cerrado, responden **401**: la app borra el token y vuelve al login.
- El token es aleatorio (64 caracteres hex) y el servidor guarda solo su SHA-256 en la tabla `Sesion`, así el logout lo invalida al instante.
- En la app, el token se guarda con `expo-secure-store` (`mobile/src/services/sesion.ts`) para que la sesión sobreviva al cerrar la app, y `pedirJson`/`pedirSinRespuesta` lo suman al header. Un 401 de cualquier ruta salvo el login (credenciales incorrectas) y el logout (token ya cerrado) borra el token, limpia el estado y vuelve al login con un aviso.

### Códigos de estado

La tabla de la práctica Prisma muestra los códigos que usó esa práctica, pero no es una lista cerrada. La regla es responder con el status que corresponde a cada caso, y la app tiene que manejarlos todos:

| Status | Cuándo |
| --- | --- |
| 200 | GET o PATCH salió bien (PATCH para cambiar una parte, **nunca PUT**) |
| 201 | POST creó el recurso (se devuelve lo creado) |
| 204 | DELETE salió bien, **sin body** |
| 400 | datos o id inválidos |
| 401 | sin `Authorization: Bearer`, token inválido, vencido o cerrado con logout; login con email o contraseña incorrectos |
| 403 | con sesión, pero sin permiso sobre ese recurso |
| 404 | no existe |
| 409 | conflicto con el estado actual: email ya registrado, ya asignado a la mascota, único dueño que quiere desasignarse, reporte ya cerrado, mascota ya reportada |
| 410 | código de asignación ya usado |
| 413 | la foto subida pesa más de 5 MB, o el body JSON más de 100 KB |
| 500 | error imprevisto |

- Todo error llega como `{ error: "mensaje en español" }`. La app muestra ese mensaje tal cual, sin armar textos propios por status, salvo en casos puntuales (por ejemplo, un 401 lleva al login).
- Los errores genéricos de largo y caracteres llevan el campo adelante ("Nombre: puede tener hasta 30 caracteres."), porque la app los muestra en un Alert y no debajo del input.
- Una respuesta 204 no trae body: la app no tiene que intentar leer JSON de ella (se pide con `pedirSinRespuesta`).

## Decisiones

### Contrato con doggy-backend

- **Resuelta: 410 para links de asignación.** `GET /api/invitaciones/:token` y `POST /api/invitaciones/:token/aceptar` responden 410 si el código ya se usó, y 404 si no existe.
- **Resuelta: los códigos de asignación no vencen.** Son de un solo uso: sirven hasta que alguien los acepta y después responden 410. Se sacó el vencimiento a los 7 días (`Invitacion.vence` en el schema, `DIAS_VIGENCIA_INVITACION` y el 410 por vencido) y la app dice "Es de un solo uso" donde se genera y donde se ingresa el código.
- **Resuelta (Etapa 3B): `PATCH` en vez de `PUT`.** `actualizarRegistro` y `actualizarTurno` usan `PATCH` con todos los datos del formulario; en el registro, los opcionales que no vienen se mandan como `null` para que se borren.
- **Resuelta (Etapa 3B): flujos que escribían en el mock y leían de la API.** Alta de mascota y aceptar un código de asignación van contra la API (`POST /api/mascotas`, `GET /api/invitaciones/:token` y `POST /api/invitaciones/:token/aceptar`). Se borraron `mobile/src/data/mock.ts`, `simularRespuesta`, `siguienteId`, `idsMascotasDe` y `asignarCreador`; los datos de ejemplo viven en el seed de `doggy-backend`.
- **Resuelta (Etapa 3B): 204 sin body.** `pedirSinRespuesta` (`services/http.ts`) solo revisa `response.ok` y no lee JSON. La usan los DELETE.
- **Resuelta: pull-to-refresh.** Las pantallas con datos compartidos (Mis Mascotas, Perdidos, perfil y carnet de la mascota, Agenda y Perfil) usan `useRefresco`, que conecta un `RefreshControl` con los colores del tema a `refrescar` del `AppContext`. `refrescar` usa los mismos services que la carga inicial (`pedirTodo`), no pone `cargando` (los datos siguen a la vista) y, si falla, avisa con un Alert y conserva lo que había. El mapa de Perdidos no tiene scroll: ahí hay un botón "Actualizar".
- **Resuelta: rendimiento.** Diagnóstico (de mayor a menor impacto): el modo desarrollo de Expo Go (lo más pesado, no es del código); imágenes de 800 px con el `Image` de React Native en avatares chicos (pasaron a `expo-image`, con caché y decodificado al tamaño en pantalla); re-renders de todo el árbol con cada cambio del contexto (las acciones van en un contexto aparte, `useAcciones`, y las cards de las listas con `memo`). La carga inicial ya era en paralelo, no hay pedidos repetidos al enfocar, los selectores costosos están en `useMemo` y los endpoints responden en 3 a 12 ms.
- **Resuelta: textos sin género para las mascotas y tarjeta del QR a todo el ancho.** Los textos que van con el nombre de un perro no asumen femenino: "Se perdió: avisale a su familia.", "Reporte de pérdida activo", "Reportar pérdida", "Ya volvió a casa", "Avisó {nombre}", "Se encontró". Donde "la" se refiere a "la mascota" (por ejemplo, "¿Dónde la viste por última vez?" en "Se perdió mi mascota") queda igual. La tarjeta del QR tiene arriba la foto con nombre, raza y edad, y debajo, a todo el ancho, la familia, el aviso, el teléfono y los botones del mismo ancho. El título de `ScreenHeader` se achica hasta el 75 % antes de cortarse.
- **Resuelta: fotos de la demo con licencia.** Todas las fotos del seed (usuarios, mascotas y reportes) son de Unsplash, con autor y link en `CREDITOS.md`, a 800 px como máximo y JPG calidad 80. Las claves están en `FOTOS_LOCALES` (`src/data/fotos.ts`) y en `CLAVES_FOTO_SEED` del backend: si se suma una foto, va en los dos y en `CREDITOS.md`.
- **Resuelta: deslizar para borrar en el carnet.** No andaba con una sola vacuna porque el registro con próximo refuerzo sale del historial y se dibuja en `ProximoRefuerzoCard`, que no era deslizable; y andaba mal porque `ReanimatedSwipeable` no deja poner `failOffsetY`: se activaba con 10 px hacia la derecha y le robaba el scroll a la lista. Ahora `DeslizarParaBorrar` es un `usePanGesture` propio (`activeOffsetX` ±20 y `failOffsetY` ±10), envuelve también a `ProximoRefuerzoCard` (el borrado está en `useEliminarRegistro`) y la lista del carnet es la `FlatList` de gesture-handler, para que el scroll y el swipe se coordinen.
- **Resuelta: el visor de fotos sin rotación y con el gesto en toda la pantalla.** Pellizco de 1x a 4x con foco en los dedos, arrastre solo con zoom y con límites (goma en el borde), doble toque a 2,5x en el punto tocado o vuelta a 1x, y para cerrar la X (44x44, dentro del safe area) o deslizar hacia abajo sin zoom. El toque simple no hace nada. Combinación: `useCompetingGestures(dobleToque, useSimultaneousGestures(pinch, pan))`: el pellizco y el arrastre van a la vez, y el doble toque compite con ellos: gana el primero que se activa. Así el arrastre no espera a que falle el doble toque (como pasaba con `useExclusiveGestures`) y en iOS el pellizco no se traba.
- **Resuelta: "Otro" en el carnet se describe.** Se reusa el campo `nombre` del registro (obligatorio en la app y en el servidor): en "Otro" el formulario lo llama "Descripción" ("Ej: consulta, castración, análisis de sangre, medicación…") y es el título de la card. No hizo falta migrar nada. "Ver etiqueta" pasó a ser un botón con miniatura de la foto, borde y 44 px de alto.
- **Resuelta: el QR se descarga y se comparte como imagen, solo desde el perfil.** `QrIdentificacion` tiene un único "Descargar QR" y un único "Compartir QR" (se sacó el "Compartir QR" del menú de mantener presionada la card, que compartía solo texto). La imagen es `FichaQr`, una vista fuera de la pantalla con fondo blanco, el nombre arriba, el QR grande y "Escaneame con Doggy" abajo; `react-native-view-shot` la captura como PNG en un archivo temporal (es lo más simple: no hay que dibujar la imagen a mano, y viene en Expo Go). Compartir manda el archivo con `expo-sharing`. Descargar pide solo permiso de escritura de fotos (`requestPermissionsAsync(true, ['photo'])` de `expo-media-library`) y guarda con `Asset.create` (en SDK 58 los métodos viejos, como `saveToLibraryAsync`, tiran error si se importan de `expo-media-library`); si no se da el permiso o falla, ofrece la hoja de compartir, que tiene "Guardar imagen". Las tres dependencias se sumaron con `npx expo install`. Está en `hooks/useQrImagen.ts`.
- **Resuelta: el teléfono se pide en el registro.** Antes el registro no lo pedía y la cuenta quedaba con `telefonoEmergencia` vacío hasta completar el perfil, así que si la mascota se perdía antes, nadie podía llamar. Ahora es obligatorio en `POST /api/auth/registro` (400 si falta o no es un número válido) y se guarda en E.164, igual que en el perfil (en el servidor las dos rutas usan `leerTelefono`). En la app, el registro y el perfil usan el mismo `InputTelefono` (placeholder "Ej: 11 4589-2310", filtro y la casilla "Es un teléfono fijo").
- **Resuelta: WhatsApp solo para celulares y solo cuando el teléfono ya es visible.** El link se arma con una sola función, `enlaceWhatsApp` (`utils/telefonos.ts`: `https://wa.me/<número sin +>?text=<texto>`), y se abre con `Linking.openURL` (`BotonWhatsApp`, que avisa si no se puede abrir). El botón aparece solo si `esCelular` (tipo MOBILE o FIXED_LINE_OR_MOBILE de libphonenumber-js): a un fijo no se le puede escribir, así que queda solo el link `tel:`. Quien encuentra una mascota ve "Avisar por WhatsApp" en la tarjeta del QR **solo si está perdida**, porque es la única situación en que el servidor manda el teléfono del tutor; el mensaje lleva el punto del mapa (o la ubicación actual, pidiendo permiso recién al tocar) y va sin ubicación si no hay. El tutor ve "Escribirle por WhatsApp" en "¡Encontraron a …!", con el contacto que el servidor solo les manda a los asignados a la mascota, y el punto del reporte en Google Maps. Un teléfono fijo (marcado con "Es un teléfono fijo") no ofrece WhatsApp.
- **Resuelta: teléfonos en E.164, celular por defecto.** Se validan y normalizan con libphonenumber-js (metadata `/max`, región AR) en el servidor (`src/lib/telefonos.ts`, `aE164`) y en la app (`utils/telefonos.ts`, la misma regla). En la Argentina **todo número es celular salvo que se marque "Es un teléfono fijo"**: "2994554060", "299 455-4060", "0299 15 455-4060", "+54 299 455 4060" y "5492994554060" dan `+5492994554060`. Motivo: libphonenumber, sin el 9 ni el 15, toma el número como fijo, y casi todos cargan su celular así; con la regla vieja no se podía cargar "2994554060" como celular (quedaba `+542994554060`, sin WhatsApp). Con la casilla marcada se guarda sin el 9 (`+542994554060`); el servidor la recibe como `telefonoFijo` en el mismo body del registro o del perfil y no la guarda aparte, porque el E.164 ya dice cuál es (al editar, la casilla aparece marcada si el teléfono guardado es fijo). Si no es un número real, 400. Las pantallas lo muestran legible ("+54 9 299 455-4060") y los links `tel:` y de WhatsApp usan E.164. Los números de otros países quedan como son. El único campo de teléfono es `Usuario.telefonoEmergencia` (las clínicas también son usuarios). Los datos viejos se pasan con `npm run db:normalizar-telefonos`.
- **Resuelta: fecha de nacimiento en lugar de edad.** `Mascota.edad` (años) se reemplazó por `Mascota.fechaNacimiento` (sin hora, AAAA-MM-DD), no futura y de hace como mucho 30 años. Motivo: una edad guardada queda vieja al año; la fecha no. La edad se calcula en meses cumplidos y se muestra con una sola función, `textoEdad` (`utils/etiquetas.ts`): "3 años", "5 meses" o "Menos de 1 mes". `GET /api/mascotas/codigo/:codigo` no manda la fecha: manda `edadMeses`, calculada en el servidor. Las bases viejas se migran con `npm run db:migrar-fecha-nacimiento` (suma la columna, la completa con hoy menos la edad y recién después saca `edad`).
- **Resuelta: se puede avisar que encontraron una mascota que no está perdida.** Quien escanea el QR puede publicar el `encontrado` aunque la mascota no tenga un `perdido` activo, a propósito: la familia puede no saber todavía que se escapó, y es la única forma de avisarle, porque en ese caso el servidor no muestra el teléfono del tutor. A cambio, el tutor ve el nombre y el teléfono de quien la encontró (`contacto`), y la app lo dice antes de publicar ("Le vamos a mostrar tu nombre y teléfono para que te contacte"). Una mascota tiene como mucho un `encontrado` activo: el segundo responde 409 "Ya le avisaron a su familia.", para que la familia no reciba el mismo aviso varias veces.
- **Resuelta: los datos de la mascota de un reporte salen de la mascota.** Si el reporte trae `mascotaId`, el servidor ignora el `nombre` y la `raza` del body y usa los de la mascota (en un `perdido`, también la foto y las señas; en un `encontrado`, la foto si quien la encontró no mandó una del momento). En el PATCH de esos reportes, `nombre` y `raza` no son campos editables. Antes, quien escaneaba el QR podía cambiarlos en el formulario: no tocaba la mascota (un PATCH a una mascota ajena da 403), pero el reporte mostraba lo que tipeó.
- **Resuelta: privacidad al escanear el QR.** Quien no está asignado a la mascota ve nombre, edad, raza, foto y el nombre del tutor. El teléfono del tutor (`telefonoEmergencia`) aparece solo si la mascota tiene un reporte `perdido` activo, como link `tel:`. El filtro está en el servidor (`GET /api/mascotas/codigo/:codigo` no manda `dueno.telefono` si no corresponde): ocultarlo en la app no alcanza, porque cualquiera puede llamar a la API. Quien está asignado (dueño o invitado) lo ve siempre.
- **Resuelta: un solo reporte de perdido por mascota.** "Se perdió mi mascota" ya no avisa que se van a duplicar: si la mascota elegida ya está perdida, muestra "Esta mascota ya está reportada como perdida. No se puede reportar de nuevo." con "Ver o editar el reporte" y no deja publicar. El servidor responde 409 con el mismo texto, que la app muestra tal cual si llega igual.
- **Resuelta: "¡Encontraron a …!".** Si una mascota del usuario tiene un reporte `encontrado` activo (`reporteEncontrado` en `utils/selectores.ts`), Mis Mascotas y el perfil de la mascota muestran el aviso con dónde, cuándo, la descripción y el contacto de quien la encontró (`contacto`, que el servidor manda solo a los asignados). "Ya volvió a casa" (`useRecuperarMascota`) pide confirmación y cierra el `encontrado` y el `perdido` activo, si hay, con dos `PATCH { cerrado: true }`: no hizo falta cambiar el backend, porque quien está asignado ya podía cerrar los dos.
- **Resuelta: el escáner de QR busca en el servidor.** Buscaba el código en las mascotas del `AppContext`, que desde la Etapa 3B son solo las del usuario, así que el QR de un perro ajeno daba "no reconocido". Ahora va contra `GET /api/mascotas/codigo/:codigo`. Cambiaron `app/reportar.tsx` (la lectura es asíncrona y distingue 404 de falta de conexión) y `EscanerQr`, que espera la búsqueda con el lector bloqueado y muestra "Buscando…". Se borró `buscarMascotaPorCodigo` de `utils/selectores.ts`.
- **Resuelta (Etapa 6A): sesión vencida sin estado trabado.** `http.ts` deja colgada la promesa del pedido que dio 401 y las pantallas que la esperaban se desmontan al volver al login. Lo único que sobrevivía era una carga del `AppContext` de la sesión anterior (otro pedido del `Promise.all` que fallaba o respondía tarde), que podía escribir `error`, `cargando` o datos viejos en la sesión nueva. Ahora `sesionActual` (un `useRef`) aumenta en `limpiarEstado`, y `recargar` y la restauración al abrir la app ignoran el resultado si cambió.
- **Resuelta (Etapa 4C): fotos en el servidor.** Antes la foto se guardaba como la URI local del celular y se perdía al cerrar la app. Ahora se sube con `POST /api/fotos` antes de guardar y viaja la ruta `/uploads/...`. La subida va en el `AppContext` (`conFotoSubida`) y no en cada formulario, para no repetirla. La única pantalla que cambió es el perfil (`app/(tabs)/perfil.tsx`): la foto se guarda apenas se elige, sin formulario, y necesitaba su propio estado de carga.

### Código

- **Resuelta: efectos con setState (`react-hooks/set-state-in-effect`).** No se silencia con `eslint-disable`. Se resuelve así:
  - cargar datos al montar: separar una función que pide y devuelve los datos sin tocar el estado (como `pedirTodo` en `AppContext` o `leerGps` en `useUbicacion`) de otra que los aplica, y aplicarlos en el `.then` de la promesa, con una bandera `vigente` para la limpieza. La regla marca cualquier función con setState que se llame desde el efecto, aunque el setState esté después de un `await`;
  - reaccionar a un cambio de prop o param: ajustar el estado durante el render guardando el valor anterior (como `seleccionadoPrevio` en `ReporteMarker` o `reporteRecibido` en Perdidos), y dejar en el efecto solo lo imperativo (timers, mover el mapa);
  - dependencias de un hook que devuelve un objeto nuevo en cada render (como `gps`): desestructurar la función estable (`const { obtenerDireccion } = gps`) y depender de ella, nunca del objeto entero, porque genera un loop.

### Para revisar

- **Header de los modales en iOS (cambiado, falta verlo en un iPhone).** La variante `bar` de `ScreenHeader` sumaba `insets.top` también dentro de los modales tipo hoja, donde la hoja ya arranca debajo de la barra de estado. Ahora `reportar`, `mi-mascota-perdida` y `asignar` pasan `enModal` y en iOS no se suma; en Android sigue igual. No se pudo probar en un iPhone ni en el simulador: confirmar que el header no quede pegado arriba.
- **Foto de Nieve.** El reporte de ejemplo de Nieve (`prisma/seed.ts` de `doggy-backend`) no tiene foto. El placeholder se ve bien (huellita en la card, inicial con huellita en el detalle), así que no es urgente; si el equipo consigue una foto de un perro blanco con permiso de uso, se suma al seed y a `FOTOS_LOCALES`.
- **Resuelto (Etapa 6A): título del mes del calendario en web.** `adjustsFontSizeToFit` no funciona en el navegador. Debajo de 360 de ancho el título va más chico y sin el ícono: "Septiembre 2026" entra entero a 320 px (probado en la web).
- **Metadatos de `icon.png`.** El archivo original del logo (`mobile/assets/images/icon.png`) conserva sus metadatos de procedencia (C2PA); los íconos derivados (splash, logo y adaptive icon) no los tienen porque se volvieron a guardar. Queda a decisión del equipo si se deja así.

## Gestos (gesture-handler + reanimated)

- Se anima con `useSharedValue` y `useAnimatedStyle`, en el hilo de UI.
- Se usa la API de hooks de gesture-handler 3 (`usePanGesture`, `useLongPressGesture`, `useExclusiveGestures`, etc.), no los builders `Gesture.*`. Ver la tabla "API de gestos" del README.
- Se vuelve al hilo de JS con `scheduleOnRN` (de `react-native-worklets`, reemplaza a `runOnJS`) solo cuando el gesto se activa o termina (`onActivate`, `onDeactivate`), **nunca** en `onUpdate`. Para la háptica de un umbral, `useAnimatedReaction` que llama a `scheduleOnRN` solo en el cruce.
- Todo gesto tiene una alternativa tocable (botón o ícono) que hace lo mismo, por accesibilidad. El gesto es un atajo, no la única forma.
- Feedback con `expo-haptics` al cruzar un umbral (por ejemplo, cuando un swipe pasa el punto en que se va a confirmar), una sola vez por cruce.
- Animar solo `transform` y `opacity`.

## Stack y dependencias

- Todo tiene que seguir funcionando en **Expo Go** (sin development build).
- Dependencias: solo las ya instaladas más las que pida cada etapa del Sprint 2, siempre con `npx expo install <paquete>`. Nada de librerías de UI (NativeBase, Paper, Tamagui, NativeWind, etc.).
- Hooks de la cursada: `useState`, `useEffect`, `useRef`, `useMemo`, `useCallback` y `useContext`. El estado global va con Context API, sin Redux ni Zustand.
- Navegación con Expo Router, usando las opciones vistas en clase (`headerShown`, `title`, `tabBarActiveTintColor`, `tabBarIcon`, etc.).
- TypeScript estricto, sin `any`.
- Desde SDK 58 (React Native 0.88) los tipos estrictos de React Native vienen por defecto: nada de imports de `react-native/Libraries/*`, y los refs de `TextInput` se tipan con `TextInputInstance` (`useRef<TextInputInstance>(null)`), no con `TextInput`.
- **Subir archivos en SDK 58.** El `fetch` global es el de `expo/fetch`, que arma el multipart él mismo y solo acepta en un FormData strings, `Blob` u objetos con `bytes()`. La parte clásica de React Native `{ uri, name, type }` **no funciona**: falla con `Unsupported FormDataPart implementation` (en el warn sale como "No se pudo llamar a …"). En iOS y Android se agrega un `File` de `expo-file-system` (`formData.append('foto', new File(uri))`), que lee `file://` y `content://` y trae su nombre y su tipo; en web, donde `expo-file-system` no funciona, se agrega el Blob de `await (await fetch(uri)).blob()`. Todo archivo que se suba pasa por `services/fotos.ts`; si hace falta subir otra cosa, reusá ese patrón.

## Código y estilo

- Código, nombres y comentarios en español, con el mismo estilo de JSDoc del repo:
  - encabezado `/** ... */` en cada archivo explicando qué es y qué rol cumple;
  - JSDoc en cada función, hook, componente y handler, con qué hace, qué recibe y qué devuelve;
  - secciones `// --- Estado ---`, `// --- Handlers ---`, `// --- Render ---`, `// --- Estilos ---` en los componentes largos.
- Todo módulo que use hardware lleva un comentario de bloque que explica qué hardware usa, qué permiso pide y por qué la app lo necesita. Ahora también los de gestos y háptica.
- Tono de los comentarios: natural y directo, sin relleno ni emojis.
- Textos de la UI en español rioplatense ("Escaneá", "Gestioná", "vos").
- Estilos con `StyleSheet.create` y el theme de `mobile/src/theme/` (colores, tipografías, espaciado, radios y sombras). Nada de valores escritos a mano.
- Layout con Flexbox y medidas proporcionales para que nada se rompa en pantallas chicas. Respetar la safe area (`react-native-safe-area-context`) y usar `KeyboardAvoidingView` en los formularios.
- Antes de crear un componente, fijarse en `mobile/src/components/` si ya existe uno que sirva, y reutilizarlo o extenderlo.

## Producto

- Doggy es solo para perros: no hay especie ni tamaño en modelos, formularios ni reportes.
- Ningún botón queda muerto: lo que todavía no existe muestra un `Alert` de "Disponible próximamente".

## Git

- **Dependencias: `npm ci`, no `npm install`.** Para instalar o actualizar `node_modules` después de un pull se indica siempre `npm ci`: instala exactamente lo que dice el `package-lock.json` y no lo reescribe, así no aparecen cambios de lockfile que dependen de la versión de npm de cada PC. `npm install <paquete>` (o `npx expo install` en el front) es solo para sumar una dependencia, y el lockfile tiene que sumar solo eso.
- Commits chicos, uno por unidad lógica, con mensajes en español, cortos, en imperativo, variados y descriptivos. Nada de mensajes genéricos repetidos. Sin trailers `Co-Authored-By`.
- No cambiar `git config` ni hacer push salvo que se pida.
- `.gitignore` en la raíz: `.claude/`, `_referencias/`, `.env`, `.expo/`, `node_modules/`, `dist/`, `web-build/` y `*.log`.

## Antes de dar algo por terminado

1. `npx tsc --noEmit` en `mobile/` sin errores.
2. `npm run lint` en `mobile/` sin errores.
3. Si se tocó el contrato, revisar que `doggy-backend` quede igual.
4. Hacer los commits y dar un resumen corto: qué se hizo, qué decisiones se tomaron, qué hay que probar y los commits que quedaron.
