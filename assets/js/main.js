/* =========================================================
   SomaSpace — скрипты лендинга (без зависимостей)
   ========================================================= */

/* ---------- Настройки ---------- */

const CONFIG = {
  // Куда отправлять заявки из формы «связаться».
  // Сервер получит POST с JSON: { name, inn, phone, email, page }.
  // Пока адрес не указан, форма покажет ошибку и выведет данные в консоль.
  formEndpoint: '',

  // Ключ, под которым в localStorage хранится выбор по cookie
  consentKey: 'somaspace-cookie-consent',
};

document.documentElement.classList.remove('no-js');

const desktop = window.matchMedia('(min-width: 1024px)');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/* ---------- Фиксированная шапка + подсветка пункта меню ---------- */

function initTopbar() {
  const topbar = document.querySelector('[data-topbar]');
  const hero = document.querySelector('.hero');
  if (!topbar || !hero) return;

  const update = () => {
    topbar.classList.toggle('is-visible', window.scrollY > hero.offsetHeight);
  };
  update();
  window.addEventListener('scroll', update, { passive: true });

  const links = [...topbar.querySelectorAll('[data-nav]')];
  const sections = links
    .map((link) => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      links.forEach((link) => {
        link.classList.toggle('is-active', link.getAttribute('href') === '#' + entry.target.id);
      });
    });
  }, { rootMargin: '-45% 0px -45% 0px' });

  sections.forEach((section) => observer.observe(section));
}

/* ---------- Появление элементов при прокрутке ---------- */

function initReveal() {
  const items = document.querySelectorAll('[data-reveal]');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -10% 0px' });

  items.forEach((item) => observer.observe(item));
}

/* ---------- Эффекты, привязанные к прокрутке ----------
   data-parallax="k"      — сдвиг относительно центра экрана (k — скорость)
   data-parallax-from="0" — …или относительно указанной позиции прокрутки
   data-parallax-mobile   — включить параллакс и на мобильных (по умолчанию только десктоп)
   data-drift="k"         — сдвиг на k × scrollY (только десктоп)
   data-drift-max="px"    — …пока прокрутка не превысит это значение
   data-pin="px"          — элемент «прилипает» на указанное расстояние (только десктоп)
   data-pin-offset="px"   — …начиная с этого отступа от верха экрана
   data-grow              — линия вырастает сверху вниз по мере появления
*/

function pageTop(el) {
  let top = 0;
  for (let node = el; node; node = node.offsetParent) top += node.offsetTop;
  return top;
}

function initScrollEffects() {
  const parallax = [...document.querySelectorAll('[data-parallax]')];
  const drift = [...document.querySelectorAll('[data-drift]')];
  const pins = [...document.querySelectorAll('[data-pin]')];
  const grows = [...document.querySelectorAll('[data-grow]')];

  let metrics = [];
  const measure = () => {
    const vh = window.innerHeight;
    metrics = parallax.map((el) => (el.dataset.parallaxFrom !== undefined
      ? parseFloat(el.dataset.parallaxFrom)
      : pageTop(el) + el.offsetHeight / 2 - vh / 2));
    pins.forEach((el) => { el._top = pageTop(el); });
    grows.forEach((el) => { el._top = pageTop(el); });
  };

  const render = () => {
    const y = window.scrollY;
    const vh = window.innerHeight;
    const isDesktop = desktop.matches;

    parallax.forEach((el, i) => {
      if (!isDesktop && !('parallaxMobile' in el.dataset)) { el.style.translate = ''; return; }
      const offset = (y - metrics[i]) * parseFloat(el.dataset.parallax);
      el.style.translate = `0 ${offset.toFixed(1)}px`;
    });

    drift.forEach((el) => {
      if (!isDesktop) { el.style.translate = ''; return; }
      const max = parseFloat(el.dataset.driftMax) || Infinity;
      el.style.translate = `0 ${(Math.min(y, max) * parseFloat(el.dataset.drift)).toFixed(1)}px`;
    });

    pins.forEach((el) => {
      if (!isDesktop) { el.style.translate = ''; return; }
      const start = el._top - parseFloat(el.dataset.pinOffset || 0);
      const shift = Math.min(Math.max(y - start, 0), parseFloat(el.dataset.pin));
      el.style.translate = `0 ${shift}px`;
    });

    grows.forEach((el) => {
      const progress = (y + vh - el._top) / (vh * 0.6);
      el.style.transform = `scaleY(${Math.min(Math.max(progress, 0), 1)})`;
    });
  };

  const reset = () => {
    [...parallax, ...drift, ...pins].forEach((el) => { el.style.translate = ''; });
    grows.forEach((el) => { el.style.transform = ''; });
  };

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; render(); });
  };

  const setup = () => {
    window.removeEventListener('scroll', onScroll);
    reset();
    if (reducedMotion.matches) return;
    measure();
    render();
    window.addEventListener('scroll', onScroll, { passive: true });
  };

  setup();
  window.addEventListener('load', setup);
  window.addEventListener('resize', () => { measure(); render(); });
  desktop.addEventListener('change', setup);
  reducedMotion.addEventListener('change', setup);
}

