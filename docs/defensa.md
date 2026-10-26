# Machete para la defensa — Sprint 2

Preguntas probables sobre el Sprint 2, con una respuesta corta y dónde se ve en el código. Las rutas que empiezan con `mobile/` son de este repo; las que empiezan con `doggy-backend/`, del repo de la API.

## Arquitectura

**¿Cómo está armada la app?**
En capas: Expo → HTTP → Express → Prisma → SQLite. La pantalla llama a una acción del `AppContext`, el contexto llama a un service, el service hace el `fetch`; en el servidor, Express valida y decide, Prisma consulta y SQLite guarda. Cada capa sabe lo mínimo de la siguiente: las pantallas no saben de HTTP y la app nunca toca la base.
→ `mobile/src/context/AppContext.tsx`, `mobile/src/services/http.ts`, `doggy-backend/src/index.ts`, `doggy-backend/src/lib/prisma.ts`

**¿Por qué dos repositorios?**
Lo pide la cátedra, y además separa responsabilidades: la app solo conoce la API por HTTP. El contrato entre los dos (endpoints, forma del JSON, status) está escrito en el `CLAUDE.md` de cada repo y los tipos de `models.ts` son la forma exacta del JSON.
→ `mobile/src/types/models.ts`, `CLAUDE.md` (sección "Contrato")

**¿Por qué al conectar el backend casi no cambiaron las pantallas?**
Porque desde el Sprint 1 los services tenían la misma firma que tienen ahora (funciones `async` que devuelven los tipos de `models.ts`). Solo cambió su interior: antes simulaban la red, ahora llaman a `pedirJson`.
→ `mobile/src/services/*.ts`

**¿Por qué la URL de la API es una IP y no `localhost`?**
Porque la app corre en el celular: ahí `localhost` es el celular, no la PC. Se configura en `EXPO_PUBLIC_API_URL`, y el servidor escucha en `0.0.0.0` para aceptar conexiones de la red.
→ `mobile/src/config.ts`, `mobile/.env.example`, `doggy-backend/src/index.ts` (`app.listen`)

**Contame el viaje de un dato.**
"Publicar como perdida": `handlePublicar` arma el reporte → `crearReporte` del contexto (sube la foto si es local) → `reportes.ts` hace `POST /api/reportes` con el token → `requiereUsuario` saca el usuario del token → la ruta valida (400), chequea que la mascota exista (404), que sea suya (403) y que no tenga otro reporte activo (409) → `prisma.reportePerdida.create` → 201 con el reporte → el contexto lo suma al estado → la pantalla vibra y navega a Perdidos, que centra el mapa en el marker nuevo. Está paso a paso en el README.
→ `mobile/app/mi-mascota-perdida.tsx`, `doggy-backend/src/rutas/reportes.ts`

**Después de un POST, ¿vuelven a pedir la lista como en la práctica?**
No: el servidor responde 201 con lo creado y el contexto lo agrega al estado (`setReportes((prev) => [...prev, nuevo])`). Es la versión real del recurso, con su `id`, así que no hace falta otro pedido.
→ `mobile/src/context/AppContext.tsx` (`crearReporte`)

## REST: verbos y códigos de estado

**¿Por qué PATCH y no PUT?**
PUT reemplaza el recurso entero: lo que no mandás se pierde. PATCH cambia solo una parte: un campo que no viene no se toca. Para borrar un opcional se manda `null` explícito, porque `JSON.stringify` descarta los `undefined`.
→ `doggy-backend/src/cuerpos/*.ts` (`leerCambios…`), `mobile/src/services/registros.ts` (manda `null` en los opcionales)

**¿Por qué cerrar un reporte es un PATCH y no un DELETE?**
Porque no se borra: se le pone fecha en `cerradoEn` y queda como historial. `GET /api/reportes` devuelve solo los activos. Un reporte cerrado no se puede editar ni reabrir (409).
→ `doggy-backend/src/rutas/reportes.ts`, `doggy-backend/prisma/schema.prisma` (`cerradoEn`)

