// ==========================================================================
// Technogrova — site script
// ==========================================================================

// Footer year
document.getElementById('year').textContent = new Date().getFullYear();

// Mobile nav toggle
const navToggle = document.getElementById('navToggle');
const mainNav = document.getElementById('main-nav');

navToggle.addEventListener('click', () => {
  const isOpen = mainNav.classList.toggle('is-open');
  navToggle.setAttribute('aria-expanded', String(isOpen));
});

mainNav.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    mainNav.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
  });
});

// Scroll reveal
const revealEls = document.querySelectorAll('[data-reveal]');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (prefersReducedMotion) {
  revealEls.forEach(el => el.classList.add('is-visible'));
} else if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  revealEls.forEach(el => observer.observe(el));
} else {
  revealEls.forEach(el => el.classList.add('is-visible'));
}

// ==========================================================================
// Contact form — submits to Formspree (or any compatible endpoint)
//
// SETUP: 1) Go to https://formspree.io and create a free account.
//        2) Create a new form, point it at technogrova77@gmail.com.
//        3) Copy the endpoint URL it gives you (looks like
//           https://formspree.io/f/xxxxxxx) and paste it below,
//           replacing YOUR_FORM_ID.
//        4) Every submission will land in that inbox — readable from
//           Gmail on mobile or desktop, no extra app needed.
// ==========================================================================
const FORM_ENDPOINT = 'https://formspree.io/f/xvzjdvoj';

const contactForm = document.getElementById('contactForm');
const formStatus = document.getElementById('formStatus');
const submitBtn = document.getElementById('submitBtn');

contactForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending…';
  formStatus.textContent = '';
  formStatus.className = 'form-status';

  try {
    const response = await fetch(FORM_ENDPOINT, {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      body: new FormData(contactForm)
    });

    if (response.ok) {
      formStatus.textContent = 'Thanks — your request has been sent. We\u2019ll be in touch soon.';
      formStatus.className = 'form-status success';
      contactForm.reset();
    } else {
      formStatus.textContent = 'Something went wrong sending your request. Please try emailing us directly.';
      formStatus.className = 'form-status error';
    }
  } catch (err) {
    formStatus.textContent = 'Network error — please try again or email us directly.';
    formStatus.className = 'form-status error';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Send request';
  }
});

// ==========================================================================
// Subtle 3D tilt on cards (desktop pointer only)
// ==========================================================================
if (!prefersReducedMotion && window.matchMedia('(pointer: fine)').matches) {
  document.querySelectorAll('.service-card, .work-card, .why-item').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `perspective(700px) rotateX(${(-y * 6).toFixed(2)}deg) rotateY(${(x * 6).toFixed(2)}deg) translateY(-4px)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}

// ==========================================================================
// Highlight active nav link based on scroll position
// ==========================================================================
const sections = document.querySelectorAll('main section[id], .hero');
const navLinks = document.querySelectorAll('.main-nav a');

if ('IntersectionObserver' in window && sections.length && navLinks.length) {
  const navObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        navLinks.forEach(link => {
          link.classList.toggle('is-active', link.getAttribute('href') === `#${id}`);
        });
      }
    });
  }, { rootMargin: '-40% 0px -50% 0px' });

  sections.forEach(sec => { if (sec.id) navObserver.observe(sec); });
}

