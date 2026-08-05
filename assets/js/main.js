document.addEventListener('DOMContentLoaded', () => {
  // Año dinámico en el footer
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Menú móvil
  const navToggle = document.getElementById('navToggle');
  const nav = document.getElementById('nav');
  if (navToggle && nav) {
    navToggle.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('open');
      navToggle.classList.toggle('open', isOpen);
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });
    nav.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        nav.classList.remove('open');
        navToggle.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Resaltar enlace activo según la sección visible
  const sections = document.querySelectorAll('main section[id]');
  const navLinks = document.querySelectorAll('.nav-link');
  const highlightNav = () => {
    let current = sections[0]?.id;
    const scrollPos = window.scrollY + 120;
    sections.forEach(section => {
      if (scrollPos >= section.offsetTop) current = section.id;
    });
    navLinks.forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === `#${current}`);
    });
  };
  window.addEventListener('scroll', highlightNav);
  highlightNav();

  // Botón volver arriba + header con sombra al hacer scroll
  const backToTop = document.getElementById('backToTop');
  const header = document.getElementById('header');
  window.addEventListener('scroll', () => {
    const scrolled = window.scrollY > 400;
    backToTop?.classList.toggle('show', scrolled);
    header?.classList.toggle('scrolled', window.scrollY > 10);
  });
  backToTop?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Animación de aparición/salida al hacer scroll
  const revealEls = [...document.querySelectorAll('.reveal')];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduceMotion || !('IntersectionObserver' in window)) {
    // Sin animación: se muestra todo tal cual
    revealEls.forEach(el => el.classList.add('in-view'));
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
  }

  // Lightbox para fotos de logros y galería
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxCaption = document.getElementById('lightboxCaption');
  const lightboxClose = document.getElementById('lightboxClose');
  let lastFocused = null;

  const openLightbox = (src, caption) => {
    lastFocused = document.activeElement;
    lightboxImg.src = src;
    lightboxImg.alt = caption || '';
    lightboxCaption.textContent = caption || '';
    lightboxCaption.style.display = caption ? 'block' : 'none';
    lightbox.classList.add('open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    lightboxClose.focus();
  };
  const closeLightbox = () => {
    lightbox.classList.remove('open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    lastFocused?.focus();
  };

  document.querySelectorAll('[data-lightbox]').forEach(el => {
    el.addEventListener('click', () => {
      const img = el.querySelector('img');
      if (!img) return;
      openLightbox(img.currentSrc || img.src, el.dataset.caption || '');
    });
  });
  lightboxClose?.addEventListener('click', closeLightbox);
  lightbox?.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightbox?.classList.contains('open')) closeLightbox();
  });
});