**¿Qué códigos de estado usan?**
200 GET/PATCH bien · 201 POST creó (devuelve lo creado) · 204 DELETE bien, sin body · 400 datos o id inválidos · 401 sin sesión válida o login incorrecto · 403 con sesión pero sin permiso · 404 no existe · 409 conflicto (email repetido, ya asignado, único dueño, reporte cerrado o duplicado) · 410 código de asignación vencido o usado · 413 foto de más de 5 MB · 500 imprevisto. Todo error viaja como `{ error: "mensaje" }` y la app lo muestra tal cual.
→ tabla en `CLAUDE.md`, `doggy-backend/src/lib/errores.ts`

**¿Diferencia entre 401 y 403?**
401: no sé quién sos (sin token, inválido, vencido o cerrado). 403: sé quién sos, pero no podés tocar eso (por ejemplo, editar una mascota a la que no estás asignado).
→ `doggy-backend/src/middlewares/requiereUsuario.ts` (401), `doggy-backend/src/lib/asignaciones.ts` (403)

**¿Por qué 410 y no 404 para un código ya usado?**
404 es "nunca existió". 410 (Gone) es "existió pero ya no sirve": así la app puede decir "este código ya se usó" en vez de "no existe". Los códigos son de un solo uso y no vencen.
→ `doggy-backend/src/rutas/invitaciones.ts`

**¿Cómo maneja la app un 204?**
Con `pedirSinRespuesta`, que solo revisa `response.ok` y no intenta leer JSON (fallaría con el body vacío).
→ `mobile/src/services/http.ts`

**¿En qué orden chequea una ruta?**
`parseId` (400) → existe (404) → permiso (403) → validar body (400) → escribir (P2025 → 404, P2002 → 409) → responder. Todo dentro de un `try/catch` que responde 500 genérico.
→ `doggy-backend/src/rutas/mascotas.ts` (`PATCH /:id`), `doggy-backend/src/lib/entrada.ts`

## Login y sesión

**¿Cómo funciona el login?**
`POST /api/auth/login` con email y contraseña. El servidor busca el usuario, compara la contraseña con bcrypt y, si coincide, crea un token aleatorio, guarda su hash en la tabla `Sesion` y devuelve `{ usuario, token }`. La app guarda el token con `expo-secure-store` y lo manda en cada pedido como `Authorization: Bearer <token>`. El middleware `requiereUsuario` lo valida y pone `req.usuarioId`.
→ `doggy-backend/src/rutas/auth.ts`, `doggy-backend/src/lib/sesiones.ts`, `mobile/src/services/sesion.ts`

**¿Cómo se guarda la contraseña?**
Con bcrypt (10 rondas): un hash lento y con sal, nunca el texto. `passwordHash` nunca sale en una respuesta, porque `aUsuario` arma el JSON campo por campo.
→ `doggy-backend/src/lib/sesiones.ts` (`hashearPassword`), `doggy-backend/src/respuestas.ts` (`aUsuario`)

**¿Por qué el login responde lo mismo si el email no existe?**
Para no delatar qué emails tienen cuenta. Además, si no hay cuenta igual compara contra un hash de relleno, así la respuesta tarda lo mismo.
→ `doggy-backend/src/lib/sesiones.ts` (`HASH_DE_RELLENO`, `passwordCorrecta`)

**¿Por qué el token se guarda hasheado?**
El token es como una contraseña temporal: quien lo tiene entra. Si en la base estuviera tal cual, una copia de `dev.db` serviría para entrar como cualquiera. Se guarda su SHA-256: cuando llega un pedido, se hashea el token del header y se busca ese hash. Alcanza con SHA-256 (y no bcrypt) porque el token son 32 bytes aleatorios: no se puede adivinar por fuerza bruta como una contraseña elegida por una persona.
→ `doggy-backend/src/lib/sesiones.ts` (`hashToken`), `doggy-backend/prisma/schema.prisma` (`Sesion.tokenHash`)

**¿Por qué no JWT?**
Porque el logout tiene que invalidar el token al instante. Con la tabla `Sesion` es borrar una fila; un JWT es válido hasta que vence, y para cerrarlo antes habría que llevar una lista negra en la base igual. Tampoco hace falta guardar una clave secreta.
→ `doggy-backend/src/lib/sesiones.ts` (`cerrarSesion`)