// ==========================================================================
// DotField — interactive dot-grid background (vanilla JS port, hero section)
// Ported from the React Bits DotField component. Same core physics/canvas
// logic, adapted to run without React and themed to the site's palette.
// ==========================================================================
(function initDotField() {
  const container = document.getElementById('dotField');
  if (!container) return;
  if (prefersReducedMotion) return; // keep it calm for reduced-motion users

  const canvas = document.getElementById('dotFieldCanvas');
  const ctx = canvas.getContext('2d', { alpha: true });

  const options = {
    dotRadius: 3.2,
    dotSpacing: 20,
    cursorRadius: 125,
    cursorForce: 0.1,
    bulgeOnly: true,
    bulgeStrength: 95,
    sparkle: true,
    waveAmplitude: 0.6,
    gradientFrom: 'rgba(78, 227, 172, 0.82)',
    gradientTo: 'rgba(247, 197, 103, 0.68)'
  };

  const TWO_PI = Math.PI * 2;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  let dots = [];
  let size = { w: 0, h: 0, offsetX: 0, offsetY: 0 };
  const mouse = {
    x: -9999,
    y: -9999,
    prevX: -9999,
    prevY: -9999,
    speed: 0,
    active: false
  };
  let engagement = 0;
  let frameCount = 0;
  let rafId = null;
  let resizeTimer = null;

  function buildDots(w, h) {
    const step = options.dotRadius + options.dotSpacing;
    const cols = Math.floor(w / step);
    const rows = Math.floor(h / step);
    const padX = (w % step) / 2;
    const padY = (h % step) / 2;
    const next = new Array(rows * cols);
    let idx = 0;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const ax = padX + col * step + step / 2;
        const ay = padY + row * step + step / 2;
        next[idx++] = { ax, ay, sx: ax, sy: ay, vx: 0, vy: 0, x: ax, y: ay };
      }
    }
    dots = next;
  }

  function doResize() {
    const rect = container.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (w <= 0 || h <= 0) return;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    size = {
      w, h,
      offsetX: rect.left + window.scrollX,
      offsetY: rect.top + window.scrollY
    };

    buildDots(w, h);
  }

  function onMouseMove(e) {
    mouse.x = e.pageX - size.offsetX;
    mouse.y = e.pageY - size.offsetY;

    mouse.active =
      mouse.x >= 0 &&
      mouse.x <= size.w &&
      mouse.y >= 0 &&
      mouse.y <= size.h;
  }

  function updateSpeed() {
    const dx = mouse.prevX - mouse.x;
    const dy = mouse.prevY - mouse.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    mouse.speed += (dist - mouse.speed) * 0.5;
    if (mouse.speed < 0.001) mouse.speed = 0;
    mouse.prevX = mouse.x;
    mouse.prevY = mouse.y;
  }
  const speedInterval = setInterval(updateSpeed, 20);

  function tick() {
    frameCount++;
    const { w, h } = size;
    const len = dots.length;
    const t = frameCount * 0.02;

    const targetEngagement = mouse.active ? 1 : 0;
    engagement += (targetEngagement - engagement) * 0.06;
    if (engagement < 0.001) engagement = 0;

    ctx.clearRect(0, 0, w, h);

    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, options.gradientFrom);
    grad.addColorStop(1, options.gradientTo);
    ctx.fillStyle = grad;

    const cr = options.cursorRadius;
    const crSq = cr * cr;
    const rad = options.dotRadius / 2;

    ctx.beginPath();

    for (let i = 0; i < len; i++) {
      const d = dots[i];
      const dx = mouse.x - d.ax;
      const dy = mouse.y - d.ay;
      const distSq = dx * dx + dy * dy;

      if (mouse.active && distSq < crSq && engagement > 0.01) {
        const dist = Math.sqrt(distSq);
        const tt = 1 - dist / cr;
        const push =
          Math.pow(tt, 1.5) *
          options.bulgeStrength *
          engagement;

        const angle = Math.atan2(dy, dx);

        /* Swirl strength */
        const swirl =
          Math.sin(tt * Math.PI) *
          45 *
          engagement;

        /* Push dots outward */
        const pushX = Math.cos(angle) * push;
        const pushY = Math.sin(angle) * push;

        /* Rotate dots around cursor */
        const swirlX = -Math.sin(angle) * swirl;
        const swirlY =  Math.cos(angle) * swirl;

        /* Final target position */
        const targetX =
          d.ax - pushX + swirlX;

        const targetY =
          d.ay - pushY + swirlY;

        /* Smooth animation */
        d.sx += (targetX - d.sx) * 0.14;
        d.sy += (targetY - d.sy) * 0.14;
      } else {
        d.sx += (d.ax - d.sx) * 0.1;
        d.sy += (d.ay - d.sy) * 0.1;
      }

      let drawX = d.sx;
      let drawY = d.sy;
      if (options.waveAmplitude > 0) {
        drawY += Math.sin(d.ax * 0.03 + t) * options.waveAmplitude;
        drawX += Math.cos(d.ay * 0.03 + t * 0.7) * options.waveAmplitude * 0.5;
      }

      if (options.sparkle) {
        const hash = ((i * 2654435761) ^ (frameCount >> 3)) >>> 0;
        if ((hash % 100) < 3) {
          ctx.moveTo(drawX + rad * 1.8, drawY);
          ctx.arc(drawX, drawY, rad * 1.8, 0, TWO_PI);
        } else {
          ctx.moveTo(drawX + rad, drawY);
          ctx.arc(drawX, drawY, rad, 0, TWO_PI);
        }
      } else {
        ctx.moveTo(drawX + rad, drawY);
        ctx.arc(drawX, drawY, rad, 0, TWO_PI);
      }
    }

    ctx.fill();
    rafId = requestAnimationFrame(tick);
  }

  function resize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(doResize, 100);
  }

  doResize();
  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', onMouseMove, { passive: true });
  rafId = requestAnimationFrame(tick);

  window.addEventListener('beforeunload', () => {
    cancelAnimationFrame(rafId);
    clearInterval(speedInterval);
    clearTimeout(resizeTimer);
  });
})();
