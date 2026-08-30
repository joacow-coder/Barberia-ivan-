# Iván Beccaria — Barbería

Sitio web de una sola página para la barbería de Iván Beccaria: sección principal (hero) con estética *street graffiti* + minimalismo moderno, y un sistema de agenda de turnos online.

## Stack

HTML5, CSS3 (variables nativas, sin frameworks) y JavaScript vanilla. Sin dependencias ni pasos de build: se clona y funciona.

> Nota: se optó por CSS puro en lugar de Tailwind para que el proyecto corra sin `npm install` ni configuración adicional. Si más adelante se necesita un design system más grande, se puede migrar a Tailwind o React/Vite sin perder la estructura actual.

## Estructura

```
Barberia-Ivan/
├── index.html
├── admin.html                      ← panel de administración
├── css/
│   └── styles.css
├── js/
│   ├── supabase-config.js          ← completar SUPABASE_URL / SUPABASE_ANON_KEY
│   ├── script.js                   ← lógica del sitio público
│   └── admin.js                    ← lógica del panel admin
├── assets/
│   └── img/
│       └── barbero-principal.png   ← colocar aquí la foto del barbero
└── README.md
```

## Cómo correrlo localmente

No requiere instalación. Alcanza con abrir `index.html` en el navegador, o levantar un servidor estático simple (recomendado para que las rutas relativas y las fuentes carguen igual que en producción):

```bash
# Opción 1: Python (ya viene instalado en la mayoría de los sistemas)
python3 -m http.server 5500

# Opción 2: Node (si tenés npx disponible)
npx serve .
```

Luego abrí `http://localhost:5500` en el navegador.

## Imagen del hero

Colocá el archivo `barbero-principal.png` (horizontal, barbero a la izquierda, fondo oscuro extendido) dentro de `assets/img/`. Si el archivo no está presente, el hero muestra automáticamente el fondo degradado con los tags decorativos, sin romperse.

## Sistema de turnos

- Días habilitados: **martes a viernes**, elegidos con tarjetas visuales (no un calendario clásico).
- Horario: **14:00 a 20:00 hs**, en bloques de **30 minutos**.
- Al elegir un día se resuelve la fecha real (próxima ocurrencia de ese día de semana) y se consultan a Supabase los horarios ya ocupados; los turnos reservados aparecen deshabilitados y tachados, y los horarios pasados del día actual también se bloquean.
- El formulario valida nombre, apellido, teléfono y horario seleccionado antes de confirmar, mostrando errores inline y una animación de estado (éxito o error).
- **Persistencia:** los turnos, la configuración del sitio y la galería viven en **Supabase** (Postgres + API). No hay `localStorage` en el proyecto.

## Configuración de Supabase

