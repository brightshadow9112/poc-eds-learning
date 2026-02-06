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

const txt = (n) => (n?.textContent || '').trim();

function pickUrl(cell) {
  const a = cell?.querySelector?.('a[href]');
  return (a?.href || txt(cell) || '').trim();
}

function normalizeVideoUrl(raw) {
  if (!raw) return null;
  const s = raw.trim();
  if (s.includes('youtube.com/embed/') || s.includes('player.vimeo.com/video/'))
    return s;

  const yt =
    s.match(/https?:\/\/youtu\.be\/([a-zA-Z0-9_-]+)/) ||
    s.match(/[?&]v=([a-zA-Z0-9_-]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;

  const vm = s.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;

  return s;
}

const providerFromSrc = (src = '') =>
  src.includes('youtube.com')
    ? 'youtube'
    : src.includes('vimeo.com')
      ? 'vimeo'
      : 'other';

function buildYouTubePoster(embedUrl) {
  const id = embedUrl.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/)?.[1];
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}

function loadScriptOnce(src, id) {
  if (document.getElementById(id)) return Promise.resolve();
  return new Promise((res, rej) => {
    const s = Object.assign(document.createElement('script'), {
      id,
      src,
      async: true,
    });
    s.onload = res;
    s.onerror = () => rej(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(s);
  });
}

let ytApiPromise;
function ensureYouTubeApi() {
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve, reject) => {
    if (window.YT?.Player) return resolve(window.YT);
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prev === 'function') prev();
      resolve(window.YT);
    };
    loadScriptOnce('https://www.youtube.com/iframe_api', 'yt-iframe-api').catch(
      reject,
    );
  });
  return ytApiPromise;
}

let vimeoApiPromise;
function ensureVimeoApi() {
  if (vimeoApiPromise) return vimeoApiPromise;
  vimeoApiPromise = loadScriptOnce(
    'https://player.vimeo.com/api/player.js',
    'vimeo-player-api',
  ).then(() => window.Vimeo);
  return vimeoApiPromise;
}

function buildIframe(
  src,
  title = 'Video',
  { loading = 'lazy', fetchPriority } = {},
) {
  const u = new URL(src, window.location.href);
  if (u.hostname.includes('youtube.com')) {
    Object.entries({
      rel: '0',
      modestbranding: '1',
      playsinline: '1',
      enablejsapi: '1',
      origin: window.location.origin,
    }).forEach(([k, v]) => u.searchParams.set(k, v));
  }

  const iframe = el('iframe', {
    class: 'vp-iframe',
    src: u.toString(),
    title,
    loading,
    allow:
      'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
    allowFullscreen: true,
    referrerPolicy: 'strict-origin-when-cross-origin',
  });

  if (fetchPriority) iframe.setAttribute('fetchpriority', fetchPriority);
  return iframe;
}

function withAutoplay(src) {
  const u = new URL(src, window.location.href);
  u.searchParams.set('autoplay', '1');
  u.searchParams.set('playsinline', '1');
  u.searchParams.set('loop', '0');
  if (u.hostname.includes('youtube.com')) u.searchParams.set('mute', '1');
  if (u.hostname.includes('vimeo.com')) u.searchParams.set('muted', '1');
  return u.toString();
}

async function ensureSlickAndJquery() {
  if (!window.jQuery) await loadScript('/scripts/jquery.min.js');
  await loadScript('/scripts/slick.min.js');
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

async function fetchYouTubeDuration(videoId) {
  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
    );
    if (!response.ok) return null;
    const data = await response.json();
    return null; // YouTube oEmbed doesn't provide duration, we'll need to use API or iframe
  } catch (err) {
    return null;
  }
}

async function fetchVimeoDuration(videoId) {
  try {
    // Try using oEmbed endpoint first (more reliable and doesn't have CORS issues)
    const response = await fetch(
      `https://vimeo.com/api/oembed.json?url=https://vimeo.com/${videoId}`,
    );
    if (!response.ok) {
      console.warn(`Failed to fetch Vimeo duration for video ${videoId}`);
      return null;
    }
    const data = await response.json();
    return data?.duration || null;
  } catch (err) {
    console.error(`Error fetching Vimeo duration for ${videoId}:`, err);
    return null;
  }
}

async function getVideoDuration(src, provider) {
  if (provider === 'youtube') {
    const id = src.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/)?.[1];
    if (!id) return null;
    // YouTube doesn't provide duration without API key, will fetch on player load
    return null;
  }

  if (provider === 'vimeo') {
    const id = src.match(/player\.vimeo\.com\/video\/(\d+)/)?.[1];
    if (!id) {
      console.warn('Could not extract Vimeo video ID from:', src);
      return null;
    }
    console.log(`Fetching duration for Vimeo video ${id}...`);
    const duration = await fetchVimeoDuration(id);
    console.log(`Duration for ${id}:`, duration);
    return duration;
  }

  return null;
}

