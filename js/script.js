(function () {
  'use strict';

  /* ---------------- Config ---------------- */
  const ALLOWED_DAYS = [2, 3, 4, 5]; // martes(2) a viernes(5)
  const OPEN_HOUR = 14;
  const CLOSE_HOUR = 20;
  const SLOT_MINUTES = 30;

  const client = typeof supabaseClient !== 'undefined' ? supabaseClient : null;

  /* ---------------- Header scroll state ---------------- */
  const header = document.getElementById('siteHeader');
  const onScroll = () => {
    header.classList.toggle('is-scrolled', window.scrollY > 24);
  };
  document.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------------- Hero image fallback ---------------- */
  const heroImg = document.getElementById('heroImg');
  if (heroImg) {
    heroImg.addEventListener('error', () => {
      heroImg.classList.add('img-error');
    });
  }

  /* ---------------- Scroll reveal ---------------- */
  const revealEls = document.querySelectorAll('.reveal');
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  revealEls.forEach((el) => revealObserver.observe(el));

  /* ---------------- Date helpers ---------------- */
  function parseLocalDate(value) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function todayISO() {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return toISO(now);
  }

  function toISO(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function nextDateForWeekday(dayNum) {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const lastSlotStart = CLOSE_HOUR * 60 - SLOT_MINUTES;

    let diff = (dayNum - now.getDay() + 7) % 7;
    if (diff === 0 && currentMinutes >= lastSlotStart) {
      diff = 7;
    }

    const target = new Date(now);
    target.setDate(now.getDate() + diff);
    target.setHours(0, 0, 0, 0);
    return toISO(target);
  }

  function formatShortDate(dateISO) {
    return parseLocalDate(dateISO).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
  }

  function buildTimeSlots() {
    const slots = [];
    let totalMinutes = OPEN_HOUR * 60;
    const closeMinutes = CLOSE_HOUR * 60;
    while (totalMinutes < closeMinutes) {
      const h = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
      const m = String(totalMinutes % 60).padStart(2, '0');
      slots.push(`${h}:${m}`);
      totalMinutes += SLOT_MINUTES;
    }
    return slots;
  }

  /* ---------------- Supabase data access ---------------- */
  async function fetchConfiguracion() {
    if (!client) return null;
    const { data, error } = await client.from('configuracion').select('*').limit(1).maybeSingle();
    if (error) {
      console.error('Error al traer configuración:', error);
      return null;
    }
    return data;
  }

  async function fetchGaleria() {
    if (!client) return [];
    const { data, error } = await client.from('galeria').select('*').order('id', { ascending: true });
    if (error) {
      console.error('Error al traer galería:', error);
      return [];
    }
    return data || [];
  }

  async function fetchAntesDespues() {
    if (!client) return [];
    const { data, error } = await client.from('antes_despues').select('*').order('id', { ascending: true });
    if (error) {
      console.error('Error al traer antes/después:', error);
      return [];
    }
    return data || [];
  }

  async function fetchHorasOcupadas(dateISO) {
    if (!client) return [];
    const { data, error } = await client.from('turnos').select('hora').eq('fecha', dateISO);
    if (error) {
      console.error('Error al traer turnos:', error);
      return [];
    }
    return (data || []).map((row) => row.hora);
  }

  async function crearTurno(payload) {
    if (!client) return { error: { message: 'Supabase no configurado' } };
    return client.from('turnos').insert([payload]);
  }

  /* ---------------- Loading / config warning ---------------- */
  function setPageLoading(isLoading) {
    const loader = document.getElementById('pageLoader');
    if (loader) loader.classList.toggle('is-hidden', !isLoading);
  }

  function showConfigWarning() {
    const banner = document.getElementById('configWarning');
    if (banner) banner.hidden = false;
  }

  /* ---------------- Render: configuración ---------------- */
  function applyConfiguracion(config) {
    if (!config) return;

    const subtitleEl = document.querySelector('.hero-subtitle');
    if (config.descripcion && subtitleEl) {
      subtitleEl.textContent = config.descripcion;
    }

    const priceEl = document.getElementById('precioCorte');
    if (priceEl) {
      if (config.precio_corte !== null && config.precio_corte !== undefined) {
        priceEl.textContent = `Corte de pelo — $${config.precio_corte}`;
        priceEl.hidden = false;
      } else {
        priceEl.hidden = true;
      }
    }
  }

  /* ---------------- Render: galería ---------------- */
  function renderGaleria(items) {
    const galleryGrid = document.getElementById('galleryGrid');
    if (!galleryGrid) return;

    if (!items.length) {
      galleryGrid.innerHTML = '<p class="gallery-placeholder">Todavía no hay contenido cargado.</p>';
      return;
    }

    galleryGrid.innerHTML = '';
    items.forEach((item) => {
      const figure = document.createElement('figure');
      figure.className = 'gallery-item';

      const media = item.tipo === 'video'
        ? Object.assign(document.createElement('video'), {
            src: item.url_archivo,
            muted: true,
            controls: true,
            playsInline: true,
          })
        : Object.assign(document.createElement('img'), {
            src: item.url_archivo,
            alt: item.titulo || 'Trabajo de Iván Beccaria',
            loading: 'lazy',
          });

      figure.appendChild(media);

      if (item.titulo) {
        const caption = document.createElement('figcaption');
        caption.textContent = item.titulo;
        figure.appendChild(caption);
      }

      galleryGrid.appendChild(figure);
    });
  }

  /* ---------------- Render: antes y después ---------------- */
  function wireBeforeAfterInteraction(slider) {
    function setPosFromClientX(clientX) {
      const rect = slider.getBoundingClientRect();
      const pct = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
      slider.style.setProperty('--pos', `${pct}%`);
    }

    slider.addEventListener('pointermove', (e) => setPosFromClientX(e.clientX));

    slider.addEventListener('keydown', (e) => {
      const current = parseFloat(slider.style.getPropertyValue('--pos')) || 50;
      if (e.key === 'ArrowLeft') {
        slider.style.setProperty('--pos', `${Math.max(0, current - 5)}%`);
        e.preventDefault();
      } else if (e.key === 'ArrowRight') {
        slider.style.setProperty('--pos', `${Math.min(100, current + 5)}%`);
        e.preventDefault();
      }
    });
  }

  function renderAntesDespues(items) {
    const grid = document.getElementById('beforeAfterGrid');
    if (!grid) return;

    if (!items.length) {
      grid.innerHTML = '<p class="gallery-placeholder">Todavía no hay comparaciones cargadas.</p>';
      return;
    }

    grid.innerHTML = '';
    items.forEach((item) => {
      const slider = document.createElement('div');
      slider.className = 'ba-slider';
      slider.style.setProperty('--pos', '50%');
      slider.tabIndex = 0;
      slider.setAttribute('role', 'group');
      slider.setAttribute('aria-label', `Antes y después: ${item.titulo || 'corte de pelo'}`);

      const afterImg = Object.assign(document.createElement('img'), {
        src: item.url_despues,
        alt: 'Después',
        className: 'ba-img ba-after',
        draggable: false,
        loading: 'lazy',
      });

      const beforeImg = Object.assign(document.createElement('img'), {
        src: item.url_antes,
        alt: 'Antes',
        className: 'ba-img ba-before',
        draggable: false,
        loading: 'lazy',
      });

      const handle = document.createElement('div');
      handle.className = 'ba-handle';

      const tagBefore = document.createElement('span');
      tagBefore.className = 'ba-tag ba-tag--before';
      tagBefore.textContent = 'Antes';

      const tagAfter = document.createElement('span');
      tagAfter.className = 'ba-tag ba-tag--after';
      tagAfter.textContent = 'Después';

      slider.appendChild(afterImg);
      slider.appendChild(beforeImg);
      slider.appendChild(handle);
      slider.appendChild(tagBefore);
      slider.appendChild(tagAfter);

      if (item.titulo) {
        const caption = document.createElement('p');
        caption.className = 'ba-caption';
        caption.textContent = item.titulo;
        slider.appendChild(caption);
      }

      wireBeforeAfterInteraction(slider);
      grid.appendChild(slider);
    });
  }

  /* ---------------- Init: configuración + galería + antes/después ---------------- */
  async function initContent() {
    setPageLoading(true);

    if (!client) {
      showConfigWarning();
      setPageLoading(false);
      return;
    }

    try {
      const [config, galeria, antesDespues] = await Promise.all([
        fetchConfiguracion(),
        fetchGaleria(),
        fetchAntesDespues(),
      ]);
      applyConfiguracion(config);
      renderAntesDespues(antesDespues);
      renderGaleria(galeria);
    } catch (err) {
      console.error(err);
      showConfigWarning();
    } finally {
      setPageLoading(false);
    }
  }

  initContent();

  /* ---------------- Booking: DOM refs ---------------- */
  const form = document.getElementById('bookingForm');
  const fechaInput = document.getElementById('fecha');
  const daySelector = document.getElementById('daySelector');
  const dayCards = daySelector ? Array.from(daySelector.querySelectorAll('.day-card')) : [];
  const slotsContainer = document.getElementById('slotsContainer');
  const nombreInput = document.getElementById('nombre');
  const apellidoInput = document.getElementById('apellido');
  const telefonoInput = document.getElementById('telefono');
  const submitBtn = document.getElementById('submitBtn');
  const formStatus = document.getElementById('formStatus');

  const errors = {
    fecha: document.getElementById('fechaError'),
    hora: document.getElementById('horaError'),
    nombre: document.getElementById('nombreError'),
    apellido: document.getElementById('apellidoError'),
    telefono: document.getElementById('telefonoError'),
  };

  let selectedTime = null;

  function clearError(field) {
    if (errors[field]) errors[field].textContent = '';
  }

  function setError(field, message, inputEl) {
    if (errors[field]) errors[field].textContent = message;
    if (inputEl) inputEl.classList.add('is-invalid');
  }

  /* ---------------- Render time slots ---------------- */
  async function renderSlots(dateISO) {
    selectedTime = null;

    const date = parseLocalDate(dateISO);
    const day = date.getDay();

    if (!ALLOWED_DAYS.includes(day)) {
      slotsContainer.innerHTML = '<p class="slots-placeholder">Solo atendemos de martes a viernes. Elegí otro día.</p>';
      return;
    }

    slotsContainer.innerHTML = '<p class="slots-placeholder">Cargando horarios…</p>';

    const horasOcupadas = new Set(await fetchHorasOcupadas(dateISO));

    const slots = buildTimeSlots();
    const isToday = dateISO === todayISO();
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();

    slotsContainer.innerHTML = '';

    slots.forEach((time) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'slot-btn';
      btn.textContent = time;

      const [h, m] = time.split(':').map(Number);
      const slotMinutes = h * 60 + m;
      const isPast = isToday && slotMinutes <= nowMinutes;
      const taken = horasOcupadas.has(time);

      if (taken || isPast) {
        btn.disabled = true;
      } else {
        btn.addEventListener('click', () => {
          slotsContainer.querySelectorAll('.slot-btn').forEach((b) => b.classList.remove('is-selected'));
          btn.classList.add('is-selected');
          selectedTime = time;
          clearError('hora');
        });
      }

      slotsContainer.appendChild(btn);
    });

    slotsContainer.classList.remove('slots-anim');
    void slotsContainer.offsetWidth;
    slotsContainer.classList.add('slots-anim');
  }

  dayCards.forEach((card) => {
    const dayNum = Number(card.dataset.day);
    const dateISO = nextDateForWeekday(dayNum);
    const dateLabel = card.querySelector('.day-date');
    if (dateLabel) dateLabel.textContent = formatShortDate(dateISO);

    card.addEventListener('click', () => {
      dayCards.forEach((c) => c.classList.remove('is-selected'));
      card.classList.add('is-selected');

      fechaInput.value = dateISO;
      daySelector.classList.remove('is-invalid');
      clearError('fecha');
      clearError('hora');

      renderSlots(dateISO);
    });
  });

  /* ---------------- Field validation ---------------- */
  const NAME_REGEX = /^[A-Za-zÀ-ÖØ-öø-ÿ\s]{2,40}$/;
  const PHONE_REGEX = /^[+]?[\d\s()-]{8,20}$/;

  [nombreInput, apellidoInput, telefonoInput].forEach((input) => {
    input.addEventListener('input', () => {
      input.classList.remove('is-invalid');
      clearError(input.id);
    });
  });

  function validateForm() {
    let valid = true;

    Object.values(errors).forEach((el) => (el.textContent = ''));
    [nombreInput, apellidoInput, telefonoInput].forEach((el) => el.classList.remove('is-invalid'));
    daySelector.classList.remove('is-invalid');

    if (!fechaInput.value) {
      setError('fecha', 'Elegí un día.', daySelector);
      valid = false;
    } else if (!ALLOWED_DAYS.includes(parseLocalDate(fechaInput.value).getDay())) {
      setError('fecha', 'Solo atendemos de martes a viernes.', daySelector);
      valid = false;
    }

    if (!selectedTime) {
      setError('hora', 'Elegí un horario disponible.');
      valid = false;
    }

    if (!NAME_REGEX.test(nombreInput.value.trim())) {
      setError('nombre', 'Ingresá un nombre válido.', nombreInput);
      valid = false;
    }

    if (!NAME_REGEX.test(apellidoInput.value.trim())) {
      setError('apellido', 'Ingresá un apellido válido.', apellidoInput);
      valid = false;
    }

    if (!PHONE_REGEX.test(telefonoInput.value.trim())) {
      setError('telefono', 'Ingresá un teléfono válido.', telefonoInput);
      valid = false;
    }

    return valid;
  }

  /* ---------------- Submit ---------------- */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    formStatus.className = 'form-status';
    formStatus.textContent = '';

    if (!client) {
      formStatus.className = 'form-status error';
      formStatus.textContent = 'La base de datos no está configurada todavía. Contactá al administrador.';
      return;
    }

    if (!validateForm()) {
      submitBtn.classList.add('shake');
      setTimeout(() => submitBtn.classList.remove('shake'), 420);
      return;
    }

    submitBtn.classList.add('is-loading');
    submitBtn.disabled = true;

    const horasOcupadas = await fetchHorasOcupadas(fechaInput.value);
    if (horasOcupadas.includes(selectedTime)) {
      submitBtn.classList.remove('is-loading');
      submitBtn.disabled = false;
      formStatus.className = 'form-status error';
      formStatus.textContent = 'Ese horario ya fue reservado. Elegí otro.';
      await renderSlots(fechaInput.value);
      return;
    }

    const { error } = await crearTurno({
      cliente_nombre: nombreInput.value.trim(),
      cliente_apellido: apellidoInput.value.trim(),
      cliente_telefono: telefonoInput.value.trim(),
      fecha: fechaInput.value,
      hora: selectedTime,
    });

    submitBtn.classList.remove('is-loading');
    submitBtn.disabled = false;

    if (error) {
      console.error(error);
      formStatus.className = 'form-status error';
      formStatus.textContent = 'No se pudo confirmar el turno. Probá de nuevo en unos segundos.';
      return;
    }

    formStatus.className = 'form-status success';
    formStatus.textContent = `¡Turno confirmado, ${nombreInput.value.trim()}! Te esperamos el ${fechaInput.value} a las ${selectedTime} hs.`;

    const bookedDate = fechaInput.value;
    form.reset();
    fechaInput.value = bookedDate;
    await renderSlots(bookedDate);
  });

  /* ---------------- Footer year ---------------- */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