/* ---------- Попап «связаться» ---------- */

function initModal() {
  const modal = document.getElementById('contact-modal');
  if (!modal) return;

  const open = () => { if (!modal.open) modal.showModal(); };
  const close = () => modal.close();

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href="#contact"]');
    if (!link) return;
    event.preventDefault();
    open();
  });

  modal.querySelector('[data-close]').addEventListener('click', close);

  // клик по затемнённому фону закрывает попап
  modal.addEventListener('click', (event) => {
    if (event.target === modal) close();
  });

  if (window.location.hash === '#contact') open();
}

/* ---------- Форма ---------- */

function formatPhone(digits) {
  const d = digits.slice(0, 10);
  let out = '';
  if (d.length > 0) out += '(' + d.slice(0, 3);
  if (d.length >= 3) out += ') ';
  if (d.length > 3) out += d.slice(3, 6);
  if (d.length > 6) out += '-' + d.slice(6, 8);
  if (d.length > 8) out += '-' + d.slice(8, 10);
  return out;
}

function initForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  const status = form.querySelector('.form__status');
  const submit = form.querySelector('[type="submit"]');
  const phone = form.querySelector('[data-phone-mask]');

  phone.addEventListener('input', () => {
    let digits = phone.value.replace(/\D/g, '');
    if (digits.length > 10 && /^[78]/.test(digits)) digits = digits.slice(1);
    phone.value = formatPhone(digits);
  });

  const rules = {
    name: (v) => v.trim().length >= 2,
    phone: (v) => v === '' || v.replace(/\D/g, '').length === 10,
    email: (v) => v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  };

  const setError = (input, message) => {
    const field = input.closest('.field');
    field.classList.toggle('is-invalid', Boolean(message));
    field.querySelector('.field__error').textContent = message || '';
  };

  const validate = () => {
    let valid = true;
    Object.entries(rules).forEach(([name, check]) => {
      const input = form.elements[name];
      const ok = check(input.value);
      const field = input.closest('.field');
      const message = input.value.trim() === '' && input.required
        ? 'Обязательное поле'
        : field.querySelector('.field__error').dataset.error;
      setError(input, ok ? '' : message);
      if (!ok) valid = false;
    });
    return valid;
  };

  form.addEventListener('input', (event) => {
    if (event.target.closest('.field.is-invalid')) setError(event.target, '');
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    status.textContent = '';
    status.classList.remove('is-error');
    if (!validate()) return;

    // спам-бот заполнил скрытое поле — тихо выходим
    if (form.elements.website.value) return;

    const data = {
      name: form.elements.name.value.trim(),
      inn: form.elements.inn.value.trim(),
      phone: form.elements.phone.value ? '+7 ' + form.elements.phone.value : '',
      email: form.elements.email.value.trim(),
      page: window.location.href,
    };

    submit.disabled = true;
    try {
      if (!CONFIG.formEndpoint) {
        console.warn('Форма не подключена: укажите CONFIG.formEndpoint в assets/js/main.js', data);
        throw new Error('no endpoint');
      }
      const response = await fetch(CONFIG.formEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error(String(response.status));
      form.reset();
      status.textContent = 'Спасибо! Данные успешно отправлены';
    } catch (error) {
      status.textContent = 'Не удалось отправить заявку. Напишите нам на contact@somaspace.ru';
      status.classList.add('is-error');
    } finally {
      submit.disabled = false;
    }
  });
}

/* ---------- Cookie-баннер ----------
   Выбор пользователя доступен другим скриптам:
     window.somaConsent.get()  → { analytics: bool, marketing: bool } или null
     document.addEventListener('cookie-consent', (e) => e.detail)
   Подключать счётчики (Метрику и т.п.) стоит только после согласия.
*/

function initCookieBanner() {
  const banner = document.getElementById('cookie-banner');
  if (!banner) return;

  const main = banner.querySelector('.cookie__main');
  const settings = banner.querySelector('.cookie__settings');

  const read = () => {
    try { return JSON.parse(localStorage.getItem(CONFIG.consentKey)); } catch { return null; }
  };

  const save = (consent) => {
    try { localStorage.setItem(CONFIG.consentKey, JSON.stringify(consent)); } catch { /* приватный режим */ }
    banner.hidden = true;
    document.dispatchEvent(new CustomEvent('cookie-consent', { detail: consent }));
  };

  window.somaConsent = { get: read };

  if (read()) return;
  banner.hidden = false;

  banner.addEventListener('click', (event) => {
    const action = event.target.closest('[data-cookie]')?.dataset.cookie;
    if (action === 'accept') save({ analytics: true, marketing: true });
    if (action === 'reject') save({ analytics: false, marketing: false });
    if (action === 'settings' || action === 'back') {
      main.hidden = action === 'settings';
      settings.hidden = action === 'back';
    }
  });

  settings.addEventListener('submit', (event) => {
    event.preventDefault();
    save({ analytics: settings.elements.analytics.checked, marketing: settings.elements.marketing.checked });
  });
}

/* ---------- Старт ---------- */

initTopbar();
initReveal();
initScrollEffects();
initModal();
initForm();
initCookieBanner();
