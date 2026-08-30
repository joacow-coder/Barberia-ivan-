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
```

> **Nota sobre el esquema:** el pedido original de `turnos` era `(id, cliente_nombre, fecha, hora)`. Se agregaron `cliente_apellido` y `cliente_telefono` porque el formulario los captura y son imprescindibles para que el barbero pueda contactar al cliente — sin el teléfono, un turno reservado es inútil para el negocio. También se agregó `unique (fecha, hora)` para que la base de datos rechace turnos duplicados aunque dos personas confirmen al mismo tiempo.

3. Completá `js/supabase-config.js` con los valores de **Project Settings → API**:

```js
const SUPABASE_URL = 'https://tu-proyecto.supabase.co';
const SUPABASE_ANON_KEY = 'tu-anon-key-publica';
```

4. **Seguridad (importante):** la clave `anon` es pública por diseño en Supabase — cualquiera que inspeccione el sitio puede verla. La protección real la dan las políticas de **Row Level Security (RLS)**. Sin RLS, cualquier visitante (o el propio `admin.html`, que no tiene login) puede leer y escribir todas las tablas. Como mínimo:

```sql
alter table turnos enable row level security;
alter table configuracion enable row level security;
alter table galeria enable row level security;

-- Lectura pública (necesaria para el sitio y la galería)
create policy "lectura publica turnos" on turnos for select using (true);
create policy "lectura publica configuracion" on configuracion for select using (true);
create policy "lectura publica galeria" on galeria for select using (true);

-- Cualquiera puede reservar un turno (insert), pero no editar/borrar turnos ajenos
create policy "insertar turno publico" on turnos for insert with check (true);
```

Con esas policies, cualquier visitante puede **crear** turnos (como debe ser) pero **no** puede cancelarlos ni tocar `configuracion`/`galeria` desde la consola del navegador. Eso significa que, tal cual está hoy, **`admin.html` no podrá cancelar turnos, guardar configuración ni gestionar la galería sin agregar autenticación** (Supabase Auth) y políticas que exijan un usuario logueado para esas operaciones. Si querés, se puede sumar un login simple de Supabase Auth para destrabar esto — no se implementó porque no fue parte de este pedido.

## Panel de administración (`admin.html`)

- Lista los turnos reales desde Supabase, con botón para cancelarlos (`delete`).
- Formulario para editar `configuracion` (título, descripción, precio del corte) — hace `upsert`.
- Formulario para agregar contenido a `galeria` (URL, tipo, título) y eliminarlo.
- **No tiene login.** Es una página estática más del sitio; cualquiera con la URL puede abrirla. Sumale al menos una de estas capas antes de usarlo en producción:
  - Supabase Auth (email/password o magic link) + políticas RLS que exijan `auth.uid()`.
  - Restringir el acceso a `/admin.html` a nivel de hosting (ej. Basic Auth en Netlify/Vercel).

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