**¿Qué pasa si la sesión vence?**
Cualquier ruta responde 401. `http.ts` lo detecta, borra el token, avisa al `AppContext`, que vacía el estado y vuelve al login con "Tu sesión venció". El login y el logout son la excepción: su 401 significa otra cosa.
→ `mobile/src/services/http.ts` (`sesionVencida`, `RUTAS_CON_401_PROPIO`), `mobile/src/context/AppContext.tsx`

**¿Por qué `expo-secure-store` y no AsyncStorage?**
Porque el token da acceso a la cuenta: secure-store lo guarda cifrado en el Keychain (iOS) o el Keystore (Android). AsyncStorage es texto plano.
→ `mobile/src/services/sesion.ts`

**¿De dónde sale el usuario en una ruta? ¿Podría mandar otro id en el body?**
Siempre de `req.usuarioId`, que pone el middleware a partir del token. Del body se toman solo los campos permitidos (`pick`), así que mandar `autorId`, `tutorId` o `passwordHash` no tiene efecto.
→ `doggy-backend/src/lib/entrada.ts` (`pick`), `doggy-backend/src/middlewares/requiereUsuario.ts`

## Validación y permisos

**Si la app ya valida, ¿por qué valida el servidor?**
Porque nunca se confía en el cliente: cualquiera puede mandar un pedido con `curl`. Las reglas son las mismas en los dos lados (largos, caracteres, formatos, fechas) para que el usuario vea el error antes de mandar y el servidor lo rechace igual si llega.
→ `mobile/src/utils/validaciones.ts` y su espejo `doggy-backend/src/validaciones.ts`

**¿Quién puede modificar qué?**
Solo se escribe sobre mascotas a las que el usuario está asignado, como dueño o invitado. Solo un dueño genera códigos de asignación. Un reporte lo edita o cierra su autor o alguien asignado a la mascota. El único dueño no se puede desasignar (409).
→ `doggy-backend/src/lib/asignaciones.ts`, `doggy-backend/src/rutas/mascotas.ts`

**¿Cómo identifica el escáner a un perro ajeno si solo ves tus mascotas?**
Con `GET /api/mascotas/codigo/:codigo`, la única lectura de una mascota ajena. Devuelve solo los datos públicos (nombre, edad, raza, señas, foto, código) y el nombre del tutor, sin carnet ni otros datos del dueño.

**¿Quién ve el teléfono del dueño al escanear el QR?**
Solo si la mascota tiene un reporte de perdida activo (o si quien escanea está asignado a ella). Lo filtra el servidor en `aMascotaPublica`: si lo ocultara solo la app, igual viajaría en la respuesta y cualquiera podría leerlo llamando a la API.
→ `doggy-backend/src/rutas/mascotas.ts`, `doggy-backend/src/respuestas.ts` (`aMascotaPublica`)

## Fotos

**¿Cómo se suben las fotos?**
En dos pasos. Primero la app sube el archivo con `POST /api/fotos` (`multipart/form-data`, campo `foto`) y el servidor responde `{ foto: "/uploads/<nombre>.jpg" }`. Después la app guarda esa ruta en el campo `foto` de la mascota, el perfil, el reporte o el registro. Lo hace `conFotoSubida` en el contexto, en un solo lugar para todas las acciones; si la foto no cambió, no sube nada.
→ `mobile/src/services/fotos.ts` (`subirFoto`, `conFotoSubida`), `doggy-backend/src/rutas/fotos.ts`

**¿Por qué no se guardaba la URI del celular como en el Sprint 1?**
Porque `file://…` es un archivo temporal de ese celular: se pierde al cerrar la app y nadie más lo ve. El servidor rechaza esas URIs con 400.
→ `doggy-backend/src/lib/entrada.ts` (`leerFoto`)

**¿Cómo sabe el servidor que es una imagen?**
Por la firma del archivo (los primeros bytes): JPG empieza con `FF D8 FF`, PNG con `89 50 4E 47`, WEBP con `RIFF…WEBP`. No se confía en el nombre ni en el mimetype que manda el cliente, porque se pueden falsear. Multer lo lee en memoria con tope de 5 MB (413) y recién si pasa se escribe con un nombre aleatorio.
→ `doggy-backend/src/lib/fotos.ts` (`detectarFormato`, `guardarFoto`)

