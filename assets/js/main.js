document.addEventListener('DOMContentLoaded', () => {
  // Año dinámico en el footer
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Menú móvil
  const navToggle = document.getElementById('navToggle');
  const nav = document.getElementById('nav');
  const header = document.getElementById('header');

  // El panel del menú ocupa exactamente lo que queda bajo el header
  const syncHeaderHeight = () => {
    if (header) document.documentElement.style.setProperty('--header-h', `${header.offsetHeight}px`);
  };
  syncHeaderHeight();
  window.addEventListener('resize', syncHeaderHeight, { passive: true });

  if (navToggle && nav) {
    const setMenu = (isOpen) => {
      nav.classList.toggle('open', isOpen);
      navToggle.classList.toggle('open', isOpen);
      navToggle.setAttribute('aria-expanded', String(isOpen));
      navToggle.setAttribute('aria-label', isOpen ? 'Cerrar menú' : 'Abrir menú');
      document.body.classList.toggle('nav-open', isOpen); // el fondo no se desplaza con el menú abierto
    };
    navToggle.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
    nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('open')) { setMenu(false); navToggle.focus(); }
    });
    // Si la ventana crece hasta la versión de escritorio, el menú no queda "abierto"
    window.matchMedia('(min-width: 1081px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });
  }

  // Resaltar enlace activo según la sección visible
  // (sólo cuentan las secciones que tienen enlace; las demás heredan el anterior)
  const navLinks = [...document.querySelectorAll('.nav-link')];
  const linked = navLinks
    .map(link => document.getElementById(link.getAttribute('href').slice(1)))
    .filter(Boolean);
  const highlightNav = () => {
    let current = linked[0]?.id;
    const scrollPos = window.scrollY + 140;
    linked.forEach(section => {
      if (scrollPos >= section.offsetTop) current = section.id;
    });
    navLinks.forEach(link => {
      const on = link.getAttribute('href') === `#${current}`;
      link.classList.toggle('active', on);
      if (on) link.setAttribute('aria-current', 'true'); else link.removeAttribute('aria-current');
    });
  };

  // Botón volver arriba + borde del header al hacer scroll
  const backToTop = document.getElementById('backToTop');
  const smallScreen = window.matchMedia('(max-width: 620px)');
  let ticking = false;
  let lastY = window.scrollY;
  let showTop = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      highlightNav();
      header?.classList.toggle('scrolled', y > 10);

      // En pantallas pequeñas el botón flotante tapa texto: sólo aparece cuando el
      // desplazamiento va hacia arriba (la intención de volver). En escritorio cabe en el margen.
      const moved = y - lastY;               // se acumula hasta superar el umbral (sin parpadeos)
      if (y <= 400) showTop = false;
      else if (!smallScreen.matches) showTop = true;
      else if (Math.abs(moved) > 6) showTop = moved < 0;
      if (Math.abs(moved) > 6) lastY = y;
      backToTop?.classList.toggle('show', showTop);

      ticking = false;
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  backToTop?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Animación de aparición/salida al hacer scroll
  const revealEls = [...document.querySelectorAll('.reveal')];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const hub = document.querySelector('.hub-section');

  if (reduceMotion || !('IntersectionObserver' in window)) {
    // Sin animación: se muestra todo tal cual, con el engranaje ya en su sitio
    revealEls.forEach(el => el.classList.add('in-view'));
    hub?.classList.add('is-visible');
  } else {
    // Stagger: los elementos hermanos entran escalonados (80 ms entre cada uno)
    const STAGGER = 80;
    const MAX_STAGGER = 400;
    const groups = new Map();
    revealEls.forEach(el => {
      const parent = el.parentElement;
      const index = groups.get(parent) || 0;
      groups.set(parent, index + 1);
      el.dataset.revealDelay = Math.min(index * STAGGER, MAX_STAGGER);
    });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const el = entry.target;
        if (entry.isIntersecting) {
          // Al entrar respeta su turno dentro del grupo
          el.style.setProperty('--reveal-delay', `${el.dataset.revealDelay}ms`);
          el.classList.remove('is-above');
          el.classList.add('in-view');
        } else {
          // Al salir se va de inmediato, sin esperar el turno
          el.style.setProperty('--reveal-delay', '0ms');
          el.classList.remove('in-view');
          el.classList.toggle('is-above', entry.boundingClientRect.top < 0);
        }
      });
    }, {
      threshold: 0,
      rootMargin: '0px 0px -100px 0px'
    });
    revealEls.forEach(el => observer.observe(el));

    // El engranaje del HIS "engrana" cuando su sección entra en pantalla
    if (hub) {
      new IntersectionObserver((entries) => {
        entries.forEach(e => hub.classList.toggle('is-visible', e.isIntersecting));
      }, { threshold: 0.25 }).observe(hub);
    }
  }

  // ===================== DIBUJOS VIVOS =====================
  // La red del inicio, el banner de Viva la II y el engranaje del HIS son dibujos (SVG), no
  // imágenes, y se mueven mientras están a la vista. index.html los trae completos y quietos:
  // sin JavaScript, o con movimiento reducido, se ven igual, sólo que sin moverse.
  const canAnimate = !reduceMotion && 'IntersectionObserver' in window;
  const rnd = (v) => Math.round(v * 10) / 10;
  const clamp01 = (v) => Math.min(Math.max(v, 0), 1);
  const easeOut = (p) => 1 - Math.pow(1 - clamp01(p), 3);
  const easeInOut = (p) => { p = clamp01(p); return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(2 - 2 * p, 3) / 2; };
  const numbers = (s) => s.split(',').map(Number);
  const pairs = (s) => s.trim().split(/\s+/).map(numbers);

  // Deriva lenta: dos vaivenes por eje; cada punto lleva su propia fase y su propio pulso
  const sway = (seed, t, amp) => {
    const tt = t * (0.85 + 0.3 * Math.abs((seed * 0.618) % 1));
    return [
      amp * (Math.sin(tt * 0.66 + seed * 1.7) + 0.6 * Math.sin(tt * 1.17 + seed * 2.9)) / 1.6,
      amp * (Math.cos(tt * 0.58 + seed * 2.3) + 0.6 * Math.sin(tt * 1.01 + seed * 0.9)) / 1.6,
    ];
  };

  // Curva suave que pasa por los puntos dados (Catmull-Rom llevado a Bézier)
  const spline = (p, lead = 'M') => {
    let d = lead + rnd(p[0][0]) + ' ' + rnd(p[0][1]);
    for (let i = 0; i < p.length - 1; i++) {
      const a = p[i - 1] || p[i], b = p[i], c = p[i + 1], e = p[i + 2] || c;
      d += 'C' + rnd(b[0] + (c[0] - a[0]) / 6) + ' ' + rnd(b[1] + (c[1] - a[1]) / 6) + ' '
        + rnd(c[0] - (e[0] - b[0]) / 6) + ' ' + rnd(c[1] - (e[1] - b[1]) / 6) + ' '
        + rnd(c[0]) + ' ' + rnd(c[1]);
    }
    return d;
  };

  // Un dibujo sólo gasta cuadros mientras está en pantalla; al salir, su reloj se detiene
  const whileVisible = (el, frame) => {
    let raf = 0, last = 0, time = 0;
    const tick = (now) => {
      time += Math.min((now - last) / 1000, 0.05);   // si la pestaña estuvo oculta, el tiempo no salta
      last = now;
      frame(time);
      raf = requestAnimationFrame(tick);
    };
    new IntersectionObserver(([entry]) => {
      cancelAnimationFrame(raf);
      el.classList.toggle('is-resting', !entry.isIntersecting);
      if (entry.isIntersecting && frame) { last = performance.now(); raf = requestAnimationFrame(tick); }
    }, { threshold: 0.05 }).observe(el);
  };

  // ---------- Ruteo del inicio ----------
  // Momento focal: un problema de ruteo resuelto. Cada ruta sale del depósito, visita sus
  // paradas y vuelve. Se traza una vez, a velocidad constante, y cada parada aparece cuando
  // la ruta llega a ella; después la red queda viva: sus paradas derivan despacio.
  const routes = document.querySelector('.hero-routes');
  if (routes) {
    const edges = [...routes.querySelectorAll('.hero-routes__edges path')].map((path) => {
      const n = path.getAttribute('d').match(/-?[\d.]+/g).map(Number);
      return { path, home: n.filter((_, i) => i % 2 === 0).map((x, i) => [x, n[i * 2 + 1]]) };
    });
    const stops = [...routes.querySelectorAll('circle')].map(c => ({
      c, x: Number(c.getAttribute('cx')), y: Number(c.getAttribute('cy')),
      amp: c.classList.contains('hero-routes__depot') ? 2 : 5.5,   // el depósito apenas se mece
    }));
    const byPlace = new Map(stops.map(s => [s.x + ',' + s.y, s]));
    const span = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);

    // Tiempos del trazo: las rutas salen escalonadas y recorren el dibujo a la misma velocidad
    const SPEED = 480;   // unidades del dibujo por segundo
    edges.forEach((e, k) => {
      const start = 0.3 + k * 0.15;
      const lap = e.home.concat([e.home[0]]);   // vuelve al depósito
      let total = 0, run = 0;
      for (let i = 1; i < lap.length; i++) total += span(lap[i - 1], lap[i]);
      e.path.style.setProperty('--route-delay', `${start}s`);
      e.path.style.setProperty('--route-time', `${(total / SPEED).toFixed(2)}s`);
      for (let i = 1; i < e.home.length; i++) {
        run += span(e.home[i - 1], e.home[i]);
        byPlace.get(e.home[i].join(','))?.c.style.setProperty('--stop-delay', `${(start + run / SPEED).toFixed(2)}s`);
      }
    });

    // Se resuelve cuando el dibujo está a la vista (en móvil queda debajo del texto)
    if ('IntersectionObserver' in window) {
      const seenRoutes = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) { routes.classList.add('is-solved'); seenRoutes.disconnect(); }
      }, { threshold: 0.35 });
      seenRoutes.observe(routes);
    } else {
      routes.classList.add('is-solved');
    }

    if (canAnimate) {
      // Un mismo punto se mueve igual sea vértice de una ruta o parada
      const place = (x, y, t, k) => {
        const s = sway(x * 0.37 + y * 0.11, t, k * (byPlace.get(x + ',' + y)?.amp ?? 5.5));
        return [rnd(x + s[0]), rnd(y + s[1])];
      };
      whileVisible(routes, (t) => {
        const k = easeInOut((t - 2.6) / 2.5);   // primero termina de trazarse
        if (!k) return;
        edges.forEach(e => e.path.setAttribute('d', 'M' + e.home.map(p => place(p[0], p[1], t, k).join(' ')).join('L') + 'Z'));
        stops.forEach((s) => {
          const p = place(s.x, s.y, t, k);
          s.c.setAttribute('cx', p[0]);
          s.c.setAttribute('cy', p[1]);
        });
      });
    }
  }

  // ---------- Banner de Viva la II ----------
  // Los puntos de control vienen en index.html (atributos data-*); aquí se recalculan los trazos.
  const viva = document.querySelector('.viva-art');
  if (viva) {
    // Cintas de malla: hilos tendidos entre dos bordes que ondean
    const ribbons = [...viva.querySelectorAll('.viva-art__ribbon')].map((g, i) => ({
      a: pairs(g.dataset.a), b: pairs(g.dataset.b), n: Number(g.dataset.n), core: Number(g.dataset.core),
      veil: g.children[0], mesh: g.children[1], line: g.children[2], seed: i * 40,
    }));
    const drawRibbon = (r, t, k) => {
      const edge = (pts, off) => pts.map((p, i) => {
        const s = sway(r.seed + off + i, t, k * 6.5);
        return [p[0] + s[0], p[1] + s[1]];
      });
      const a = edge(r.a, 0), b = edge(r.b, 20);
      const thread = (u) => a.map((p, i) => [p[0] + (b[i][0] - p[0]) * u, p[1] + (b[i][1] - p[1]) * u]);
      let mesh = '';
      for (let j = 0; j < r.n; j++) mesh += spline(thread(j / (r.n - 1)));
      r.mesh.setAttribute('d', mesh);
      r.veil.setAttribute('d', spline(a) + spline(b.slice().reverse(), 'L') + 'Z');
      if (r.line) r.line.setAttribute('d', spline(thread(r.core)));
    };

    // Redes: los nodos derivan y los hilos los siguen
    const nets = [...viva.querySelectorAll('.viva-art__net')].map((g, i) => {
      const dots = [...g.querySelectorAll('circle')];
      return {
        dots, links: pairs(g.dataset.links), path: g.querySelector('path'), seed: 300 + i * 30,
        home: dots.map(c => [Number(c.getAttribute('cx')), Number(c.getAttribute('cy'))]),
      };
    });
    const drawNet = (net, t, k) => {
      const at = net.home.map((p, i) => {
        const s = sway(net.seed + i, t, k * 5);
        return [rnd(p[0] + s[0]), rnd(p[1] + s[1])];
      });
      net.dots.forEach((c, i) => { c.setAttribute('cx', at[i][0]); c.setAttribute('cy', at[i][1]); });
      net.path.setAttribute('d', net.links.map(([i, j]) => 'M' + at[i].join(' ') + 'L' + at[j].join(' ')).join(''));
    };

    // Motas sueltas entre las redes
    const dust = [...viva.querySelectorAll('.viva-art__dust circle')].map((c, i) => ({
      c, x: Number(c.getAttribute('cx')), y: Number(c.getAttribute('cy')), seed: 600 + i * 3,
    }));
    const drawBackdrop = (t, k) => {
      nets.forEach(net => drawNet(net, t, k));
      dust.forEach((m) => {
        const s = sway(m.seed, t * 0.8, k * 8);
        m.c.setAttribute('cx', rnd(m.x + s[0]));
        m.c.setAttribute('cy', rnd(m.y + s[1]));
      });
    };

    // Curva central y paletas
    const curve = viva.querySelector('.viva-art__curve');
    const glint = viva.querySelector('.viva-art__glint');
    const X = numbers(curve.dataset.x), TOP = numbers(curve.dataset.top), BOT = numbers(curve.dataset.bot);
    const X0 = X[0], X1 = X[X.length - 1];
    const NOSE = [16, 11, 7, 3.5, 1.2, 0];   // muestras extra cerca del frente mientras la curva se traza
    const pops =[...viva.querySelectorAll('.viva-art__pop')].map((g) => {
      const stem = g.querySelector('line');
      return {
        stem, x: Number(stem.getAttribute('x1')),
        y1: Number(stem.getAttribute('y1')), y2: Number(stem.getAttribute('y2')),
        from: g.dataset.from, to: g.dataset.to, anchor: Number(g.dataset.anchor),
        dots: [...g.querySelectorAll('circle')].map(c => ({ c, y: Number(c.getAttribute('cy')), r: Number(c.getAttribute('r')) })),
      };
    });
    const ring = viva.querySelector('.viva-art__ring');
    const ringHome = ring.getAttribute('transform');
    const ping = viva.querySelector('.viva-art__ping');
    let ringAt;   // instante de la entrada en que el trazo alcanza el nodo final

    // Onda que recorre la curva sin mover ni su punta ni el nodo donde termina
    const wave = (x, t, k) => {
      const s = (x - X0) / (X1 - X0);
      return s <= 0 || s >= 1 ? 0 : k * 3.4 * Math.pow(Math.sin(Math.PI * s), 0.8) * Math.sin(s * 7.2 - t * 1.15);
    };

    // e: segundos desde que empezó la entrada (Infinity = el dibujo ya está completo)
    const drawChart = (t, k, e) => {
      const drawn = e === Infinity;
      const reach = drawn ? X1 : X0 + (X1 - X0) * easeInOut(e / 1.1);

      // La curva se traza de izquierda a derecha y su frente acaba redondeado, como un trazo de pluma
      const xs = drawn ? X : X.filter(x => x < reach - NOSE[0]).concat(NOSE.map(n => reach - n).filter(x => x > X0));
      const top = [], bot = [];
      xs.forEach((x) => {
        let i = 1;
        while (i < X.length - 1 && X[i] < x) i++;
        const f = (x - X[i - 1]) / (X[i] - X[i - 1]);
        const yt = TOP[i - 1] + (TOP[i] - TOP[i - 1]) * f, yb = BOT[i - 1] + (BOT[i] - BOT[i - 1]) * f;
        const half = (yb - yt) / 2 * (drawn ? 1 : Math.sqrt(clamp01((reach - x) / NOSE[0])));
        const mid = (yt + yb) / 2 + wave(x, t, k);
        top.push([x, mid - half]);
        bot.push([x, mid + half]);
      });
      curve.setAttribute('d', top.length > 1 ? spline(top) + spline(bot.slice().reverse(), 'L') + 'Z' : '');
      const strip = (side, from, to, dy) => {
        const p = side.filter(q => q[0] >= from && q[0] <= to).map(q => [q[0], q[1] + dy]);
        return p.length > 1 ? spline(p) : '';
      };
      glint.setAttribute('d', strip(bot, 336, 380, -1.5) + strip(top, 406, 470, 1.5));

      // Cada paleta sube cuando el trazo pasa por ella y después flota con la onda
      pops.forEach((p) => {
        let grow = 1;
        if (!drawn) {
          if (p.at === undefined && reach >= p.x - 4) p.at = e;
          grow = p.at === undefined ? 0 : easeOut((e - p.at) / 0.5);
        }
        const dy = wave(p.x, t, k);
        const ys = p.dots.map(d => p.anchor + (d.y - p.anchor) * grow + dy);
        p.dots.forEach((d, i) => {
          d.c.setAttribute('cy', rnd(ys[i]));
          d.c.setAttribute('r', rnd(d.r * Math.min(1, grow * 1.5)));
        });
        p.stem.setAttribute('y1', rnd(p.from ? ys[p.from] : p.y1));
        p.stem.setAttribute('y2', rnd(p.to ? ys[p.to] : p.y2));
      });

      // El nodo final aparece al llegar el trazo, con un único destello
      if (!drawn) {
        if (ringAt === undefined && reach >= X1 - 3) ringAt = e;
        const since = ringAt === undefined ? -1 : e - ringAt;
        ring.setAttribute('transform', `${ringHome} scale(${rnd(0.4 + 0.6 * easeOut(since / 0.45))})`);
        ring.setAttribute('opacity', rnd(easeOut(since / 0.3)));
        const p = (since - 0.1) / 0.9;
        ping.setAttribute('r', rnd(17 + 20 * easeOut(p)));
        ping.setAttribute('opacity', p > 0 && p < 1 ? rnd(0.5 * (1 - p)) : 0);
      }
    };

    // Reposo: el mismo dibujo que trae index.html
    ribbons.forEach(r => drawRibbon(r, 0, 0));
    drawBackdrop(0, 0);
    drawChart(0, 0, Infinity);

    if (canAnimate) {
      // La curva se traza al llegar a ella; si ya estaba en pantalla al cargar, no se esconde
      const box = viva.getBoundingClientRect();
      let pending = box.top >= window.innerHeight || box.bottom <= 0;
      let ready = false, introAt = -1, waveFrom = 0, frames = 0;
      if (pending) {
        drawChart(0, 0, 0);
        const seen = new IntersectionObserver(([entry]) => {
          if (entry.isIntersecting) { ready = true; seen.disconnect(); }
        }, { threshold: 0.5 });
        seen.observe(viva);
      }

      whileVisible(viva, (t) => {
        const k = easeInOut(t / 2.5);   // el fondo se pone en movimiento de a poco
        if (frames++ % 2 === 0) ribbons.forEach(r => drawRibbon(r, t, k));   // la malla va a media cadencia
        drawBackdrop(t, k);

        if (pending) {
          if (!ready) return;
          if (introAt < 0) introAt = t;
          const e = t - introAt;
          if (e < 2.2) { drawChart(t, 0, e); return; }
          pending = false;
          waveFrom = t;
          ring.setAttribute('transform', ringHome);
          ring.removeAttribute('opacity');
          ping.setAttribute('opacity', 0);
        }
        drawChart(t, easeInOut((t - waveFrom) / 2), Infinity);
      });
    }
  }

  // ---------- Engranaje del HIS ----------
  // Gira por CSS; aquí sólo se le pide descansar cuando no está a la vista
  const his = document.querySelector('.his-art');
  if (his && canAnimate) whileVisible(his, null);

  // Eventos próximos: cuenta regresiva que entiende eventos de varios días
  const DAY = 86400000;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const parseDay = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  let upcoming = 0;

  document.querySelectorAll('[data-countdown]').forEach(el => {
    const start = parseDay(el.dataset.countdown);
    const end = el.dataset.countdownEnd ? parseDay(el.dataset.countdownEnd) : start;
    const toStart = Math.round((start - today) / DAY);
    const toEnd = Math.round((end - today) / DAY);

    if (toEnd < 0) { el.remove(); return; }   // ya pasó: la fecha sigue visible arriba
    upcoming++;
    if (toStart > 1)        el.textContent = `Faltan ${toStart} días`;
    else if (toStart === 1) el.textContent = 'Es mañana';
    else if (toStart === 0) el.textContent = end > start ? 'Empieza hoy' : 'Es hoy';
    else                    el.textContent = toEnd === 0 ? 'Último día' : 'En curso';
  });

  // Cuando ya no queda nada por venir, la página deja de anunciarlo como futuro
  if (!upcoming) {
    document.querySelector('.hero-flag')?.remove();
    const eventsTitle = document.querySelector('#eventos .section-title');
    if (eventsTitle) eventsTitle.textContent = 'Eventos recientes';
  }

  // Visor de fotos: la foto crece desde su miniatura y vuelve a ella al cerrar
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxCaption = document.getElementById('lightboxCaption');
  const lightboxClose = document.getElementById('lightboxClose');

  if (lightbox && lightboxImg && lightboxClose) {
    const behind = [header, document.querySelector('main'), document.querySelector('.site-footer'), backToTop].filter(Boolean);
    const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
    const canFly = !reduceMotion && typeof lightboxImg.animate === 'function';
    let sourceEl = null;   // miniatura de origen
    let flight = null;     // vuelo en curso (se puede interrumpir en cualquier momento)

    // Transformación que lleva la foto ampliada al sitio de su miniatura
    const toThumb = () => {
      if (!sourceEl || !sourceEl.isConnected) return null;
      const from = sourceEl.getBoundingClientRect();
      const to = lightboxImg.getBoundingClientRect();
      if (!from.width || !to.width) return null;
      const dx = (from.left + from.width / 2) - (to.left + to.width / 2);
      const dy = (from.top + from.height / 2) - (to.top + to.height / 2);
      const scale = Math.max(from.width / to.width, from.height / to.height);
      return `translate(${dx}px, ${dy}px) scale(${scale})`;
    };

    const openLightbox = async (el) => {
      const img = el.querySelector('img');
      if (!img) return;
      const caption = el.dataset.caption || '';

      flight?.cancel();
      sourceEl = el;
      lightboxImg.style.visibility = canFly ? 'hidden' : '';   // sin destello antes de despegar
      lightboxImg.src = img.currentSrc || img.src;
      lightboxImg.alt = caption || img.alt || '';
      lightboxCaption.textContent = caption;
      lightboxCaption.style.display = caption ? 'block' : 'none';
      lightbox.classList.remove('closing');
      lightbox.classList.add('open');
      lightbox.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      behind.forEach(n => { n.inert = true; });   // el foco y los lectores se quedan en el visor
      lightboxClose.focus({ preventScroll: true });

      if (!canFly) return;
      try { await lightboxImg.decode(); } catch (_) { /* si no decodifica, entra sin vuelo */ }
      if (sourceEl !== el || !lightbox.classList.contains('open')) return;
      const start = toThumb();
      lightboxImg.style.visibility = '';
      if (!start) return;
      flight = lightboxImg.animate(
        [{ transform: start, opacity: 0.35 }, { transform: 'none', opacity: 1 }],
        { duration: 460, easing: EASE }
      );
    };

    const closeLightbox = () => {
      if (!lightbox.classList.contains('open') || lightbox.classList.contains('closing')) return;

      // La página vuelve a responder de inmediato; el regreso de la foto es sólo visual
      lightbox.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      behind.forEach(n => { n.inert = false; });
      const origin = sourceEl;
      origin?.focus({ preventScroll: true });

      const settle = () => {
        flight = null;
        lightbox.classList.remove('open', 'closing');
        lightboxImg.style.visibility = '';
      };

      // Parte del valor que está en pantalla ahora mismo (por si se cierra a mitad del vuelo)
      const current = getComputedStyle(lightboxImg).transform;
      flight?.cancel();
      const end = canFly ? toThumb() : null;
      if (!end) return settle();

      lightbox.classList.add('closing');   // el fondo se desvanece mientras la foto regresa
      const back = lightboxImg.animate(
        [{ transform: current, opacity: 1 }, { transform: end, opacity: 0.25 }],
        { duration: 280, easing: EASE, fill: 'forwards' }
      );
      flight = back;
      back.onfinish = () => { back.cancel(); if (flight === back) settle(); };
    };

    document.querySelectorAll('[data-lightbox]').forEach(el => {
      el.addEventListener('click', () => openLightbox(el));
    });
    lightboxClose.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox || e.target === lightboxCaption) closeLightbox();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && lightbox.classList.contains('open')) closeLightbox();
    });
  }
});
