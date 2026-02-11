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

export default async function decorate(block) {
  await ensureSlickAndJquery();
  const $ = window.jQuery;

  const originalRows = [...block.querySelectorAll(':scope > div')];
  
  // Capture and preserve the authored order using data-aue-resource
  // This ensures order is maintained when Universal Editor updates the block
  const items = originalRows.map((row, index) => {
    // Access children by index to support referenced images (like videoplaylist)
    const [c0] = row.children;
    const img = c0?.querySelector('img') || row.querySelector('img');
    const picture = c0?.querySelector('picture') || row.querySelector('picture');
    
    if (!img) return null;
    
    // Capture the data-aue-resource for order preservation
    const aueResource = row.getAttribute('data-aue-resource') || '';
    
    return {
      img,
      picture,
      src: img.src,
      alt: img.alt || 'Slide image',
      row,
      aueResource,
      originalIndex: index, // Preserve the original DOM order
    };
  }).filter(Boolean);

  if (!items.length) return;

  // Sort items based on data-aue-resource to ensure consistent ordering
  // The Universal Editor uses resource paths that maintain the authored sequence
  items.sort((a, b) => {
    // If both have aueResource, compare them to maintain authored order
    if (a.aueResource && b.aueResource) {
      // Extract item numbers from resource paths for proper numeric sorting
      // Handles patterns like: /content/.../item_0, /content/.../item_1, etc.
      const aMatch = a.aueResource.match(/item[-_](\d+)$/i);
      const bMatch = b.aueResource.match(/item[-_](\d+)$/i);
      
      if (aMatch && bMatch) {
        // Numeric comparison for item numbers (handles 1, 2, ..., 10, 11 correctly)
        return parseInt(aMatch[1], 10) - parseInt(bMatch[1], 10);
      }
      
      // Fallback to lexicographic comparison for non-standard patterns
      return a.aueResource.localeCompare(b.aueResource);
    }
    // Fallback to original index if no resource paths
    return a.originalIndex - b.originalIndex;
  });

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
    moveInstrumentation(item.row, slide);
    // Remove the original row after moving instrumentation
    

    slider.append(slide);
    item.row.remove();
  });

  block.append(slider);

  // Initialize Slick carousel
  $(slider).slick({
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: false,
    dots: false,
    infinite: true,
    autoplay: true,
    speed: 800,
    fade: true,
    cssEase: 'ease-in-out',
    pauseOnHover: true,
    pauseOnFocus: true,
    adaptiveHeight: true,
  });
}
