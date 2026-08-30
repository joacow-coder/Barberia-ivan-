(function () {
  'use strict';

  const client = typeof supabaseClient !== 'undefined' ? supabaseClient : null;
  const ADMIN_EMAIL = 'admin@barberia.com';

  const configWarning = document.getElementById('configWarning');
  if (!client && configWarning) configWarning.hidden = false;

  /* ---------------- Auth ---------------- */
  const loginView = document.getElementById('loginView');
  const adminPanel = document.getElementById('adminPanel');
  const logoutBtn = document.getElementById('logoutBtn');
  const loginForm = document.getElementById('loginForm');
  const loginPassword = document.getElementById('loginPassword');
  const loginStatus = document.getElementById('loginStatus');
  const loginSubmitBtn = document.getElementById('loginSubmitBtn');

  function showPanel(isAuthenticated) {
    if (loginView) loginView.hidden = isAuthenticated;
    if (adminPanel) adminPanel.hidden = !isAuthenticated;
    if (logoutBtn) logoutBtn.hidden = !isAuthenticated;
  }

  async function handleSession(session) {
    const isAuthenticated = !!session;
    showPanel(isAuthenticated);

    if (isAuthenticated) {
      await Promise.all([loadTurnos(), loadConfiguracion(), loadGaleria()]);
    }
  }

  async function initAuth() {
    if (!client) {
      showPanel(false);
      return;
    }

    const { data, error } = await client.auth.getSession();
    if (error) console.error(error);
    await handleSession(data ? data.session : null);

    client.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!client) {
        loginStatus.className = 'form-status error';
        loginStatus.textContent = 'Supabase no está configurado.';
        return;
      }

      loginSubmitBtn.disabled = true;
      loginStatus.className = 'form-status';
      loginStatus.textContent = '';

      const { error } = await client.auth.signInWithPassword({
        email: ADMIN_EMAIL,
        password: loginPassword.value,
      });

      loginSubmitBtn.disabled = false;

      if (error) {
        loginStatus.className = 'form-status error';
        loginStatus.textContent = 'Contraseña incorrecta.';
        return;
      }

      loginForm.reset();
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      if (!client) return;
      await client.auth.signOut();
    });
  }

  function formatFecha(dateISO) {
    const [y, m, d] = dateISO.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-AR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  }

  /* ---------------- Turnos ---------------- */
  const turnosBody = document.getElementById('turnosBody');
  const turnosStatus = document.getElementById('turnosStatus');

  function renderTurnosMessage(message) {
    turnosBody.innerHTML = '';
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 5;
    cell.textContent = message;
    row.appendChild(cell);
    turnosBody.appendChild(row);
  }

  async function loadTurnos() {
    if (!client) {
      renderTurnosMessage('Supabase no configurado.');
      return;
    }

    renderTurnosMessage('Cargando turnos…');

    const { data, error } = await client
      .from('turnos')
      .select('*')
      .order('fecha', { ascending: true })
      .order('hora', { ascending: true });

    if (error) {
      console.error(error);
      renderTurnosMessage('No se pudieron cargar los turnos.');
      return;
    }

    if (!data || !data.length) {
      renderTurnosMessage('No hay turnos reservados.');
      return;
    }

    turnosBody.innerHTML = '';
    data.forEach((turno) => {
      const row = document.createElement('tr');
      const cliente = [turno.cliente_nombre, turno.cliente_apellido].filter(Boolean).join(' ');
      const values = [formatFecha(turno.fecha), turno.hora, cliente, turno.cliente_telefono || '—'];

      values.forEach((value) => {
        const td = document.createElement('td');
        td.textContent = value;
        row.appendChild(td);
      });

      const actionTd = document.createElement('td');
      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'btn btn-sm admin-cancel-btn';
      cancelBtn.textContent = 'Cancelar';
      cancelBtn.addEventListener('click', () => cancelarTurno(turno.id, cancelBtn));
      actionTd.appendChild(cancelBtn);
      row.appendChild(actionTd);

      turnosBody.appendChild(row);
    });
  }

  async function cancelarTurno(id, btn) {
    if (!confirm('¿Cancelar este turno?')) return;

    btn.disabled = true;
    btn.textContent = 'Cancelando…';

    const { error } = await client.from('turnos').delete().eq('id', id);

    if (error) {
      console.error(error);
      turnosStatus.textContent = 'No se pudo cancelar el turno.';
      btn.disabled = false;
      btn.textContent = 'Cancelar';
      return;
    }

    turnosStatus.textContent = 'Turno cancelado.';
    await loadTurnos();
  }

  /* ---------------- Configuración ---------------- */
  const configForm = document.getElementById('configForm');
  const cfgTitulo = document.getElementById('cfgTitulo');
  const cfgDescripcion = document.getElementById('cfgDescripcion');
  const cfgPrecio = document.getElementById('cfgPrecio');
  const configStatus = document.getElementById('configStatus');
  const configSubmitBtn = document.getElementById('configSubmitBtn');

  let configId = null;

  async function loadConfiguracion() {
    if (!client) return;

    const { data, error } = await client.from('configuracion').select('*').limit(1).maybeSingle();

    if (error) {
      console.error(error);
      configStatus.textContent = 'No se pudo cargar la configuración.';
      return;
    }

    if (data) {
      configId = data.id;
      cfgTitulo.value = data.titulo || '';
      cfgDescripcion.value = data.descripcion || '';
      cfgPrecio.value = data.precio_corte ?? '';
    }
  }

  configForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!client) return;

    configSubmitBtn.disabled = true;
    configStatus.textContent = '';

    const payload = {
      titulo: cfgTitulo.value.trim(),
      descripcion: cfgDescripcion.value.trim(),
      precio_corte: cfgPrecio.value === '' ? null : Number(cfgPrecio.value),
    };
    if (configId) payload.id = configId;

    const { data, error } = await client.from('configuracion').upsert(payload).select().maybeSingle();

    configSubmitBtn.disabled = false;

    if (error) {
      console.error(error);
      configStatus.textContent = 'No se pudo guardar la configuración.';
      return;
    }

    if (data) configId = data.id;
    configStatus.textContent = 'Configuración guardada.';
  });

  /* ---------------- Galería ---------------- */
  const galeriaForm = document.getElementById('galeriaForm');
  const galUrl = document.getElementById('galUrl');
  const galTipo = document.getElementById('galTipo');
  const galTitulo = document.getElementById('galTitulo');
  const galeriaStatus = document.getElementById('galeriaStatus');
  const galeriaSubmitBtn = document.getElementById('galeriaSubmitBtn');
  const galeriaList = document.getElementById('galeriaList');

  function renderGaleriaMessage(message) {
    galeriaList.innerHTML = '';
    const p = document.createElement('p');
    p.className = 'gallery-placeholder';
    p.textContent = message;
    galeriaList.appendChild(p);
  }

  async function loadGaleria() {
    if (!client) {
      renderGaleriaMessage('Supabase no configurado.');
      return;
    }

    renderGaleriaMessage('Cargando galería…');

    const { data, error } = await client.from('galeria').select('*').order('id', { ascending: false });

    if (error) {
      console.error(error);
      renderGaleriaMessage('No se pudo cargar la galería.');
      return;
    }

    if (!data || !data.length) {
      renderGaleriaMessage('Todavía no hay contenido.');
      return;
    }

    galeriaList.innerHTML = '';
    data.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'admin-gallery-card';

      const media = item.tipo === 'video'
        ? Object.assign(document.createElement('video'), {
            src: item.url_archivo,
            muted: true,
            controls: true,
          })
        : Object.assign(document.createElement('img'), {
            src: item.url_archivo,
            alt: item.titulo || '',
          });

      const info = document.createElement('div');
      info.className = 'admin-gallery-info';

      const titleEl = document.createElement('strong');
      titleEl.textContent = item.titulo || '(sin título)';

      const typeEl = document.createElement('span');
      typeEl.textContent = item.tipo;

      info.appendChild(titleEl);
      info.appendChild(typeEl);

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'btn btn-sm admin-cancel-btn';
      deleteBtn.textContent = 'Eliminar';
      deleteBtn.addEventListener('click', () => eliminarGaleria(item.id, deleteBtn));

      card.appendChild(media);
      card.appendChild(info);
      card.appendChild(deleteBtn);
      galeriaList.appendChild(card);
    });
  }

  galeriaForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!client) return;
    if (!galUrl.value.trim()) return;

    galeriaSubmitBtn.disabled = true;
    galeriaStatus.textContent = '';

    const { error } = await client.from('galeria').insert([{
      url_archivo: galUrl.value.trim(),
      tipo: galTipo.value,
      titulo: galTitulo.value.trim(),
    }]);

    galeriaSubmitBtn.disabled = false;

    if (error) {
      console.error(error);
      galeriaStatus.textContent = 'No se pudo agregar el contenido.';
      return;
    }

    galeriaStatus.textContent = 'Contenido agregado.';
    galeriaForm.reset();
    galTipo.value = 'imagen';
    await loadGaleria();
  });

  async function eliminarGaleria(id, btn) {
    if (!confirm('¿Eliminar este contenido de la galería?')) return;

    btn.disabled = true;

    const { error } = await client.from('galeria').delete().eq('id', id);

    if (error) {
      console.error(error);
      galeriaStatus.textContent = 'No se pudo eliminar.';
      btn.disabled = false;
      return;
    }

    await loadGaleria();
  }

  /* ---------------- Init ---------------- */
  initAuth();
})();