**¿Por qué se guarda `/uploads/abc.jpg` y no la URL completa?**
Porque la IP de la PC cambia. La app arma la URL al mostrarla: `API_URL + foto`.
→ `mobile/src/data/fotos.ts` (`fuenteFoto`)

**¿Por qué `/uploads` es público?**
Porque el componente `Image` carga la foto sin headers, así que no puede mandar el token. Los nombres son aleatorios (32 caracteres hex): no se pueden adivinar.
→ `doggy-backend/src/index.ts` (`express.static`)

**¿Qué tuvieron que resolver para subir archivos en SDK 58?**
El `fetch` de SDK 58 (`expo/fetch`) no acepta la parte clásica `{ uri, name, type }` en un FormData: falla con "Unsupported FormDataPart implementation". En iOS y Android se agrega un `File` de `expo-file-system`; en web, un Blob. Tampoco se pone `Content-Type` a mano: fetch arma el boundary.
→ `mobile/src/services/fotos.ts` (`armarFormData`), `mobile/src/services/http.ts` (`armarHeaders`)

**¿Qué pasa con la foto vieja cuando se reemplaza?**
El servidor borra el archivo si ninguna otra fila lo usa (`borrarFotoSiHuerfana`). Cerrar un reporte no borra su foto: queda como historial.
→ `doggy-backend/src/lib/fotos.ts`

## Gestos

**¿Qué gestos hicieron?**
Visor de fotos (pan, pinch, rotación, doble tap y arrastrar para cerrar), deslizar para borrar turnos y registros, mantener presionada una mascota para acciones rápidas y fling para cambiar de mes. Todos tienen una alternativa tocable.
→ `mobile/src/components/VisorFoto.tsx`, `DeslizarParaBorrar.tsx`, `PetCard.tsx`, `agenda/Calendario.tsx`

**¿Por qué los gestos corren en el hilo de UI?**
Porque el hilo de JS puede estar ocupado (un render, un fetch, parsear JSON) y si cada cuadro del gesto tuviera que pasar por ahí, la animación se trabaría. Los callbacks del gesto son worklets que corren en el hilo de UI y modifican shared values (`useSharedValue`); `useAnimatedStyle` aplica el estilo ahí mismo, a 60/120 fps, sin cruzar al hilo de JS.
→ `mobile/src/components/VisorFoto.tsx`

**¿Cuándo vuelven al hilo de JS?**
Solo cuando el gesto se activa o termina (`onActivate`, `onDeactivate`), con `scheduleOnRN`, para lo que necesita React: navegar, abrir un menú, borrar, vibrar. Nunca en `onUpdate`, que corre en cada cuadro. Para la vibración de un umbral se usa `useAnimatedReaction`, que vuelve solo en el cruce.
→ `mobile/src/components/DeslizarParaBorrar.tsx` (`useAnimatedReaction`), `mobile/src/components/PetCard.tsx`

**¿Por qué animan solo `transform` y `opacity`?**
Porque no cambian el layout: no obligan a recalcular el tamaño y la posición de los demás elementos, y se pueden componer directo en la GPU.

**¿Cómo combinan varios gestos?**
En el visor, `useExclusiveGestures(dobleTap, useSimultaneousGestures(pan, pinch, rotacion))`: mover, hacer zoom y girar van a la vez, y el doble tap tiene prioridad. En la card de mascota, `useExclusiveGestures(mantener, tocar)`: el tap espera a que falle el long press. En el calendario, `useCompetingGestures` entre dos flings: gana el primero que se activa.
→ `mobile/src/components/VisorFoto.tsx`, `PetCard.tsx`, `agenda/Calendario.tsx`

**¿Por qué el visor tiene su propio `GestureHandlerRootView`?**
Porque el `Modal` se dibuja fuera de la raíz de la app, y sin una raíz propia los gestos no responden en Android.
→ `mobile/src/components/VisorFoto.tsx`, `mobile/app/_layout.tsx`

## Qué cambió respecto de la clase

