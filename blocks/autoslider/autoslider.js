/* eslint-disable */
import { loadScript } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

function el(tag, attrs = {}, kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue;
    if (k === 'class') n.className = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k.startsWith('aria-')) n.setAttribute(k, v);
    else if (k in n) n[k] = v;
    else n.setAttribute(k, v);
  }
  (Array.isArray(kids) ? kids : [kids]).filter(Boolean).forEach((c) => {
    n.append(c.nodeType ? c : document.createTextNode(String(c)));
  });
  return n;
}

async function ensureSlickAndJquery() {
  // Load jQuery from CDN if not already loaded
  if (!window.jQuery) {
    await loadScript('https://code.jquery.com/jquery-3.7.1.min.js');
  }
  
  // Load Slick CSS from CDN if not already loaded
  if (!document.querySelector('link[href*="slick.css"]')) {
    const slickCSS = document.createElement('link');
    slickCSS.rel = 'stylesheet';
    slickCSS.href = 'https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick.css';
    document.head.appendChild(slickCSS);
    
    const slickThemeCSS = document.createElement('link');
    slickThemeCSS.rel = 'stylesheet';
    slickThemeCSS.href = 'https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick-theme.css';
    document.head.appendChild(slickThemeCSS);
  }
  
  // Load Slick JS from CDN
  await loadScript('https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick.min.js');
  
  if (!window.jQuery?.fn?.slick)
    throw new Error('Slick failed to initialize: jQuery.fn.slick is missing.');
}

function waitForNonZeroWidth(node, timeoutMs = 4000) {
  const start = performance.now();
  return new Promise((resolve) => {
    const tick = () => {
      const w = node?.getBoundingClientRect?.().width || 0;
      if (w > 2) return resolve(true);
      if (performance.now() - start > timeoutMs) return resolve(false);
      requestAnimationFrame(tick);
    };
    tick();
  });
}

function observeVisibilityRefresh(nodes) {
  const refresh = () =>
    nodes.forEach(
      (n) =>
        n?.slick?.setPosition && !n.slick.unslicked && n.slick.setPosition(),
    );

  if (window.ResizeObserver) {
    const ro = new ResizeObserver(refresh);
    nodes.forEach((n) => ro.observe(n));
  }
  if (window.IntersectionObserver) {
    const io = new IntersectionObserver(
      (entries) => entries.some((e) => e.isIntersecting) && refresh(),
      {
        threshold: 0.01,
      },
    );
    nodes.forEach((n) => io.observe(n));
  }

  window.addEventListener('resize', refresh, { passive: true });
  window.addEventListener('load', refresh, { passive: true });
}

export default async function decorate(block) {
  await ensureSlickAndJquery();
  const $ = window.jQuery;

  const originalRows = [...block.querySelectorAll(':scope > div')];
  const items = originalRows.map((row) => {
    // Access children by index to support referenced images (like videoplaylist)
    const [c0] = row.children;
    const img = c0?.querySelector('img') || row.querySelector('img');
    const picture = c0?.querySelector('picture') || row.querySelector('picture');
    
    if (!img) return null;
    
    return {
      img,
      picture,
      src: img.src,
      alt: img.alt || 'Slide image',
      row,
    };
  }).filter(Boolean);

  if (!items.length) return;

  block.classList.add('autoslider-container');

  const slider = el('div', {
    class: 'autoslider-slider',
    'aria-label': 'Auto slider',
  });

  items.forEach((item, i) => {
    const slide = el(
      'div',
      {
        class: 'autoslider-slide',
        'data-index': String(i),
        role: 'group',
        'aria-roledescription': 'slide',
        'aria-label': `${i + 1} of ${items.length}`,
      },
      el('div', { class: 'autoslider-image-wrapper' }, 
        item.picture ? item.picture.cloneNode(true) : item.img.cloneNode(true)
      ),
    );

    // Move instrumentation from original row to new slide for Universal Editor support
    if (item.row) {
      moveInstrumentation(item.row, slide);
      // Remove the original row after moving instrumentation
      item.row.remove();
    }

    slider.append(slide);
  });

  block.append(slider);

  const visibleNow = await waitForNonZeroWidth(slider, 4000);

  $(slider).on('init', () => {
    observeVisibilityRefresh([slider]);
    if (slider?.slick?.setPosition && !slider.slick.unslicked) {
      slider.slick.setPosition();
    }
    [100, 300].forEach((ms) => setTimeout(() => {
      if (slider?.slick?.setPosition && !slider.slick.unslicked) {
        slider.slick.setPosition();
      }
    }, ms));
  });

  // Initialize Slick
  $(slider).slick({
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: false,
    dots: true,
    infinite: true,
    autoplay: true,
    speed: 800,
    fade: true,
    cssEase: 'ease-in-out',
    pauseOnHover: true,
    pauseOnFocus: true,
    adaptiveHeight: true,
  });

  if (!visibleNow) {
    [500, 1200].forEach((ms) => setTimeout(() => {
      if (slider?.slick?.setPosition && !slider.slick.unslicked) {
        slider.slick.setPosition();
      }
    }, ms));
  }
}