1. Creá un proyecto en [supabase.com](https://supabase.com).
2. Corré este SQL en el **SQL Editor** de Supabase para crear las tablas:

```sql
create table turnos (
  id bigint generated always as identity primary key,
  cliente_nombre text not null,
  cliente_apellido text not null,
  cliente_telefono text not null,
  fecha date not null,
  hora text not null,
  created_at timestamptz default now(),
  unique (fecha, hora)
);

create table configuracion (
  id bigint generated always as identity primary key,
  titulo text,
  descripcion text,
  precio_corte numeric
);

create table galeria (
  id bigint generated always as identity primary key,
  url_archivo text not null,
  tipo text not null default 'imagen',
  titulo text,
  created_at timestamptz default now()
);

create table antes_despues (
  id bigint generated always as identity primary key,
  url_antes text not null,
  url_despues text not null,
  titulo text,
  created_at timestamptz default now()
);
```

> **Nota sobre el esquema:** el pedido original de `turnos` era `(id, cliente_nombre, fecha, hora)`. Se agregaron `cliente_apellido` y `cliente_telefono` porque el formulario los captura y son imprescindibles para que el barbero pueda contactar al cliente — sin el teléfono, un turno reservado es inútil para el negocio. También se agregó `unique (fecha, hora)` para que la base de datos rechace turnos duplicados aunque dos personas confirmen al mismo tiempo.

3. Completá `js/supabase-config.js` con los valores de **Project Settings → API**:

```js
const SUPABASE_URL = 'https://tu-proyecto.supabase.co';
const SUPABASE_ANON_KEY = 'tu-anon-key-publica';
```

4. **Seguridad — Row Level Security (RLS):** la clave `anon` es pública por diseño en Supabase — cualquiera que inspeccione el sitio puede verla. La protección real la dan las políticas de RLS. Con `admin.html` protegido por Supabase Auth (login con email/contraseña):
   - `turnos` permite SELECT e INSERT públicos (los clientes reservan sin cuenta), pero UPDATE/DELETE solo para usuarios autenticados.
   - `configuracion`, `galeria` y `antes_despues` solo permiten SELECT público; INSERT, UPDATE y DELETE quedan restringidos a usuarios autenticados, ya que esos cambios los hace únicamente el admin logueado desde `admin.html`.

```sql
alter table turnos enable row level security;
alter table configuracion enable row level security;
alter table galeria enable row level security;
alter table antes_despues enable row level security;

-- SELECT público en las cuatro tablas (el sitio, la galería y las comparaciones lo necesitan sin login)
create policy "select publico turnos" on turnos for select using (true);
create policy "select publico configuracion" on configuracion for select using (true);
create policy "select publico galeria" on galeria for select using (true);
create policy "select publico antes_despues" on antes_despues for select using (true);

-- INSERT público solo en turnos (para que cualquiera pueda reservar sin cuenta)
create policy "insert publico turnos" on turnos for insert with check (true);

-- turnos: UPDATE / DELETE solo para usuarios autenticados
create policy "update autenticado turnos" on turnos for update using (auth.role() = 'authenticated');
create policy "delete autenticado turnos" on turnos for delete using (auth.role() = 'authenticated');

-- configuracion: INSERT / UPDATE / DELETE solo para usuarios autenticados
create policy "insert autenticado configuracion" on configuracion for insert with check (auth.role() = 'authenticated');
create policy "update autenticado configuracion" on configuracion for update using (auth.role() = 'authenticated');
create policy "delete autenticado configuracion" on configuracion for delete using (auth.role() = 'authenticated');

-- galeria: INSERT / UPDATE / DELETE solo para usuarios autenticados
create policy "insert autenticado galeria" on galeria for insert with check (auth.role() = 'authenticated');
create policy "update autenticado galeria" on galeria for update using (auth.role() = 'authenticated');
create policy "delete autenticado galeria" on galeria for delete using (auth.role() = 'authenticated');

-- antes_despues: INSERT / UPDATE / DELETE solo para usuarios autenticados
create policy "insert autenticado antes_despues" on antes_despues for insert with check (auth.role() = 'authenticated');
create policy "update autenticado antes_despues" on antes_despues for update using (auth.role() = 'authenticated');
create policy "delete autenticado antes_despues" on antes_despues for delete using (auth.role() = 'authenticated');
```

Con esto, nadie puede insertar, editar ni borrar filas de `configuracion`, `galeria` o `antes_despues` sin estar logueado — ni siquiera llamando a la API de Supabase directamente con la anon key. Esas acciones solo van a funcionar desde `admin.html` con una sesión activa.

5. Creá el usuario admin en **Authentication → Users → Add user** (email + contraseña) para poder loguearte en `admin.html`. No hay registro público: los usuarios se crean a mano desde el dashboard de Supabase.

6. **Storage — bucket para las fotos de "Antes y Después":**
   - En **Storage → New bucket**, creá uno llamado exactamente `barberia_galeria` y marcalo como **público** (así las imágenes se pueden mostrar en la web sin login, vía URL pública).
   - Al ser público, la lectura (descarga) funciona automáticamente sin necesitar una policy de `select`. Pero **subir y borrar archivos sí requiere policies** en `storage.objects`, independientemente de que el bucket sea público — corré esto en el SQL Editor:

```sql
create policy "subida autenticada barberia_galeria"
on storage.objects for insert
with check (bucket_id = 'barberia_galeria' and auth.role() = 'authenticated');

create policy "borrado autenticado barberia_galeria"
on storage.objects for delete
using (bucket_id = 'barberia_galeria' and auth.role() = 'authenticated');
```

Con esto, solo el admin logueado puede subir o borrar archivos del bucket; cualquiera puede verlos vía la URL pública que genera `getPublicUrl()`.

> **Nota:** a diferencia de `galeria` (donde cargás una URL externa a mano), `antes_despues` sube los archivos directamente al Storage de Supabase desde `admin.html` y guarda la URL pública resultante. Al día de hoy, borrar una fila de `antes_despues` desde el panel **no borra el archivo del bucket** (solo la referencia en la tabla) — quedaría como una mejora pendiente si te interesa liberar espacio de Storage automáticamente.

## Panel de administración (`admin.html`)

- **Login con Supabase Auth**, simplificado a solo contraseña (`supabase.auth.signInWithPassword` con el email `admin@barberia.com` hardcodeado en `js/admin.js`). Mientras no haya sesión activa, el panel permanece oculto y solo se ve el formulario de login. Botón "Cerrar sesión" (`supabase.auth.signOut`) visible una vez logueado.
- Lista los turnos reales desde Supabase, con botón para cancelarlos (`delete`).
- Formulario para editar `configuracion` (título, descripción, precio del corte) — hace `upsert`.
- Formulario para agregar contenido a `galeria` (URL, tipo, título) y eliminarlo.
- Formulario "Gestión de Antes y Después": subís dos archivos de imagen, se cargan al bucket `barberia_galeria` de Supabase Storage, y las URLs públicas resultantes se guardan en `antes_despues`. Incluye listado con botón para eliminar cada comparación.
- La protección real no es la pantalla de login en sí (es solo UI) sino las políticas RLS de arriba: sin `auth.role() = 'authenticated'` en `update`/`delete`/`insert`, cualquiera podría cancelar turnos, borrar la galería o subir archivos al bucket llamando a la API directamente aunque nunca haya visto `admin.html`.

## Despliegue

El sitio es 100% estático, por lo que se puede publicar directamente en:
- **GitHub Pages**: activar Pages en la configuración del repositorio, apuntando a la rama `main` y carpeta raíz.
- **Netlify / Vercel**: importar el repositorio, sin build command (o `echo "static site"`), publish directory `/`.

## Repositorio

```bash
git init
git add .
git commit -m "Sitio inicial: hero + sistema de turnos"
git branch -M main
git remote add origin https://github.com/joacow-coder/Barberia-ivan-.git
git push -u origin main
```
