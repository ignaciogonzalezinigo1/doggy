# Doggy

App móvil para el cuidado y la seguridad de tu perro. Permite gestionar las
mascotas de la familia, llevar su carnet sanitario, organizar turnos y, si una
mascota se pierde, reportarla en un mapa colaborativo e identificarla con un
código QR en la chapita del collar.

Proyecto de la materia Programación de Aplicaciones Móviles (UCA), en dos etapas:

- **Sprint 1 — frontend.** La app completa en React Native con Expo: pantallas, navegación, estado global con Context API, validaciones y tres componentes nativos (fototeca y cámara, GPS con mapa y lector de QR). Los datos vivían en memoria.
- **Sprint 2 — backend, login, fotos y gestos.** La app pasa a guardar todo en una API propia, **[doggy-backend](https://github.com/ignaciogonzalezinigo1/doggy-backend)** (Express + Prisma + SQLite), que vive en otro repositorio. Se suman cuentas con login y sesión persistente, fotos subidas al servidor (las ven todos los usuarios y sobreviven a cerrar la app) y cuatro gestos con gesture-handler y Reanimated.

Este repo es solo el front: nunca contiene código del backend. La app conoce la API únicamente por HTTP.

## Integrantes

- Ignacio Gonzalez Iñigo y Juan Federico Rosenfeld

## Stack

- React Native 0.88 + Expo (SDK 58) con TypeScript estricto, corriendo en **Expo Go** (sin development build)
- Expo Router (Stack y Bottom Tabs sobre React Navigation)
- Context API para el estado global
- `StyleSheet` + Flexbox, sin librerías de UI
- Tipografías Quicksand y Plus Jakarta Sans (`@expo-google-fonts`)
- Íconos de `@expo/vector-icons` (Material Icons)
- `react-native-svg` + `react-native-qrcode-svg` para generar el QR de identificación
- `expo-location` + `react-native-maps` para el GPS y el mapa
- `expo-camera` + `expo-haptics` para el lector de QR, la linterna y la vibración
- `expo-image-picker` para la galería y la cámara
- **Sprint 2:** `fetch` contra `doggy-backend`, `expo-secure-store` para guardar el token de sesión, `expo-file-system` para subir las fotos, `react-native-gesture-handler` 3.3 + `react-native-reanimated` 4.7 + `react-native-worklets` 0.13 para los gestos

## Branding

| Uso | Color |
| --- | --- |
| Teal (headers, botones primarios, navegación) | `#1F7A6C` |
| Teal claro (estados activos, chips) | `#2E9C8A` |
| Mostaza (CTA críticos, alertas de perdidos) | `#E8A33D` |
| Crema (fondo global) | `#FFF8F0` |

- Títulos: **Quicksand** 600/700
- Texto y labels: **Plus Jakarta Sans** 400/600/700


## Cómo correrlo de punta a punta

Requisitos: Node LTS en la PC, `git`, y un celular con **Expo Go para SDK 58** conectado a la **misma red Wi-Fi** que la PC.

### 1. Clonar los dos repos, uno al lado del otro

```bash
mkdir doggy-workspace && cd doggy-workspace
git clone https://github.com/ignaciogonzalezinigo1/doggy.git
git clone https://github.com/ignaciogonzalezinigo1/doggy-backend.git
```

```
doggy-workspace/
├── doggy/            este repo (la app)
└── doggy-backend/    la API (Express + Prisma + SQLite)
```

### 2. Levantar el backend (primera terminal)

```bash
cd doggy-backend
cp .env.example .env   # antes de npm ci: el postinstall lo necesita
npm ci                 # también genera el cliente de Prisma
npm run db:reset       # crea dev.db con el schema y carga los datos de ejemplo
npm run dev            # API en http://localhost:3000
```

Para chequear que anda, abrí `http://localhost:3000/api/health` en el navegador: tiene que responder `{ "ok": true }`. Los scripts, los endpoints y las pruebas (`npm test`) están en el [README de doggy-backend](https://github.com/ignaciogonzalezinigo1/doggy-backend#readme).

### 3. Levantar el front (segunda terminal)

```bash
cd doggy/mobile
npm ci
cp .env.example .env
```

Se usa `npm ci` y no `npm install` porque instala exactamente las versiones del `package-lock.json` sin reescribirlo: todos tienen las mismas dependencias y no aparecen cambios de lockfile por la versión de npm de cada PC. Después de cada pull que cambie dependencias, otra vez `npm ci`.

Editá `mobile/.env` con la **IP local de la PC** donde corre el backend. No sirve `localhost`: en el celular, `localhost` es el propio celular.

```bash
# mobile/.env
EXPO_PUBLIC_API_URL=http://192.168.0.10:3000
```

Para saber la IP: en macOS, `ipconfig getifaddr en0`; en Windows, `ipconfig` (la "Dirección IPv4" del adaptador Wi-Fi). También sirve la que muestra Expo al arrancar (`exp://192.168.0.10:8081`): es la misma PC, cambiando el puerto por 3000.

```bash
npx expo start -c
```

El `-c` limpia la caché de Metro. Hace falta cada vez que cambiás el `.env`, porque las variables `EXPO_PUBLIC_*` quedan escritas en el bundle.

### 4. Abrir la app en Expo Go

Escaneá el QR que aparece en la terminal con la cámara (iOS) o desde Expo Go (Android). El proyecto usa **SDK 58**: Expo Go tiene que soportar esa versión (ver [Errores comunes](#errores-comunes)).

Antes de culpar a la app, conviene abrir `http://<IP de la PC>:3000/api/health` en el navegador **del celular**. Si ahí no carga, el problema es de red, no del código.

### 5. Entrar con un usuario de prueba

El seed de `doggy-backend` carga los datos de la demo. **Todos los usuarios tienen la contraseña `doggy1234`.**

| Usuario | Email | Para probar |
| --- | --- | --- |
| Sofía Romero | `sofia.romero@mail.com` | La usuaria principal: Luna, Roco y Milo, con carnet (refuerzos próximos y vencidos), turnos y fotos. Ve "Alguien encontró a Milo. ¿Se perdió Milo?" con WhatsApp a Julián, "Sí, se perdió" y "No, está conmigo". En Familia y Cuidadores, Julián pasea a Roco. Acepta el código **`TOBY2026`** (Perfil → Tengo un código de asignación) |
| Lucía Gómez | `lucia.gomez@mail.com` | Dueña de Toby; generó `TOBY2026`. En la demo en vivo, "Encontré una mascota" → escanea el QR de Luna |
| Julián Fernández | `julian.fernandez@mail.com` | Vecino: dueño de Pipa, perdida en Caballito (el pin del mapa), paseador de Roco y quien encontró a Milo |

El seed la imprime al terminar. Para que WhatsApp abra un celular real en la demo, completá `TELEFONO_DEMO_SOFIA` en el `.env` de `doggy-backend` (formato 5491…, sin + ni espacios, por ejemplo `5491123456789`) antes del `npm run db:reset`; si queda vacía, Sofía tiene un número inventado. El guion de la demo en vivo está en `docs/defensa.md`. También se puede crear una cuenta nueva desde "Registrarme". Para volver a la demo limpia: `npm run db:reset` en `doggy-backend` (borra los datos locales).

Las fotos de la demo son de Unsplash (Licencia de Unsplash). Están versionadas en `doggy-backend/prisma/fotos-seed/` y el seed las copia a `uploads/` del servidor (que no se versiona), así todas las fotos salen del servidor y la app no trae imágenes de datos. El autor y el link de cada una están en el `CREDITOS.md` de `doggy-backend`.

## Arquitectura

La app está separada en capas y cada una sabe lo mínimo de la siguiente: las pantallas no saben de HTTP, la app no toca la base, y Prisma no decide permisos.

```
 CELULAR (repo doggy)                                 PC (repo doggy-backend)
┌──────────────────────────────┐                    ┌───────────────────────────────────┐
│ Pantallas (app/)             │                    │ Express (src/index.ts, src/rutas/) │
│   muestran y validan en local│                    │   cors, express.json,              │
│        │                     │                    │   requiereUsuario (token → 401)    │
│        ▼                     │                    │   valida el body (400), permisos   │
│ AppContext (src/context/)    │                    │   (403), elige el status           │
│   estado global y acciones   │                    │        │                           │
│        │                     │    HTTP + JSON     │        ▼                           │
│        ▼                     │  Authorization:    │ Prisma (src/lib/prisma.ts)         │
│ services (src/services/)     │  Bearer <token>    │   modelo en prisma/schema.prisma,  │
│   pedirJson / subirFoto ─────┼───────────────────►│   consultas tipadas                │
│                       ◄──────┼────────────────────┤        │                           │
│                              │  status + JSON     │        ▼                           │
│                              │  o { error }       │ SQLite (dev.db)                    │
└──────────────────────────────┘                    └───────────────────────────────────┘
```

| Capa | Dónde | Qué hace |
| --- | --- | --- |
| Pantallas | `mobile/app/`, `mobile/src/components/` | Muestran el estado, validan en local (`src/utils/validaciones.ts`) y llaman a las acciones del contexto. Muestran el `{ error }` del servidor tal cual. |
| Estado global | `mobile/src/context/AppContext.tsx` | Maneja la sesión (restaurarla al abrir la app, login, registro y logout), carga todo en paralelo con una sesión abierta y expone las acciones. Antes de guardar una foto local la sube (`conFotoSubida`). Actualiza el estado con lo que respondió el servidor. |
| Services | `mobile/src/services/` | Una función `async` por endpoint, con la ruta comentada. `pedirJson` / `pedirSinRespuesta` (`http.ts`) arman el pedido, suman el token, cortan a los 10 s, revisan `response.ok` y lanzan un `ErrorApi` con el status y el mensaje del servidor. |
| HTTP | `EXPO_PUBLIC_API_URL` (`mobile/src/config.ts`) | JSON en los dos sentidos (multipart para las fotos). El contrato está en el `CLAUDE.md` de cada repo. |
| Express | `doggy-backend/src/index.ts`, `src/rutas/` | Recibe, chequea la sesión, valida, chequea permisos, elige el status y arma la respuesta. |
| Prisma | `doggy-backend/prisma/schema.prisma`, `src/lib/prisma.ts` | Define el modelo y hace las consultas. |
| SQLite | `doggy-backend/dev.db` | Guarda los datos. |

Los modelos de `mobile/src/types/models.ts` (`Usuario`, `Mascota`, `RegistroSanitario`, `Turno`, `ReportePerdida`, `Cuidador`, `Invitacion`) son la forma exacta del JSON que viaja: ids numéricos, fechas como string ISO y relaciones por id.

### El viaje de un dato: "Publicar como perdida"

Sofía abre el perfil de Luna, toca "Reportar pérdida", marca en el mini mapa dónde la vio por última vez, elige un radio de 500 m y toca **"Publicar como perdida"**. Esto es lo que pasa:

**Ida (celular → base)**

1. **Pantalla — `mobile/app/mi-mascota-perdida.tsx`, `handlePublicar`.** Valida en local la información adicional (`validarTexto`) y arma un `NuevoReporte` con los datos del perfil de Luna (nombre, raza, señas y foto), el punto del mapa (`lat`, `lng`), la zona que dio `reverseGeocodeAsync` y el radio, con `estado: 'perdido'` y la fecha de ahora. Pone `enviando` en `true` (el botón muestra el spinner y no se puede tocar dos veces) y llama a `crearReporte` del contexto.
2. **Estado global — `mobile/src/context/AppContext.tsx`, `crearReporte`.** Pasa los datos por `conFotoSubida(datos, 'foto')` (`src/services/fotos.ts`). La foto de Luna ya es una ruta del servidor (`/uploads/seed-luna.jpg`), así que no sube nada; si fuera una URI local del celular, primero haría `POST /api/fotos` y reemplazaría la URI por la ruta `/uploads/...` que devuelve el servidor. Después llama al service.
3. **Service — `mobile/src/services/reportes.ts`, `crearReporte`.** Llama a `pedirJson('/api/reportes', conCuerpo('POST', datos))`.
4. **HTTP — `mobile/src/services/http.ts`, `pedir`.** `conCuerpo` hace el `JSON.stringify`; `armarHeaders` suma `Content-Type: application/json` y `Authorization: Bearer <token>` (el token está en memoria, leído de `expo-secure-store` al abrir la app). El `fetch` va a `http://192.168.0.10:3000/api/reportes` con un tope de 10 s.
5. **Express — `doggy-backend/src/index.ts`.** `cors()` deja pasar el pedido y `express.json()` convierte el body en `req.body`. Como la ruta está bajo `/api`, pasa por **`requiereUsuario`** (`src/middlewares/requiereUsuario.ts`): saca el token del header, calcula su SHA-256 y busca la fila en `Sesion` (`usuarioDeToken`, `src/lib/sesiones.ts`). Si no existe o venció, 401. Si está bien, pone `req.usuarioId` y sigue al `reportesRouter`.
6. **Ruta — `doggy-backend/src/rutas/reportes.ts`, `POST /`.**
   - `leerReporteNuevo` (`src/cuerpos/reporte.ts`) toma del body solo los campos permitidos y los valida con las mismas reglas que la app: estado válido, un perdido tiene que traer `mascotaId`, radio entre los de `RADIOS_BUSQUEDA`, etiquetas, coordenadas y fecha. Si algo falla, **400**.
   - La mascota tiene que existir (**404**) y, como es un reporte de pérdida, Sofía tiene que estar asignada a ella (`rolEn`, `src/lib/asignaciones.ts`; si no, **403**).
   - Luna no puede tener otro reporte de pérdida activo (**409** "Esta mascota ya está reportada como perdida. No se puede reportar de nuevo.").
7. **Prisma → SQLite.** `prisma.reportePerdida.create` con `autorId: req.usuarioId` (el autor sale del token, nunca del body) y una escritura anidada que crea las filas de `Etiqueta`. Prisma inserta el reporte y sus etiquetas en `dev.db` en una sola transacción.

**Vuelta (base → marker en el mapa)**

8. **Respuesta — `doggy-backend/src/respuestas.ts`, `aReporte`.** Convierte la fila al JSON de `ReportePerdida`: las etiquetas de la tabla aparte pasan a `etiquetas: string[]`, las fechas a ISO y los opcionales vacíos se omiten. La ruta responde **201** con el reporte creado, ya con su `id`.
9. **HTTP — `http.ts`.** `response.ok` es `true`, así que `pedirJson` lee el JSON y lo devuelve tipado como `ReportePerdida`. Si hubiera sido un error, lanzaría un `ErrorApi` con el `{ error }` del servidor.
10. **Estado global — `crearReporte`.** Suma el reporte que devolvió el servidor al estado: `setReportes((prev) => [...prev, nuevo])`. No vuelve a pedir la lista entera: el 201 ya trae lo creado.
11. **Pantalla — `handlePublicar`.** Vibra con `Haptics.notificationAsync(Success)`, cierra el modal y navega a `/perdidos` con `reporteId` en los params. Si algo falló, en cambio, muestra un `Alert` con el mensaje del servidor y el modal queda abierto con los datos cargados.
12. **Mapa — `mobile/app/(tabs)/perdidos.tsx` y `src/components/perdidos/MapaReportes.tsx`.** Perdidos lee `reporteId` con `useLocalSearchParams`, busca el reporte en `reportes` del contexto, lo selecciona y centra la cámara con `mapaRef.current?.centrar(...)`. `MapaReportes` dibuja un `ReporteMarker` mostaza por cada reporte y, para el seleccionado, el `Circle` de 500 m alrededor del pin. El reporte también aparece primero en el carrusel de cards.

Como el reporte quedó en la base, cualquier otro usuario lo ve en su mapa la próxima vez que se cargan los reportes (`GET /api/reportes` devuelve los activos de todos).

### Sesión

- El login y el registro devuelven `{ usuario, token }`. El token se guarda con `expo-secure-store` (`src/services/sesion.ts`), así la sesión sobrevive al cerrar la app. Mientras se lee al abrirla sigue la splash, para no mostrar el login un instante.
- `http.ts` manda el token en cada pedido. Si cualquier pedido responde 401 (sesión vencida o cerrada en otro lado), se borra el token, se vacía el estado y se vuelve al login sin historial, con un aviso. El login y el logout son la excepción: su 401 significa "credenciales incorrectas" y "ya estaba cerrada".
- "Cerrar sesión" llama a `POST /api/auth/logout`, que borra la sesión en el servidor: ese token deja de servir al instante.


## Pantallas y flujo de navegación

```
Abrir la app ─► ¿token guardado? ─ sí ─► Tabs
                       │ no
                       ▼
                     Login ──► Registro
                       │
                       ▼  (router.replace: "atrás" no vuelve al login)
Tabs
 ├─ Mascotas ───┬─► Agregar mascota
 │              └─► Perfil de la mascota ─┬─► Editar mascota
 │                                        ├─► Carnet Sanitario ─► (modal) Nuevo registro
 │                                        ├─► tab Agenda
 │                                        └─► (modal) Se perdió mi mascota / Editar reporte
 ├─ Perdidos ───┬─► Mapa / Lista ─► (hoja) Detalle del reporte ─► (modal) Editar reporte
 │              └─► "+" ¿Qué querés reportar? ─┬─► (modal) Se perdió mi mascota ─┐
 │                                             └─► (modal) Encontré una mascota ─┴─► vuelve a Perdidos con el nuevo marker
 ├─ Agenda ─────── (modal) Nuevo turno
 └─ Perfil ─────┬─► (modal) Editar datos personales
                ├─► Familia y Cuidadores ─┬─► (hoja) Asignar: generar código con rol ─► compartir
                │                         ├─► Quitar (en cada invitado, solo dueños) ─► confirmación
                │                         └─► (hoja) Dejar de cuidar a… (solo invitados)
                ├─► Tengo un código de asignación ─► (modal) Asignación de mascota
                ├─► Mis reportes activos ─► tab Perdidos
                └─► Cerrar sesión ─► Login
```

- **Stack raíz** (`app/_layout.tsx`): grupo `(auth)`, grupo `(tabs)` y los modales `mi-mascota-perdida`, `reportar` y `asignar` (`presentation: 'modal'`). `asignar` se abre al cargar un código de asignación desde Perfil.
- **Bottom Tabs** (`app/(tabs)/_layout.tsx`): Mascotas, Perdidos, Agenda y Perfil, con una barra propia que marca la tab activa con una píldora.
- **Stack interno de Mascotas** (`app/(tabs)/mascotas/_layout.tsx`): listado, alta, perfil (`[id]`), edición (`[id]/editar`) y carnet (`[id]/carnet`), con la barra de tabs visible.
- **Sesión:** ver [Sesión](#sesión) en Arquitectura.
- No hay botones sin respuesta: lo que todavía no existe no aparece en la app (ver [Pendientes a futuro](#pendientes-a-futuro)).
- **Pull-to-refresh:** en Mis Mascotas, Perdidos (en la lista; en el mapa, el botón "Actualizar"), el perfil y el carnet de la mascota, la Agenda y el Perfil, deslizar hacia abajo vuelve a pedir los datos al servidor, por si otro usuario cambió algo. Si falla, avisa y deja los datos que había (`useRefresco` y `refrescar` del `AppContext`).

### Detalle por pantalla

1. **Login**: email y contraseña con validación local (formato del email y largo máximo). "Ingresar" hace el login contra la API, carga los datos de esa cuenta y entra a la tab Mascotas; si el servidor lo rechaza, muestra su mensaje ("Email o contraseña incorrectos").
2. **Registro**: desde "Registrarme". Pide nombre, apellido (solo letras), email, teléfono (obligatorio, solo de la Argentina, con el mismo campo que el perfil: "+54" fijo adelante; se guarda como celular), contraseña (de 8 a 64 caracteres, sin espacios, con al menos una letra y un número) y confirmación. Crea la cuenta contra la API (si el email ya existe, muestra el mensaje del servidor), entra a la app y saluda invitando a completar la ubicación desde Perfil. "Ingresar" o la flecha vuelven al login.
3. **Mis Mascotas**: listado de mascotas con foto, nombre y raza. Tocar una card abre su perfil, el botón "+" abre el alta y el avatar del header lleva a Perfil. Si alguien avisó que encontró a una de las mascotas, arriba de la lista aparece su aviso (ver el punto 8).
4. **Agregar mascota**: foto (al tocarla se elige entre sacarla en el momento con la cámara o elegirla de la galería), nombre, raza, fecha de nacimiento (dd/mm/aaaa, no futura ni de hace más de 30 años) y señas particulares. Al guardar se genera su ID único `DOGGY-XXXX-NOMBRE` y vuelve al listado, donde ya aparece.
5. **Perfil de la mascota**: foto, raza y edad (calculada con la fecha de nacimiento: "3 años", "5 meses" o "Menos de 1 mes"); botón "Editar mascota"; código QR real generado con el ID único (para grabar en la placa del collar), con "Descargar QR" (guarda en la galería un PNG cuadrado con fondo blanco, el nombre arriba, el QR grande y "Escaneame con Doggy" abajo, para imprimir en la chapita; si no se puede guardar, ofrece la hoja de compartir) y "Compartir QR" (comparte esa misma imagen como archivo); señas particulares; resumen del carnet sanitario con la última vacuna ("Ver historial completo" abre el carnet); próximo turno ("Ir a la Agenda de Turnos" cambia a la tab Agenda) y "Reportar pérdida", que abre "Se perdió mi mascota" con esa mascota ya elegida. Si la mascota ya tiene un reporte de perdida activo, en lugar de ese botón aparece el aviso "Reporte de pérdida activo" (desde cuándo, zona y radio de búsqueda) con "Editar reporte" y "Ya apareció". Si alguien avisó que la encontró, arriba de todo aparece su aviso (ver el punto 8). "Editar mascota" abre el mismo formulario del alta con los datos precargados (foto, nombre, raza, edad y señas); al guardar vuelve al perfil ya actualizado. El ID único no cambia aunque cambie el nombre, para que la placa ya grabada siga funcionando. Al final, solo para un dueño, **"Eliminar mascota"** (en rojo) abre un doble chequeo: explica que se borran para siempre la mascota, su carnet sanitario, sus turnos, sus reportes, sus códigos de asignación y sus fotos, lista a las demás personas asignadas que pierden el acceso, y "Eliminar para siempre" se habilita recién al escribir el nombre de la mascota. Al borrarla vuelve a Mis Mascotas; a los demás asignados les desaparece en su próxima carga.
6. **Carnet Sanitario**: pestañas Vacunas / Desparasitación / Otros que filtran los registros, card destacada con el próximo refuerzo e historial de aplicaciones (todas con el badge "Aplicada") con fecha, profesional y, si tiene, fecha de refuerzo. En el carnet solo se cargan aplicaciones ya hechas: no hay registros pendientes. "Agregar Registro" abre un formulario (tipo, nombre, fecha de aplicación con máscara dd/mm/aaaa, que arranca con la fecha de hoy, veterinario y, opcional, la fecha del próximo refuerzo; en las vacunas, también opcional, la foto de la etiqueta) que valida que la aplicación no tenga fecha futura y que el refuerzo sea posterior a ella. La card de próximo refuerzo muestra el más cercano a futuro, tomando solo la última aplicación de cada vacuna o producto. Cada card (incluida la del próximo refuerzo) tiene un lápiz que abre el mismo formulario con los datos cargados para corregir un registro mal cargado; si se cambia el tipo, el carnet salta a esa pestaña. **Foto de la etiqueta:** al cargar o corregir una vacuna se puede sumar la foto del sticker que el veterinario pega en la libreta (marca, lote y vencimiento), como constancia. Al tocar el recuadro se elige entre sacarla en el momento o elegirla de la galería, con recorte apaisado; con la foto cargada se ve la vista previa (tocándola se abre grande) y los botones "Cambiar" y "Quitar". En la pestaña Vacunas cada card suma la fila "Etiqueta" con el botón "Ver etiqueta" (una miniatura de la foto con el texto, de 44 px de alto, que abre el visor) o "—", y la card del próximo refuerzo también muestra el botón. En "Otro", el formulario pide una **descripción** obligatoria ("Ej: consulta, castración, análisis de sangre, medicación…"), que es el título del registro en el carnet. Todas las cards del carnet, incluida la del próximo refuerzo, se deslizan para borrar.
7. **Perdidos**: mapa de CABA con un marker por reporte (mostaza perdido, teal encontrado). Un **reencuentro** (perdido y encontrado activos de la misma mascota) es un solo marker y una sola card, verdes con un tilde y "¡Reencuentro! Esperando que vuelva con su familia", en el lugar del encontrado más reciente (donde está ahora); su detalle suma cuándo y dónde se perdió. Aparece con "Todos" y "Encontrados". Hay un botón "mi ubicación" que centra el mapa con el GPS y carrusel de cards debajo; tocar una card centra el mapa en ese reporte y tocar un marker lleva a su card. Tocar un marker o una card (en el carrusel o en la lista) abre una hoja con todo lo cargado en el reporte: foto circular y centrada como en el perfil de la mascota, con el estado debajo (al tocarla se abre grande y completa a pantalla completa), raza y etiquetas, cuándo (hace cuánto, fecha y hora), dónde, radio de búsqueda, señas o descripción e información adicional, con un aviso si el reporte es propio y el botón "Ver en el mapa". Desde Perdidos nadie avisa que encontró un perro (eso es solo escaneando la chapita) y ver un perdido no da el contacto de la familia: solo quien publicó un encontrado escaneando el QR ve, en su card y en la hoja, **"Escribirle por WhatsApp"** a la familia ("¡Hola {familia}! Soy {nombre}. Encontré a {mascota} y te avisé en Doggy dónde está. ¿Cómo coordinamos para que vuelva a casa?"; sin ubicación). No se ofrece llamar: si la familia no tiene un celular con WhatsApp, aparece un texto que lo explica. Si la mascota es del usuario y alguien la encontró, la hoja muestra el aviso del punto 8. Si es el reporte de perdida de una mascota del usuario (o lo publicó él), la hoja suma "Editar reporte" y "Ya apareció". El toggle Mapa / Lista cambia a una lista vertical. El buscador filtra en local por nombre o barrio y el filtro por estado (perdidos / encontrados). Si el reporte seleccionado tiene radio de búsqueda, el mapa dibuja su círculo, y la card muestra el radio junto a la zona. El FAB mostaza pregunta qué se quiere reportar: "Se perdió mi mascota" o "Encontré una mascota". Si se niega la ubicación, el mapa queda en CABA y aparece un aviso para habilitarla.
8. **Reportes: mascota propia vs. mascota encontrada.** Son dos flujos distintos porque la persona y lo que sabe son distintos.
   - **Se perdió mi mascota** (modal `mi-mascota-perdida`): el tutor elige cuál de sus mascotas se perdió (llega elegida si se abre desde su perfil) y los datos salen del perfil sin volver a cargarlos (foto, nombre, raza, edad, señas e ID de la chapita). Marca en el mini mapa dónde la vio por última vez (precargado con el GPS) y un radio de búsqueda (200 m, 500 m, 1 km o 2 km) que se dibuja como un círculo mostaza alrededor del pin. Suma información del día (qué tenía puesto, arnés, cómo reacciona). Si la mascota ya está reportada como perdida, no deja publicar otro reporte: muestra "Esta mascota ya está reportada como perdida. No se puede reportar de nuevo." con "Ver o editar el reporte", que abre el que ya existe en Perdidos. "Publicar como perdida" publica el reporte, vibra, cierra el modal y muestra el nuevo marker con su círculo en Perdidos. Si el usuario no tiene mascotas, ofrece cargar una.
   - **Editar reporte y "Ya apareció" / "Ya volvió a casa"**: el reporte de perdida se puede corregir y cerrar desde el detalle en Perdidos o desde el perfil de la mascota. Lo puede hacer quien lo publicó o cualquier persona que tenga la mascota en su cuenta (dueño o invitado), así si la encuentra otro integrante de la familia la saca del mapa sin esperar a quien la reportó. "Editar reporte" abre el mismo modal en modo edición, con el punto, el radio y la información adicional ya cargados (la mascota y la fecha del extravío no cambian); "Guardar cambios" actualiza el marker y el círculo en el mapa. "Ya apareció" pide confirmación con un aviso nativo, cierra el reporte, vibra y lo saca del mapa y del conteo de "Mis reportes activos". Publicar un encontrado no cierra el perdido: sigue activo hasta que la familia lo cierra. Si alguien ya la encontró (reencuentro), el botón (en el aviso, el perfil de la mascota, la edición del reporte y el menú de la card) dice "Ya volvió a casa" y cierra el perdido y todos los encontrados con el resultado "Devuelta a su familia"; sin encontrado, el resultado es "Apareció" (lo decide el servidor).
   - **Encontré una mascota** (modal `reportar`): para quien encontró un perro con chapita Doggy. Es **solo escanear el QR**: arranca directo en el escáner (con la cámara o "Subir imagen QR") y sin un QR válido de Doggy no hay formulario; no se puede reportar un perro sin chapita. Apenas lee un código válido se cierra la cámara y aparece la tarjeta de la mascota, de solo lectura (foto del perfil, nombre, edad, raza y el nombre de su familia, con "Escanear otra"). Quien la encontró no saca foto ni escribe nombre, raza ni descripción: solo marca en el mini mapa dónde está (precargado con el GPS) y, si quiere, deja un comentario corto. "Avisarle a su familia" publica el encontrado con el código (aunque la mascota no esté perdida), vibra y muestra el marker en Perdidos, donde recién aparece el WhatsApp a la familia. Si la mascota es suya avisa "Esta mascota está en tu cuenta…", y si ya había avisado, "Ya avisaste que encontraste a esta mascota." con el WhatsApp de la familia.
   - **Aviso a la familia** (`AvisoEncontrada`): si alguien avisó que encontró a una mascota del usuario, Mis Mascotas, el perfil de la mascota y el detalle del reporte en Perdidos muestran un aviso con la foto de la mascota, dónde está y cuándo la encontraron, el comentario de quien la encontró y, por cada persona que avisó, "Escribirle por WhatsApp" con el agradecimiento ya escrito ("¡Hola {quien la encontró}! Soy {nombre}, de la familia de {mascota}. Vi tu aviso en Doggy, ¡muchas gracias por encontrar a {mascota}! ¿Cómo coordinamos para que vuelva a casa?"). No se ofrece llamar: si quien la encontró no tiene un celular con WhatsApp, aparece un texto que lo explica. Si la mascota estaba perdida es **"¡Encontraron a {nombre}!"** con "Ya volvió a casa", que cierra el perdido y los encontrados como "Devuelta a su familia". Si no estaba perdida (alguien escaneó su QR) es **"Alguien encontró a {nombre}. ¿Se perdió {nombre}?"** con "Sí, se perdió" (el servidor crea el perdido con el lugar del encontrado y pasa a reencuentro) y "No, está conmigo" (cierra el aviso como "No se había perdido"). No hay notificaciones push: el aviso aparece al cargar o refrescar los datos.
9. **Agenda**: calendario mensual hecho a mano con `Date` (semana de lunes a domingo, navegación entre meses, día seleccionado, "Hoy" marcado y puntos de color por categoría en los días con turnos). Al tocar un día vibra suave (`Haptics.selectionAsync`) y lista sus turnos con hora, categoría, mascota, motivo y lugar. "Nuevo turno" abre un formulario (mascota, categoría, fecha, hora, motivo y lugar) que valida que el turno sea a futuro. El lápiz de cada turno abre el mismo formulario con sus datos para editarlo; al guardar, la agenda salta al nuevo día si se cambió la fecha. Al editar, la regla de "a futuro" solo aplica si se cambia la fecha o la hora, así se puede corregir el motivo o el lugar de un turno que ya pasó.
10. **Mi Perfil**: foto de perfil editable, sacada con la cámara o elegida de la galería, nombre, ubicación y cantidad de mascotas registradas (calculada desde el estado global). "Editar datos personales" abre un formulario (nombre, apellido, ubicación, email, teléfono de emergencia). Card de contacto de emergencia, familia y cuidadores agrupados por mascota, menú (código de asignación, mis reportes activos con el conteo real y "Guía de paseos y normativas CABA", que abre en el navegador la página oficial de la Ciudad [Perros y gatos en el espacio público](https://buenosaires.gob.ar/gcaba_historico/agenciaambiental/animalesba/perros-y-gatos-en-el-espacio-publico): correa y collar o pretal, bozal si es agresivo, chapita con nombre y teléfono, levantar la caca y soltarlo solo en caniles. El incumplimiento está penado por el art. 1.3.12 del Código Contravencional, según la Ley 6839/2025, con multas de 150 a 1.000 unidades fijas) y "Cerrar sesión", que vuelve al login sin dejar historial.
11. **Asignación de mascotas (dueño / invitado).** Cada persona asignada a una mascota tiene un rol:
    - **Dueño**: puede asignar la mascota a otras personas. Quien da de alta una mascota queda como dueño.
    - **Invitado**: tiene la mascota en su cuenta (perfil, carnet, turnos), pero no puede asignarla a nadie.

    En Perfil → Familia y Cuidadores, cada mascota lista a sus personas con su rol (el usuario marcado como "Vos"). Solo si el usuario es dueño aparece "+ Asignar a…", que abre una hoja para elegir el rol y generar un código de 8 caracteres, para compartir con la hoja nativa. El código es de un solo uso: sirve para una sola persona. Al cargarlo en "Tengo un código de asignación" se ve la mascota y el rol ofrecido; "Aceptar" la suma a la cuenta y abre su perfil. Si el código no existe, ya se usó o el usuario ya está asignado, la pantalla lo explica.

    Un dueño puede **quitar a un invitado** con "Quitar" en su fila, con confirmación ("¿Quitar a {nombre}? Ya no va a poder ver ni editar a {mascota}."); a otro dueño no. Un invitado puede irse con **"Dejar de cuidar a…"**: la mascota sale de su cuenta (con su carnet y turnos) y su familia la sigue teniendo. Un dueño no se saca a sí mismo desde acá: para eso está "Eliminar mascota" en su perfil. Para probarlo con los datos de ejemplo: en "Tengo un código de asignación" cargar el código **TOBY2026**, que suma a Toby (de otra usuaria) como invitado.

## Componentes nativos

### 1. Fototeca y cámara para fotos — `expo-image-picker`

- **Dónde:** alta y edición de mascota, foto del reporte de mascota encontrada, foto de perfil y foto de la etiqueta de una vacuna en el carnet (galería o cámara), y lectura de un QR desde una captura (solo galería). Implementado en `src/hooks/useFototeca.ts`.
- **Qué hace:** al tocar la foto pregunta de dónde sacarla, con la hoja de acciones nativa en iOS (`ActionSheetIOS`) y un aviso con botones en Android: "Sacar foto" abre la cámara del sistema (`launchCameraAsync`, cámara trasera) y "Elegir de la galería" abre el selector de imágenes (`launchImageLibraryAsync`). En los dos casos hay recorte cuadrado (`allowsEditing`, `aspect: [1, 1]`) y compresión (`quality: 0.7`), y se devuelve la URI local de la foto. En web va directo al selector de archivos.
- **Permiso de cámara:** se pide recién cuando el usuario elige "Sacar foto", con el mismo flujo (`getCameraPermissionsAsync` → `requestCameraPermissionsAsync`). El texto de `NSCameraUsageDescription` está en los plugins de `expo-image-picker` y `expo-camera` y explica los dos usos (sacar fotos y escanear el QR). Si se niega, `AvisoPermisoFoto` explica qué permiso falta y recuerda que se puede usar la otra opción.
- **Permiso:** acceso a la biblioteca de fotos (`NSPhotoLibraryUsageDescription` en iOS), declarado con el plugin de `expo-image-picker` en `app.json` y un texto en español que explica para qué se usa. En tiempo de ejecución se sigue el flujo consultar (`getMediaLibraryPermissionsAsync`) → pedir (`requestMediaLibraryPermissionsAsync`) → evaluar el resultado. Si el usuario lo niega y `canAskAgain` es `false`, la pantalla muestra un `PermissionNotice` que explica el motivo y ofrece `Linking.openSettings()`.
- **Por qué:** la foto es el dato que más ayuda a que un vecino reconozca a una mascota perdida. La galería permite reutilizar fotos que el usuario ya tiene de su mascota; la cámara sirve cuando no tiene una buena foto guardada o, al reportar una mascota encontrada, para sacarle una foto ahí mismo.

### 2. GPS / Geolocalización — `expo-location` + `react-native-maps`

- **Dónde:** pantalla Perdidos (y el mini mapa del reporte de extravío). Implementado en `src/hooks/useUbicacion.ts`.
- **Qué hace:** sigue el patrón de hook tipado de la cátedra. Primero verifica que los servicios de ubicación estén activos (`hasServicesEnabledAsync`), después pide el permiso en primer plano (`getForegroundPermissionsAsync` → `requestForegroundPermissionsAsync`) y hace una lectura puntual con `getCurrentPositionAsync` y `Accuracy.High`. Con `reverseGeocodeAsync` traduce las coordenadas a una dirección legible (calle, número y barrio). La posición se dibuja en un `MapView` nativo (Apple Maps en iOS, Google Maps en Android) con `showsUserLocation`, y la cámara se mueve con `animateToRegion`.
- **Permiso:** ubicación "mientras se usa la app" (`locationWhenInUsePermission`), declarada con el plugin de `expo-location` en `app.json`. No se pide ubicación en segundo plano porque la app solo la necesita con la pantalla abierta. Si se niega, el mapa arranca centrado en CABA y un `PermissionNotice` ofrece volver a pedirla o abrir los ajustes.
- **Por qué:** cuando una mascota se pierde, lo que importa es la cercanía. Con la posición del usuario el mapa muestra primero los reportes de su zona, y al reportar se registra el punto exacto de extravío en vez de depender de una dirección escrita a mano. Se usa una consulta puntual (no `watchPositionAsync`) porque no hace falta seguir al usuario en tiempo real y así se ahorra batería.

### 3. Cámara (lector de QR y linterna) — `expo-camera` + `expo-haptics`

- **Dónde:** modal Encontré una mascota. Implementado en `src/components/reporte/EscanerQr.tsx`.
- **Qué hace:** monta un `CameraView` con `barcodeScannerSettings={{ barcodeTypes: ['qr'] }}` y `onBarcodeScanned`. Cuando lee un código con formato `DOGGY-XXXX-NOMBRE`, busca la mascota en el servidor (`GET /api/mascotas/codigo/:codigo`, que devuelve solo sus datos públicos y el nombre de su tutor, aunque sea de otra persona; el teléfono, solo si está perdida) y autocompleta el formulario. Mientras espera la respuesta, el lector queda bloqueado y muestra "Buscando…"; un 404 se avisa como "no reconocido" y una falla de red, como falta de conexión. Tras la primera lectura se bloquean las siguientes (el lector dispara varias veces por segundo mientras el QR está en cuadro) y la cámara se desmonta. Permite prender el flash como linterna (`enableTorch`) para leer chapitas de noche, cambiar a la cámara frontal (`facing`) y leer un QR desde una imagen de la galería con `scanFromURLAsync`. Cada lectura se confirma con `Haptics.notificationAsync` (éxito o error).
- **Permiso:** cámara, pedido con `useCameraPermissions` recién cuando el usuario toca "Escanear" y declarado con el plugin de `expo-camera` en `app.json` (sin micrófono, porque no se graba audio). Si se niega, se muestra un `PermissionNotice` y queda la alternativa de subir una foto del QR.
- **Por qué:** quien encuentra un perro suele estar en la calle, apurado y con una mano ocupada. Escanear la chapita identifica a la mascota y trae sus datos en un segundo, sin tipear un código. La cámara solo se enciende a pedido y se apaga al leer para no gastar batería.

## Gestos

Sprint 2 suma cuatro gestos con `react-native-gesture-handler` 3 y `react-native-reanimated` 4. Todos siguen las mismas reglas:

- la animación corre en el **hilo de UI** con shared values (`useSharedValue` + `useAnimatedStyle`), y se anima solo `transform` y `opacity`;
- se vuelve al hilo de JS con `scheduleOnRN` solo cuando el gesto se activa o termina (para navegar, abrir un menú, borrar o vibrar), nunca en `onUpdate`;
- la vibración (`expo-haptics`) confirma el momento clave, una sola vez;
- **todo gesto tiene una alternativa tocable** que hace lo mismo: el gesto es un atajo, no la única forma.

| Gesto | Dónde | Alternativa tocable |
| --- | --- | --- |
| Pinch + pan con zoom + doble toque + arrastrar para cerrar | Visor de fotos (etiqueta de vacuna, foto de un reporte) | Botón X para cerrar |
| Swipe a la izquierda | Cards de turnos y del carnet | Botón "Eliminar" del formulario de edición |
| Long press (600 ms) | Cards de "Mis Mascotas" | Las mismas acciones en el perfil de la mascota |
| Fling izquierda / derecha | Calendario de la Agenda | Flechas del encabezado |

### 1. Visor de foto con zoom y arrastre para cerrar — `react-native-gesture-handler` + `react-native-reanimated` + `expo-haptics`

- **Dónde:** el visor de foto a pantalla completa, que se abre al tocar la foto de la etiqueta de una vacuna (en el formulario y en "Ver etiqueta" del carnet) y la foto del detalle de un reporte. Implementado en `src/components/VisorFoto.tsx`.
- **Qué hace:**
  - el gesto funciona en TODA la pantalla, no solo sobre la foto;
  - pellizcar hace zoom de 1x a 4x en el punto donde están los dedos. Si al soltar quedó afuera de ese rango, vuelve al límite con un resorte;
  - con zoom, arrastrar mueve la foto, limitada para que no se vaya de la pantalla: pasado el borde se mueve con resistencia y al soltar rebota. Sin zoom no se mueve;
  - doble toque: desde 1x hace zoom a 2,5x en el punto tocado; con zoom vuelve a 1x centrada. Animado;
  - sin zoom, deslizar hacia abajo cierra el visor. Mientras se arrastra, el fondo se aclara, y si se suelta a más de 150 px se cierra con una vibración leve. Si no, la foto vuelve a su lugar;
  - el toque simple no hace nada (para no pisarse con el doble toque) y no hay rotación.
  - La X de arriba a la derecha (44x44, dentro del safe area) cierra siempre, para quien no puede hacer el gesto.
- **Cómo:**
  - la foto es una `Animated.Image` dentro de un único `GestureDetector` que ocupa toda la pantalla (el contenedor no se transforma, así las coordenadas del gesto siempre son de la pantalla);
  - los gestos se combinan así: `useCompetingGestures(dobleToque, useSimultaneousGestures(pinch, pan))`. Pellizco y arrastre van a la vez; el doble toque compite con ellos y gana el primero que se activa. Un doble toque sin mover el dedo no activa el arrastre (necesita 10 px) ni el pellizco (necesita dos dedos); si se apoyan dos dedos o se arrastra, el doble toque se cancela. Con `useExclusiveGestures` el arrastre tenía que esperar a que fallara el doble toque;
  - posición y escala son shared values (`useSharedValue`) y se aplican con `useAnimatedStyle`, todo en el hilo de UI. Se anima solo `transform` y `opacity`;
  - el pan guarda la posición en `onBegin` y le suma `translationX/Y`, limitada con el tamaño real de la foto ajustada a la pantalla (`onLoad`) y el zoom;
  - el pinch multiplica la escala guardada y usa `focalX/Y` para correr la foto, de modo que el punto entre los dedos quede quieto;
  - solo se vuelve al hilo de JS al soltar el arrastre para cerrar, con `scheduleOnRN`, para vibrar (`Haptics.impactAsync`) y cerrar el modal. Nunca se vuelve en `onUpdate`;
  - el contenido del `Modal` tiene su propio `GestureHandlerRootView`, porque el modal se dibuja fuera de la raíz de la app y sin ella los gestos no responden en Android;
  - al abrir el visor o cambiar de foto se resetea todo.
- **Permiso:** ninguno. El motor de vibración no pide permiso.
- **Por qué:** la foto de la etiqueta de una vacuna tiene letra chica (lote, marca, fecha) y hace falta acercarla para leerla. En un reporte, ampliar la foto ayuda a reconocer las señas del perro. Arrastrar para cerrar y el doble tap son los gestos que cualquiera ya conoce de la galería del celular.

### 2. Deslizar para borrar turnos y registros — `usePanGesture` + `expo-haptics`

- **Dónde:** las cards de turnos de la Agenda y las del historial del carnet sanitario. Implementado en `src/components/DeslizarParaBorrar.tsx`, que envuelve a `TurnoCard`, `RegistroCard` y `ProximoRefuerzoCard` (así funciona igual con un solo registro, que se muestra como próximo refuerzo).
- **Qué hace:**
  - deslizar la card a la izquierda deja a la vista un botón rojo "Eliminar". Deslizar no borra nada;
  - al tocar "Eliminar" aparece una confirmación nativa (`Alert`). Si se acepta, se borra en el servidor (`borrarTurno` / `borrarRegistro` del `AppContext`) y el celular vibra con la vibración de éxito;
  - si se cancela o el servidor responde un error, se muestra el mensaje y la card vuelve a su lugar;
  - al cruzar el umbral en el que la card va a quedar abierta, vibra una vez.
  - Alternativa tocable: el botón "Eliminar" de los formularios de edición de turno y de registro (se abren con el lápiz de cada card).
- **Cómo:**
  - es un `usePanGesture` propio y no `ReanimatedSwipeable`, porque el Swipeable no deja poner `failOffsetY`: se activaba con 10 px hacia la derecha y un scroll con un poco de desvío le robaba el gesto a la lista;
  - se activa recién con 20 px en horizontal (`activeOffsetX`) y falla si antes se movió 10 px en vertical (`failOffsetY`), así el scroll vertical siempre gana. La lista del carnet es la `FlatList` de gesture-handler, para que el scroll participe de la coordinación;
  - la card se mueve la mitad que el dedo y queda abierta si se descubrió el 60 % del botón o si se tiró rápido; con la card abierta, tocarla la cierra;
  - el botón aparece con `opacity` y `scale` según el progreso del swipe, en el hilo de UI. La vibración del umbral se dispara con `useAnimatedReaction`, que solo vuelve al hilo de JS en el cruce, no en cada cuadro;
  - la confirmación, el borrado y la vibración están en `useConfirmarBorrado`, que usan tanto el swipe como los formularios.
- **Permiso:** ninguno.
- **Por qué:** borrar un turno cancelado o un registro cargado por error es frecuente, y deslizar es el gesto que cualquiera conoce de los mails y los mensajes. La confirmación evita borrar algo sin querer, porque no se puede deshacer.

### 3. Mantener presionada una mascota para ver acciones rápidas — `useLongPressGesture` + `expo-haptics`

- **Dónde:** las cards de "Mis Mascotas". Implementado en `src/components/PetCard.tsx` y `src/hooks/useMenuMascota.ts`.
- **Qué hace:**
  - mantener presionada la card 600 ms abre un menú con **Editar**, **Reportar pérdida** (o **Ya apareció** si tiene un reporte activo, **Ya volvió a casa** si además alguien la encontró); el QR se descarga y se comparte solo desde el perfil;
  - mientras el dedo está apoyado la card se achica un poco, y al activarse vibra con un impacto medio. Al soltar, vuelve a su tamaño;
  - un toque normal sigue abriendo el perfil.
  - Alternativa tocable: las tres acciones están en el perfil de la mascota. Con lector de pantalla, la card ofrece la acción "Más opciones".
- **Cómo:**
  - `useExclusiveGestures(mantener, tocar)`: el long press tiene prioridad y el tap espera a que falle, que pasa apenas se levanta el dedo, así que no se nota demora;
  - la escala es un shared value animado con `withSpring` (en `onBegin` baja y en `onFinalize` vuelve);
  - solo se vuelve al hilo de JS (`scheduleOnRN`) cuando un gesto se activa, para navegar o abrir el menú;
  - el menú es `ActionSheetIOS` en iOS y un `Alert` con botones en Android, como en `useFototeca`. El de Android admite como mucho tres botones: no lleva "Cancelar" y se cierra tocando afuera;
  - "Ya apareció" / "Ya volvió a casa" reusa `useCerrarReporte`, el mismo que el perfil (el texto sale de `botonCierre`).
- **Permiso:** ninguno.
- **Por qué:** cuando una mascota se pierde, cada segundo cuenta: desde el listado se puede reportar o compartir su QR sin entrar al perfil.

### 4. Deslizar para cambiar de mes en el calendario — `useFlingGesture` + `expo-haptics`

- **Dónde:** el calendario de la Agenda. Implementado en `src/components/agenda/Calendario.tsx`.
- **Qué hace:**
  - deslizar rápido a la izquierda pasa al mes siguiente, y a la derecha vuelve al anterior, con una vibración de selección;
  - tocar un día sigue seleccionándolo.
  - Alternativa tocable: las flechas del encabezado del calendario.
- **Cómo:**
  - dos `useFlingGesture`, uno con `Directions.LEFT` y otro con `Directions.RIGHT`, combinados en carrera con `useCompetingGestures`: el primero que se activa gana;
  - el fling solo se activa con un movimiento rápido en esa dirección, así que no le gana a un toque. Cuando se activa, gesture-handler cancela el toque que había empezado sobre el día;
  - solo se vuelve al hilo de JS (`scheduleOnRN`) al activarse, para vibrar (`Haptics.selectionAsync`) y cambiar de mes.
- **Permiso:** ninguno.
- **Por qué:** pasar de mes deslizando es más rápido que apuntar a una flecha chica, y es como funciona el calendario del celular.

### API de gestos: diferencias con la clase

La clase usó la API de builders de gesture-handler 2 y `runOnJS` de Reanimated 3. El proyecto tiene `react-native-gesture-handler` 3.3, `react-native-reanimated` 4.7 y `react-native-worklets` 0.13 (SDK 58). En esas versiones, la API de la clase todavía funciona pero está marcada como `@deprecated`, así que se usó la nueva:

| Clase | Versión instalada | Por qué cambia |
| --- | --- | --- |
| `Gesture.Pan()`, `Gesture.Pinch()`, `Gesture.Rotation()`, `Gesture.Tap()` | `usePanGesture`, `usePinchGesture`, `useRotationGesture`, `useTapGesture` | En gesture-handler 3 los builders están deprecados y se van a eliminar; los gestos pasan a ser hooks. |
| `Gesture.Simultaneous(...)` / `Gesture.Exclusive(...)` | `useSimultaneousGestures(...)` / `useExclusiveGestures(...)` | Lo mismo: la composición también es un hook. |
| `Gesture.LongPress().minDuration(600)`, `Gesture.Fling().direction(...)` | `useLongPressGesture({ minDuration: 600 })`, `useFlingGesture({ direction })` | Igual que los demás gestos. |
| `Gesture.Race(...)` | `useCompetingGestures(...)` | Cambió el nombre además de pasar a hook. |
| `Swipeable` de `react-native-gesture-handler/Swipeable` | `ReanimatedSwipeable` de `react-native-gesture-handler/ReanimatedSwipeable` | El `Swipeable` viejo ya no está en la versión 3. El nuevo se anima con Reanimated y combina gestos con `simultaneousWith`, `requireToFail` y `block`, pero no deja configurar `failOffsetY`: por eso el proyecto usa un `usePanGesture` propio. |
| Métodos encadenados: `.onBegin(...).onUpdate(...).numberOfTaps(2)` | Un objeto de configuración: `{ onBegin, onUpdate, numberOfTaps: 2 }` | Los hooks reciben toda la configuración junta. |
| `onStart` / `onEnd` | `onActivate` / `onDeactivate` (`onBegin`, `onUpdate` y `onFinalize` siguen igual) | Cambiaron de nombre en la API nueva. |
| `runOnJS(fn)(args)` de `react-native-reanimated` | `scheduleOnRN(fn, args)` de `react-native-worklets` | En Reanimated 4 los hilos pasaron a `react-native-worklets` y `runOnJS` quedó deprecado. |
| `'worklet'` en cada callback del gesto | No hace falta | El plugin de Babel de worklets convierte solo los callbacks de los hooks `use*Gesture`. Sigue haciendo falta en las funciones auxiliares que se llaman desde ellos. |
| `sharedValue.value` | `sharedValue.get()` / `sharedValue.set()` | Reanimated 4 recomienda `get`/`set` para que el React Compiler y el lint no lo tomen como una mutación. |

No cambian `GestureDetector`, `useSharedValue`, `useAnimatedStyle`, `withSpring` ni los datos del evento (`translationX/Y`, `scale`, `focalX/Y`, `rotation`).

## Validación de datos

Todos los formularios validan en local antes de guardar, con las reglas centralizadas en `src/utils/validaciones.ts`. El error aparece en rojo debajo del campo y se borra apenas se corrige.

- **Largo máximo:** cada campo tiene su límite en `LIMITES`, que se usa también como `maxLength` del input, así no se puede escribir de más (nombre y apellido 40, email 100, contraseña 64, ubicación 60, nombre de mascota 30, raza 40, señas 200, descripción e información adicional 300, motivo y lugar del turno 80, nombre del registro y profesional 60). Los textos largos muestran el contador de caracteres.
- **Caracteres permitidos:** nombres y apellidos solo con letras (con tildes, ñ y ü), espacios, guiones y apóstrofes; nombres de mascota y razas con letras, números, espacios, puntos y guiones (y al menos una letra); los textos libres (señas, descripción, motivo, lugar, veterinario, ubicación) con letras, números y la puntuación común, incluidas las comillas y guiones que iOS pone solo. No se aceptan emojis, símbolos como `< > { } * =`, caracteres invisibles ni textos hechos solo de números o signos ("!!!!"); el mensaje dice qué carácter sacar.
- **Formatos:** email `usuario@dominio.ext` (se guarda en minúsculas), teléfono **solo de la Argentina** (otro país: "Solo se aceptan teléfonos de Argentina."), con el "+54" fijo en el campo y la característica y el número en cualquier formato habitual ("2994554060", "299 455-4060", "0299 15 455-4060", "299 15 4554060") que libphonenumber-js reconozca como número real. Si se pega o escribe con +54, 54, 0054 o 549 adelante, el campo lo saca al pegar y al salir ("Ya agregamos el +54, escribí solo tu número"). Se guarda en E.164 siempre como **celular** (+5492994554060; "11 4777-3020" da +5491147773020), porque asumimos que quien usa la app tiene WhatsApp; un número sin versión celular (0800, 0810) no es válido. Se muestra siempre con `formatearTelefono`: "+54 9 299 455-4060". La regla es `src/utils/telefonos.ts`, el mismo archivo que usa el backend; las letras se descartan mientras se escribe, fecha de nacimiento no futura ni de hace más de 30 años, fechas `dd/mm/aaaa` reales y horas `HH:MM`.
- **Rangos de fechas:** una aplicación del carnet no puede ser futura ni de hace más de 30 años; el refuerzo tiene que ser posterior a la aplicación y no más de 5 años después; un turno tiene que ser a futuro y a no más de 2 años.
- **Limpieza:** antes de guardar se sacan los espacios de los bordes y los repetidos, y en los textos de varias líneas se deja como mucho una línea en blanco seguida (`limpiarTexto`).

## Componentes reutilizables

- `ScreenContainer`: safe area, fondo y scroll con ajuste al teclado.
- `Input`: label, ícono, foco, error y modo contraseña; en los textos largos muestra el contador de caracteres (`120/300`).
- `PrimaryButton`: variantes primaria (teal), secundaria (mostaza), outline, tonal y de peligro, en dos tamaños.
- `BackButton`: volver al stack anterior, en tono claro u oscuro.
- `TabBar`: barra inferior con la píldora de tab activa.
- `AppHeader`: marca y avatar del usuario con acceso al perfil.
- `IconButton`: botón circular de un ícono, resaltable (buscar y filtrar en Perdidos).
- `AvatarPerfil`: avatar clickeable del usuario que lleva a Perfil; lo usan `AppHeader` y `ScreenHeader` para que aparezca en todas las pantallas.
- `Avatar`: foto circular con respaldo de inicial y huella si no hay imagen.
- `VisorFoto`: modal a pantalla completa para ver una foto grande y entera, con fondo oscuro, zoom y la X para cerrar.
- `PetCard`: card de mascota del listado.
- `Fab`: botón flotante mostaza, simple o extendido con texto.
- `Cargando` / `EstadoVacio`: estados de carga, vacío y error de las listas.
- `ScreenHeader`: volver, título, subtítulo y avatar del usuario para pantallas internas.
- `Chip`: píldora informativa o seleccionable.
- `FotoEditable`: foto circular con botón de cámara para sacar o elegir la imagen.
- `AvisoPermisoFoto`: aviso de permiso de galería o cámara denegado, con el texto según lo que se intentó usar.
- `PermissionNotice`: aviso de permiso denegado con acceso a los ajustes.
- `Badge`: etiqueta de estado ("Placa & Collar", "Aplicada", "URGENTE").
- `SectionCard`: card de sección con decoración, acción y pie con link.
- `QrIdentificacion`: card con el QR de la mascota, "Descargar QR" y "Compartir QR"; la imagen (`FichaQr`) se captura con `react-native-view-shot` y la manejan `src/hooks/useQrImagen.ts` (`expo-sharing` y `expo-media-library`).
- `InputTelefono`: el campo de teléfono del registro y del perfil, con el "+54" fijo (`prefijo` de `Input`), y el aviso al sacar un código de país pegado. No hay opción de fijo: todo número se guarda como celular.
- `Avatar` y las miniaturas usan `expo-image` (caché en memoria y disco, y decodificado al tamaño en pantalla).
- `SegmentedControl`: pestañas con subrayado o en píldora (Mapa / Lista).
- `FormModal`: hoja modal que sube desde abajo para formularios cortos.
- `mascotas/MascotaForm`: formulario de mascota (foto, nombre, raza, fecha de nacimiento y señas) compartido por el alta y la edición.
- `carnet/RegistroCard`, `carnet/ProximoRefuerzoCard`, `carnet/RegistroForm`, `carnet/FotoEtiqueta`, `carnet/VerEtiqueta`: piezas del carnet sanitario. Las cards tienen todas la misma estructura (ícono del tipo, nombre, badge "Aplicada", lápiz para editar y filas fijas de aplicación, profesional y refuerzo, más la de etiqueta en las vacunas) y `RegistroForm` sirve tanto para el alta como para corregir un registro. `FotoEtiqueta` es el campo opcional de la foto de la etiqueta (cámara o galería) y `VerEtiqueta`, el link que la abre en grande.
- `perdidos/DetalleReporte`: hoja con el detalle completo de un reporte (usa `FormModal`): el reencuentro, el aviso a la familia (`AvisoEncontrada`), el WhatsApp de la familia para quien la encontró y, si el perdido es del usuario, "Editar reporte" y "Ya apareció".
- `src/hooks/useRefresco.tsx`: el `RefreshControl` del pull-to-refresh, con los colores del tema.
- `src/hooks/useCerrarReporte.ts`: confirmación y cierre de un reporte cuando la mascota aparece, compartido por el detalle en Perdidos, el perfil de la mascota y la edición del reporte.
- `perdidos/MapaReportes`: mapa con markers y método `centrar` por ref (con una versión `.web.tsx` que muestra un aviso, porque react-native-maps no funciona en el navegador).
- `perdidos/ReporteCard`, `perdidos/ReporteMarker`: card y pin de cada reporte.
- `reporte/EscanerQr`: escáner de QR con linterna, cámara frontal y lectura desde imagen.
- `reporte/MapaSelector`: mini mapa con pin arrastrable y, opcional, el círculo del radio de búsqueda (con versión `.web.tsx`).
- `reporte/SelectorMascota`: fila deslizable de las mascotas del usuario para elegir cuál se perdió.
- `reporte/ResumenMascota`: card de solo lectura con los datos del perfil que se publican en el reporte.
- `agenda/Calendario`: calendario mensual con puntos por categoría y leyenda (la lógica de fechas está documentada en `src/utils/calendario.ts`).
- `agenda/TurnoCard`, `agenda/TurnoForm`: card de turno (con lápiz para editar) y formulario que sirve para agendar y para editar.
- `MenuRow`: fila de menú con ícono, badge, flecha o un elemento propio (Switch).
- `SectionTitle`: título de sección con ícono en círculo y badge.
- `perfil/ContactoEmergencia`, `perfil/CuidadoresMascota`, `perfil/EditarPerfilForm`: piezas del perfil de usuario. `CuidadoresMascota` muestra el rol de cada persona y, según el rol del usuario, "Asignar" y "Quitar" en cada invitado (solo dueños) o "Dejar de cuidar a…" (solo invitados).
- `ContactoDueno`: cómo contactar a otra persona por una mascota encontrada (quien la encontró a la familia en Perdidos, y la familia a quien la encontró en el aviso): solo "Escribirle por WhatsApp" (`BotonWhatsApp`), o un texto breve si no hay teléfono. Los mensajes salen de `src/utils/mensajes.ts` (`mensajeGracias`, `mensajeLaTengo`, sin ubicación).
- `mascotas/EliminarMascota`: doble chequeo para borrar una mascota (hay que escribir su nombre).
- `perfil/InvitarForm`: elige el rol (Dueño / Invitado), genera el código de asignación y lo comparte.
- `src/utils/invitaciones.ts`: normaliza el código de asignación que carga el usuario.

## Estructura

```
doggy/
├── README.md
├── CLAUDE.md                reglas del proyecto y contrato con doggy-backend
├── docs/
│   └── defensa.md           machete para la defensa oral del Sprint 2
└── mobile/                  app Expo
    ├── app.json
    ├── .env.example         EXPO_PUBLIC_API_URL (copiar como .env)
    ├── assets/images/       logo, ícono y splash (las fotos de la demo están en el backend)
    ├── app/                 rutas (Expo Router)
    │   ├── _layout.tsx      Stack raíz, fuentes, splash y raíz de gestos
    │   ├── index.tsx        entra a las tabs o al login según haya sesión
    │   ├── (auth)/          login y registro
    │   ├── (tabs)/          Mascotas, Perdidos, Agenda y Perfil
    │   │   └── mascotas/    stack interno: listado, alta, perfil, edición y carnet
    │   ├── mi-mascota-perdida.tsx   modal "Se perdió mi mascota" / editar reporte
    │   ├── reportar.tsx     modal "Encontré una mascota"
    │   └── asignar.tsx      modal para aceptar un código de asignación
    └── src/
        ├── theme/           colores, tipografías, espaciado y sombras
        ├── components/      componentes reutilizables
        ├── context/         estado global (AppContext)
        ├── hooks/           hooks propios (fototeca, ubicación, menús, borrado)
        ├── services/        acceso a la API (http, sesión, fotos y un archivo por recurso)
        ├── data/            fotos incluidas en la app y fuenteFoto
        ├── types/           modelos (la forma del JSON del contrato)
        ├── utils/           validaciones y helpers
        └── config.ts        URL de la API (EXPO_PUBLIC_API_URL)
```

## Rendimiento

Lo que se midió y lo que se cambió (de mayor a menor impacto):

- **El modo desarrollo de Expo Go.** Es lo que más se nota: el JavaScript va sin minificar y con las verificaciones de desarrollo (avisos de props, LogBox, recarga en caliente), y cada pantalla nueva se compila al abrirla. Una build de producción (`eas build` o `npx expo run:* --variant release`) es bastante más rápida con el mismo código.
- **Imágenes.** Las fotos de la demo son JPG de hasta 800 px y se mostraban con el `Image` de React Native en avatares de 40 a 96 px. `Avatar`, `ReporteCard` y las miniaturas de la etiqueta pasaron a `expo-image`, que las guarda en caché (una foto del servidor no se vuelve a bajar) y las decodifica al tamaño en pantalla. El visor sigue con el `Image` de React Native porque necesita el tamaño original de la foto.
- **Re-renders.** Cualquier cambio del `AppContext` re-renderizaba a todos los que lo usan. Ahora las acciones van en un contexto aparte (`useAcciones`), cuyo valor no cambia: las cards que solo borran no se redibujan cuando cambia otro dato. `PetCard`, `ReporteCard`, `RegistroCard` y `TurnoCard` van con `memo`, y el carrusel de Perdidos les pasa un estilo estable.
- **Segundo lote ("se traba después de refrescar").** Diagnóstico, de mayor a menor impacto:
  1. *Un refresco re-renderizaba toda la app dos o tres veces.* `refrescar` guardaba arrays nuevos de los 6 recursos aunque no hubiera cambiado nada, así cada pantalla montada (las 4 tabs quedan montadas) recalculaba todo y cada card y pin recibía un objeto nuevo; además `refrescando` estaba en el mismo contexto que los datos, así que prender y apagar la ruedita era otra pasada por toda la app. Ahora cada lista conserva los objetos que no cambiaron (`conservarIguales` en el `AppContext`): un refresco sin cambios no toca el estado, y si cambió un reporte solo se redibuja ese. `refrescando` va en su propio contexto (`useRefrescando`), que solo leen los `RefreshControl` y el botón del mapa.
  2. *Tabs y pantallas ocultas seguían dibujando.* Con `freezeOnBlur` (tabs y stack de Mascotas) una pantalla que no está a la vista no se re-renderiza hasta que se vuelve a ella; el mapa, por ejemplo, no se toca mientras se refresca Mis Mascotas.
  3. *Cada `PetCard` leía el contexto* (por `useMenuMascota`), así el `memo` no servía: cualquier cambio redibujaba todas. El menú ahora lo abre la pantalla y la card lo recibe por prop.
  4. *Markers del mapa.* Ya tenían `tracksViewChanges` prendido solo 600 ms después de montar o cambiar; ahora además van con `memo`, coordenada y `onPress` estables, y el handler de Perdidos no cambia con la lista filtrada, así un refresco no redibuja los pines.
  5. *Refrescos en cadena.* No había efectos que dependieran del estado recargado ni recargas al enfocar, pero tirar dos veces (o la lista y el botón) lanzaba dos `pedirTodo` en paralelo: ahora uno en curso devuelve la misma promesa.
  Revisado y sin cambios: no hay `ScrollView` con `map` para listas largas (solo listas cortas: cuidadores de una mascota, turnos de un día), las imágenes ya eran `expo-image` (salvo el logo local del login), no hay animaciones de Reanimated en bucle (`withRepeat`), intervalos ni `console.log` en renders, y el `GestureDetector` de cada `PetCard` se queda porque el long press es un gesto pedido del Sprint 2 y la lista es corta. El proyecto ya tiene el React Compiler activo (`experiments.reactCompiler`), que memoiza dentro de cada componente.
- **Lo que ya estaba bien:** la carga inicial pide los 6 recursos en paralelo (`Promise.all`), ninguna pantalla vuelve a pedir al enfocarse, los selectores costosos (filtros de Perdidos, turnos por día) están en `useMemo`, los pines del mapa solo se redibujan al seleccionarlos, no hay `console.log` en renders ni gestos, y los endpoints de la carga inicial responden en 3 a 12 ms (medido con `curl` sobre la base del seed, sin N+1).

## Errores comunes

| Síntoma | Causa probable | Cómo se resuelve |
| --- | --- | --- |
| La app muestra "No pudimos conectarnos con el servidor" (o tarda 10 s y falla) | `EXPO_PUBLIC_API_URL` tiene una **IP equivocada**, `localhost`, o la IP de la PC cambió (pasa al cambiar de red o al reiniciar el router) | Buscá la IP actual (`ipconfig getifaddr en0` en macOS, `ipconfig` en Windows), corregí `mobile/.env` y reiniciá con `npx expo start -c`. Sin el `-c`, Metro sigue usando la IP vieja. |
| El celular no llega a la PC aunque la IP esté bien (`/api/health` no carga en el navegador del celular) | **Red de invitados** o Wi-Fi de facultad/bar con aislamiento de clientes: los dispositivos no se ven entre sí | Usá una red de casa, o compartí internet desde el celular (hotspot) y conectá la PC a esa red. La IP de la PC cambia: actualizá el `.env`. |
| Lo mismo, en una red de casa | El **firewall** de la PC bloquea las conexiones entrantes al puerto 3000 | macOS: aceptá "permitir conexiones entrantes" para `node` (o habilitalo en Ajustes → Red → Firewall). Windows: permití `node` en redes **privadas** y marcá la red Wi-Fi como privada. |
| Expo Go dice que el proyecto es incompatible con su versión | **Expo Go para otro SDK**: el proyecto usa SDK 58 | Actualizá Expo Go desde la tienda a una versión que soporte SDK 58. En Android también se puede instalar la versión exacta desde [expo.dev/go](https://expo.dev/go). No hace falta cambiar nada del proyecto. |
| `npm run dev` termina con "El puerto 3000 ya está en uso", o la app ve datos o reglas viejas | El **puerto 3000 está ocupado**, casi siempre por otro `npm run dev` que quedó abierto en otra terminal (la app le habla a ese) | Cerrá el otro proceso (`lsof -i :3000` en macOS, `netstat -ano \| findstr :3000` en Windows) o usá otro puerto: `PORT=3001` en el `.env` del backend y el mismo puerto en `EXPO_PUBLIC_API_URL`. |
| `Error: Falta DATABASE_URL en el .env (copiá .env.example).` al hacer `npm run dev`, o `PrismaConfigEnvError: Cannot resolve environment variable: DATABASE_URL` en `npm ci` o en un script de Prisma | **Falta el `.env` del backend** | En `doggy-backend`: `cp .env.example .env` y después `npx prisma generate` (o `npm ci` de nuevo). |
| `Cannot find module '../generated/prisma/client'` (o parecido) al levantar la API | **Prisma Client sin generar**: el cliente vive en `src/generated/`, que no se versiona, y en Prisma 7 `db push` no lo genera solo | En `doggy-backend`: `npx prisma generate`. Si además cambió el schema, `npm run db:reset` (regenera el cliente y recarga los datos). |
| La app vuelve al login con "Tu sesión venció" | El token ya no existe en el servidor: se reseteó la base (`db:reset` borra las sesiones) o pasaron 30 días | Volvé a entrar. Es el comportamiento esperado. |

## Pendientes a futuro

Ideas que todavía no están en la app (no tienen botones):

- **Notificaciones push:** recordatorios de turnos y de refuerzos de vacunas, y un aviso a los vecinos cuando se publica un perro perdido cerca. Con `expo-notifications`; las push remotas necesitan un development build, no alcanza Expo Go.
- **Código único de vacuna (SENASA):** cada aplicación del carnet llevaría el código único de la vacuna, validado contra una API de SENASA (o la fuente oficial que corresponda), para que el carnet sirva como constancia. Queda marcado con un `TODO` en `RegistroSanitario` (`src/types/models.ts`).
