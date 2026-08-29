(function () {
  'use strict';

  /* ---------------- Config ---------------- */
  const ALLOWED_DAYS = [2, 3, 4, 5]; // martes(2) a viernes(5)
  const OPEN_HOUR = 14;
  const CLOSE_HOUR = 20;
  const SLOT_MINUTES = 30;
  const STORAGE_KEY = 'ivanbeccaria_appointments';

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

  /* ---------------- Booking: helpers ---------------- */
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

  function getAppointments() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveAppointment(appt) {
    const appts = getAppointments();
    appts.push(appt);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appts));
  }

  function isSlotTaken(dateISO, time) {
    return getAppointments().some((a) => a.fecha === dateISO && a.hora === time);
  }

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
  function renderSlots(dateISO) {
    selectedTime = null;
    slotsContainer.innerHTML = '';

    if (!dateISO) {
      slotsContainer.innerHTML = '<p class="slots-placeholder">Elegí un día para ver los horarios disponibles.</p>';
      return;
    }

    const date = parseLocalDate(dateISO);
    const day = date.getDay();

    if (!ALLOWED_DAYS.includes(day)) {
      slotsContainer.innerHTML = '<p class="slots-placeholder">Solo atendemos de martes a viernes. Elegí otra fecha.</p>';
      return;
    }

    const slots = buildTimeSlots();
    const isToday = dateISO === todayISO();
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();

    slots.forEach((time) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'slot-btn';
      btn.textContent = time;

      const [h, m] = time.split(':').map(Number);
      const slotMinutes = h * 60 + m;
      const isPast = isToday && slotMinutes <= nowMinutes;
      const taken = isSlotTaken(dateISO, time);

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
      const field = input.id;
      clearError(field);
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
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    formStatus.className = 'form-status';
    formStatus.textContent = '';

    if (!validateForm()) {
      submitBtn.classList.add('shake');
      setTimeout(() => submitBtn.classList.remove('shake'), 420);
      return;
    }

    if (isSlotTaken(fechaInput.value, selectedTime)) {
      formStatus.className = 'form-status error';
      formStatus.textContent = 'Ese horario ya fue reservado. Elegí otro.';
      renderSlots(fechaInput.value);
      return;
    }

    submitBtn.classList.add('is-loading');
    submitBtn.disabled = true;

    setTimeout(() => {
      saveAppointment({
        fecha: fechaInput.value,
        hora: selectedTime,
        nombre: nombreInput.value.trim(),
        apellido: apellidoInput.value.trim(),
        telefono: telefonoInput.value.trim(),
        creado: new Date().toISOString(),
      });

      submitBtn.classList.remove('is-loading');
      submitBtn.disabled = false;

      formStatus.className = 'form-status success';
      formStatus.textContent = `¡Turno confirmado, ${nombreInput.value.trim()}! Te esperamos el ${fechaInput.value} a las ${selectedTime} hs.`;

      const bookedDate = fechaInput.value;
      form.reset();
      fechaInput.value = bookedDate;
      renderSlots(bookedDate);
    }, 600);
  });

  /* ---------------- Footer year ---------------- */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