**gesture-handler 3 y Reanimated 4 (SDK 58)**

| Clase | Proyecto | Por qué |
| --- | --- | --- |
| `Gesture.Pan()`, `Gesture.Pinch()`, … | `usePanGesture`, `usePinchGesture`, … | En gesture-handler 3 los builders están deprecados; los gestos son hooks. |
| `Gesture.Simultaneous/Exclusive/Race` | `useSimultaneousGestures`, `useExclusiveGestures`, `useCompetingGestures` | La composición también es un hook (y `Race` cambió de nombre). |
| `.onBegin(...).onUpdate(...)` encadenado | Un objeto `{ onBegin, onUpdate, … }` | Los hooks reciben toda la configuración junta. |
| `onStart` / `onEnd` | `onActivate` / `onDeactivate` | Cambiaron de nombre. |
| `runOnJS(fn)(args)` | `scheduleOnRN(fn, args)` de `react-native-worklets` | En Reanimated 4 los hilos pasaron a worklets y `runOnJS` quedó deprecado. |
| `'worklet'` en cada callback | No hace falta en los callbacks de los hooks | El plugin de Babel los convierte solo. |
| `sv.value` | `sv.get()` / `sv.set()` | Recomendado en Reanimated 4 para el React Compiler. |
| `Swipeable` | `ReanimatedSwipeable` | El viejo ya no está en la versión 3. |

No cambian `GestureDetector`, `useSharedValue`, `useAnimatedStyle`, `withSpring` ni los datos del evento. Tabla completa en el README ("API de gestos: diferencias con la clase").

**Prisma 7**

| Prisma de los ejemplos clásicos | Prisma 7 en el proyecto |
| --- | --- |
| `url = env("DATABASE_URL")` en el `datasource` del schema | La URL va en `prisma.config.ts`, que importa `dotenv/config` (la CLI ya no carga el `.env` sola) |
| `generator client { provider = "prisma-client-js" }` e `import { PrismaClient } from '@prisma/client'` | `provider = "prisma-client"` con `output` en `src/generated/prisma`, y se importa de ahí |
| `new PrismaClient()` | `new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) })`: driver adapter obligatorio |
| `db push` o `migrate` generaban el cliente | Hay que correr `prisma generate` aparte (los scripts lo encadenan) |
| Seed en el `package.json` | Seed en `prisma.config.ts` (`migrations.seed`) |

→ `doggy-backend/prisma.config.ts`, `doggy-backend/prisma/schema.prisma`, `doggy-backend/src/lib/prisma.ts`, `doggy-backend/package.json`

Detalle extra: `npx prisma studio` no anda con `file:./dev.db` en Prisma 7.10 (la CLI no reconoce el protocolo sin `://`); por eso `npm run studio` le pasa la ruta absoluta.
→ `doggy-backend/scripts/studio.ts`

## Modelo de datos y Prisma

**¿Qué tablas hay y cómo se relacionan?**
`Usuario` y `Mascota` se unen por `Cuidador` (muchos a muchos, con el rol dueño/invitado y `@@unique([mascotaId, usuarioId])`). De `Mascota` cuelgan `RegistroSanitario`, `Turno`, `ReportePerdida` e `Invitacion`. `ReportePerdida` tiene `Etiqueta` en una tabla aparte. `Sesion` cuelga de `Usuario`.
→ `doggy-backend/prisma/schema.prisma`

**¿Por qué los enums son `String`?**
SQLite no hace cumplir los enums, así que se guardan como texto y Express los valida contra las listas de `src/dominio.ts`.
→ `doggy-backend/src/dominio.ts`

**¿Por qué las etiquetas van en otra tabla si la app recibe un array?**
SQLite no guarda listas. La ruta las convierte a `etiquetas: string[]` antes de responder, para respetar el tipo de la app.
→ `doggy-backend/src/respuestas.ts` (`aReporte`)

**¿Cómo prueban la API?**
`npm test` en `doggy-backend`: más de 250 chequeos con `curl` contra una base aparte (`test.db`) y la API en el puerto 3001, con todos los casos de error y de permisos entre usuarios.
→ `doggy-backend/scripts/probar.sh`