function formatDuration(seconds) {
  if (!seconds) return '';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default async function decorate(block) {
  await ensureSlickAndJquery();
  const $ = window.jQuery;

  // Keep reference to original rows for moveInstrumentation
  const rows = [...block.querySelectorAll(':scope > div')];

  const items = await Promise.all(
    rows.map(async (row, idx) => {
      const [c0, c1, c2] = row.children;
      const src = normalizeVideoUrl(pickUrl(c0));
      if (!src) return null;
      const title = txt(c1) || 'title';
      const image =
        c2?.querySelector('img')?.src ||
        c2?.querySelector('picture img')?.src ||
        '';
      const provider = providerFromSrc(src);
      const duration = await getVideoDuration(src, provider);
      return { src, title, image, provider, duration, originalRow: row, rowIndex: idx };
    }),
  );

  const filteredItems = items.filter(Boolean);
  if (!filteredItems.length) return;

  block.classList.add('vp');

  const shell = el('div', { class: 'vp-shell' });
  const sliderFor = el('div', {
    class: 'vp-slider vp-slider-for slider-for',
    'aria-label': 'Video slider',
  });
  const sliderNav = el('div', {
    class: 'vp-slider-nav slider-nav',
    'aria-label': 'Video navigation',
  });
  shell.append(sliderFor, sliderNav);
  block.append(shell);

  const TEARDOWN_ON_BLUR = true;
  const PRECONNECT_ON_INTENT = true;

  const resumeTime = new Map();
  const ytPlayers = new Map();
  const vimeoPlayers = new Map();

  let active = 0;
  let autoplayOnChange = false;
  let stopPromise = Promise.resolve();
  let slides = [];

  const isReady = (n) => !!(n?.slick?.setPosition && !n.slick.unslicked);
  const setPos = () => {
    if (isReady(sliderFor)) sliderFor.slick.setPosition();
    if (isReady(sliderNav)) sliderNav.slick.setPosition();
  };
  const setPosSoon = () => [50, 200].forEach((ms) => setTimeout(setPos, ms));

  function updateDurationDisplay(index, duration) {
    const slide = slides[index];
    const caption = slide?.querySelector('.vp-caption');
    if (!caption) return;

    let durationSpan = caption.querySelector('.vp-duration');
    if (!durationSpan) {
      durationSpan = el('span', { class: 'vp-duration' });
      caption.append(' ', durationSpan);
    }
    durationSpan.textContent = `(${formatDuration(duration)})`;

    const navItem = sliderNav.querySelector(
      `.vp-navitem[data-index="${index}"]`,
    );
    if (navItem) {
      let navDuration = navItem.querySelector('.vp-duration');
      if (!navDuration) {
        navDuration = el('span', { class: 'vp-duration' });
        navItem.append(' ', navDuration);
      }
      navDuration.textContent = `(${formatDuration(duration)})`;
    }
  }

  function addPreconnect(href) {
    if (!href) return;
    const key = `vp-preconnect:${href}`;
    if (document.head.querySelector(`link[data-vp="${key}"]`)) return;
    document.head.appendChild(
      el('link', {
        rel: 'preconnect',
        href,
        crossOrigin: 'anonymous',
        'data-vp': key,
      }),
    );
  }

  function preconnectForProvider(provider) {
    if (!PRECONNECT_ON_INTENT) return;
    if (provider === 'vimeo') addPreconnect('https://player.vimeo.com');
    if (provider === 'youtube') {
      addPreconnect('https://www.youtube.com');
      addPreconnect('https://i.ytimg.com');
    }
  }

  function advanceIfPossible(fromIndex) {
    if (fromIndex !== active) return;
    autoplayOnChange = true;
    if (active < filteredItems.length - 1)
      $(sliderFor).slick('slickGoTo', active + 1);
    else {
      resumeTime.set(0, 0);
      $(sliderFor).slick('slickGoTo', 0);
    }
  }

  async function ensureYouTubePlayer(index, iframe) {
    await ensureYouTubeApi();
    if (ytPlayers.has(index)) return ytPlayers.get(index);

    const player = new window.YT.Player(iframe, {
      events: {
        onReady: (e) => {
          try {
            const duration = player.getDuration();
            if (
              typeof duration === 'number' &&
              duration > 0 &&
              !filteredItems[index].duration
            ) {
              filteredItems[index].duration = duration;
              updateDurationDisplay(index, duration);
            }
          } catch (err) {}
        },
        onStateChange: (e) => {
          if (e.data === window.YT.PlayerState.PAUSED) {
            try {
              const t = player.getCurrentTime();
              if (typeof t === 'number') resumeTime.set(index, t);
            } catch (err) {}
          }
          if (e.data === window.YT.PlayerState.ENDED) {
            resumeTime.set(index, 0);
            advanceIfPossible(index);
          }
        },
      },
    });

    ytPlayers.set(index, player);
    return player;
  }

  async function ensureVimeoPlayer(index, iframe) {
    await ensureVimeoApi();
    if (vimeoPlayers.has(index)) return vimeoPlayers.get(index);

    const player = new window.Vimeo.Player(iframe);
    try {
      await player.ready();
      if (!filteredItems[index].duration) {
        const duration = await player.getDuration();
        if (typeof duration === 'number' && duration > 0) {
          filteredItems[index].duration = duration;
          updateDurationDisplay(index, duration);
        }
      }
    } catch (err) {}

    player.on('pause', async () => {
      try {
        const t = await player.getCurrentTime();
        if (typeof t === 'number') resumeTime.set(index, t);
      } catch (err) {}
    });

    player.on('ended', () => {
      resumeTime.set(index, 0);
      advanceIfPossible(index);
    });

    vimeoPlayers.set(index, player);
    return player;
  }

  async function teardownSlide(index) {
    const slide = slides[index];
    const media = slide?.querySelector?.('.vp-media');
    if (!media) return;
    media.querySelector('iframe')?.remove();
    media.setAttribute('data-loaded', 'false');
    slide.classList.remove('is-playing');
  }

  async function stop(index) {
    const slide = slides[index];
    const media = slide?.querySelector?.('.vp-media');
    if (!media) return;

    const provider = media.getAttribute('data-provider');
    slide.classList.remove('is-playing');

    if (provider === 'youtube') {
      const p = ytPlayers.get(index);
      if (p) {
        try {
          const t = p.getCurrentTime?.();
          if (typeof t === 'number' && !Number.isNaN(t))
            resumeTime.set(index, t);
          p.pauseVideo?.();
        } catch (err) {}
      }
      if (TEARDOWN_ON_BLUR) {
        try {
          p?.destroy?.();
        } catch (err) {}
        ytPlayers.delete(index);
        await teardownSlide(index);
      }
      return;
    }

    if (provider === 'vimeo') {
      const p = vimeoPlayers.get(index);
      if (p) {
        try {
          const t = await p.getCurrentTime();
          if (typeof t === 'number' && !Number.isNaN(t))
            resumeTime.set(index, t);
          await p.pause();
        } catch (err) {}
      }
      if (TEARDOWN_ON_BLUR) {
        try {
          await p?.unload?.();
        } catch (err) {}
        try {
          await p?.destroy?.();
        } catch (err) {}
        vimeoPlayers.delete(index);
        await teardownSlide(index);
      }
      return;
    }

    if (TEARDOWN_ON_BLUR) await teardownSlide(index);
  }

  async function load(index, { autoPlay = false } = {}) {
    const slide = slides[index];
    const media = slide?.querySelector?.('.vp-media');
    const baseSrc = media?.getAttribute('data-src');
    const provider = media?.getAttribute('data-provider');
    if (!media || !baseSrc) return;

    preconnectForProvider(provider);

    if (media.getAttribute('data-loaded') !== 'true') {
      media.append(
        buildIframe(
          autoPlay ? withAutoplay(baseSrc) : baseSrc,
          filteredItems[index].title,
        ),
      );
      media.setAttribute('data-loaded', 'true');
      requestAnimationFrame(setPos);
      setPosSoon();
    }

    const iframe = media.querySelector('iframe');
    if (!iframe) return;

    const t = resumeTime.get(index) || 0;

    if (provider === 'youtube') {
      const player = await ensureYouTubePlayer(index, iframe);
      if (t > 0) {
        try {
          player.seekTo(t, true);
        } catch (err) {}
      }
      if (autoPlay) {
        try {
          player.playVideo?.();
          slide.classList.add('is-playing');
        } catch (err) {
          slide.classList.remove('is-playing');
        }
      }
      return;
    }

    if (provider === 'vimeo') {
      const player = await ensureVimeoPlayer(index, iframe);
      if (t > 0) {
        try {
          await player.setCurrentTime(t);
        } catch (err) {}
      }
      if (autoPlay) {
        try {
          await player.play();
          slide.classList.add('is-playing');
        } catch (err) {
          slide.classList.remove('is-playing');
        }
      }
    }
  }

  slides = filteredItems.map((item, i) => {
    const poster =
      item.image ||
      (item.src.includes('youtube.com/embed/')
        ? buildYouTubePoster(item.src)
        : null);

    const media = el('div', {
      class: `vp-media${poster ? ' has-poster' : ''}`,
      'data-src': item.src,
      'data-loaded': 'false',
      'data-provider': item.provider,
      role: 'button',
      tabindex: 0,
      'aria-label': `Play: ${item.title}`,
      ...(poster ? { style: `--vp-poster:url("${poster}")` } : {}),
    });

    const slide = el(
      'div',
      {
        class: 'vp-slide',
        'data-index': String(i),
        role: 'group',
        'aria-roledescription': 'slide',
        'aria-label': `${i + 1} of ${filteredItems.length}`,
      },
      el('div', { class: 'vp-card' }, media),
    );

    // Move Universal Editor instrumentation from original row to slide
    if (item.originalRow) {
      moveInstrumentation(item.originalRow, slide);
    }

    const navItemContent = [];

    if (item.image) {
      const navThumb = el('img', {
        src: item.image,
        alt: item.title,
        class: 'vp-navitem-thumb',
      });
      navItemContent.push(navThumb);
    }

    const navTextWrapper = el(
      'div',
      { class: 'vp-navitem-text-wrapper' },
      [
        el('span', { class: 'vp-video-number' }, `Video ${i + 1}: `),
        el('span', { class: 'vp-navitem-title' }, item.title),
        item.duration
          ? el(
              'span',
              { class: 'vp-duration' },
              ` (${formatDuration(item.duration)})`,
            )
          : null,
      ].filter(Boolean),
    );

    navItemContent.push(navTextWrapper);

    const navItem = el(
      'div',
      {
        class: 'vp-navitem',
        'data-index': String(i),
      },
      navItemContent,
    );

    sliderNav.append(navItem);

    const intent = () => preconnectForProvider(item.provider);
    ['mouseenter', 'focusin'].forEach((ev) =>
      media.addEventListener(ev, intent),
    );
    ['mouseenter', 'focusin'].forEach((ev) =>
      navItem.addEventListener(ev, intent),
    );

    const playThis = async () => {
      intent();
      if (active !== i) {
        autoplayOnChange = true;
        $(sliderFor).slick('slickGoTo', i);
        return;
      }
      await load(i, { autoPlay: true });
    };

    media.addEventListener('click', playThis);
    media.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      playThis();
    });

    sliderFor.append(slide);
    
    // Remove original row after moving instrumentation
    if (item.originalRow) {
      item.originalRow.remove();
    }
    
    return slide;
  });

  const visibleNow = await waitForNonZeroWidth(sliderFor, 4000);

  $(sliderNav).on('mousedown touchstart keydown', '.slick-slide', (e) => {
    if (e.type === 'keydown' && !(e.key === 'Enter' || e.key === ' ')) return;
    const idx = Number($(e.currentTarget).attr('data-slick-index')) || 0;
    autoplayOnChange = true;
    preconnectForProvider(filteredItems[idx]?.provider);
  });

  $(sliderFor).on('init', () => {
    observeVisibilityRefresh([sliderFor, sliderNav]);
    setPos();
    [100, 300].forEach((ms) => setTimeout(setPos, ms));
  });

  $(sliderFor).on('beforeChange', (e, slick, cur, next) => {
    preconnectForProvider(filteredItems?.[next]?.provider);
    stopPromise = stop(cur);
  });

  $(sliderFor).on('afterChange', (e, slick, cur) => {
    active = cur;
    Promise.resolve(stopPromise).finally(() => {
      if (autoplayOnChange) load(cur, { autoPlay: true });
      autoplayOnChange = false;
      requestAnimationFrame(setPos);
    });
  });

  shell.addEventListener('click', (e) => {
    const prev = e.target?.closest?.('.vp-prev');
    const next = e.target?.closest?.('.vp-next');
    if (!prev && !next) return;

    autoplayOnChange = true;
    const target = prev
      ? Math.max(0, active - 1)
      : Math.min(filteredItems.length - 1, active + 1);
    preconnectForProvider(filteredItems[target]?.provider);
  });

  $(sliderFor).slick({
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: true,
    fade: true,
    asNavFor: sliderNav,
    infinite: false,
    speed: 280,
    swipe: false,
    draggable: false,
    touchMove: false,
    adaptiveHeight: false,
    prevArrow:
      '<button class="vp-nav vp-prev" type="button" aria-label="Previous video"><span class="vp-nav-icon">‹</span></button>',
    nextArrow:
      '<button class="vp-nav vp-next" type="button" aria-label="Next video"><span class="vp-nav-icon">›</span></button>',
  });

  $(sliderNav).slick({
    slidesToShow: Math.min(3, filteredItems.length),
    slidesToScroll: 1,
    asNavFor: sliderFor,
    dots: true,
    centerMode: true,
    focusOnSelect: true,
    arrows: false,
    infinite: false,
    swipe: false,
    draggable: false,
    touchMove: false,
    adaptiveHeight: false,
  });

  if (!visibleNow) [500, 1200].forEach((ms) => setTimeout(setPos, ms));

  // Load first video player on page load in paused state
  setTimeout(() => {
    load(0, { autoPlay: false });
  }, 300);
}
