const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)',
);

function embedYoutube(url) {
  const usp = new URLSearchParams(url.search);
  let vid = usp.get('v') ? encodeURIComponent(usp.get('v')) : '';
  const embed = url.pathname;

  if (url.origin.includes('youtu.be')) {
    [, vid] = url.pathname.split('/');
  }

  const params = new URLSearchParams({
    autoplay: '1',
    mute: '1',
    playsinline: '1',
    controls: '0',
    modestbranding: '1',
    rel: '0',
    fs: '0',
    disablekb: '1',
    iv_load_policy: '3',
  });

  if (vid) {
    params.set('loop', '1');
    params.set('playlist', vid);
  }

  const src = `https://www.youtube.com${
    vid ? `/embed/${vid}?${params}` : `${embed}?${params}`
  }`;

  const wrapper = document.createElement('div');
  wrapper.className = 'hero-video-background';
  Object.assign(wrapper.style, {
    left: '0',
    width: '100%',
    height: '0',
    position: 'relative',
    paddingBottom: '56.25%',
  });

  const iframe = document.createElement('iframe');
  iframe.src = src;
  iframe.style.border = '0';
  iframe.style.top = '0';
  iframe.style.left = '0';
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.position = 'absolute';
  iframe.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope';
  iframe.allowFullscreen = true;
  iframe.scrolling = 'no';
  iframe.title = 'Content from YouTube';

  wrapper.appendChild(iframe);
  return wrapper;
}

function embedVimeo(url) {
  const [, video] = url.pathname.split('/');
  const params = new URLSearchParams({
    autoplay: '1',
    background: '1',
    playsinline: '1',
    muted: '1',
    loop: '1',
  });
  const src = `https://player.vimeo.com/video/${video}?${params}`;

  const wrapper = document.createElement('div');
  wrapper.className = 'hero-video-background';
  wrapper.style.left = '0';
  wrapper.style.width = '100%';
  wrapper.style.height = '0';
  wrapper.style.position = 'relative';
  wrapper.style.paddingBottom = '56.25%';

  const iframe = document.createElement('iframe');
  iframe.src = src;
  iframe.style.border = '0';
  iframe.style.top = '0';
  iframe.style.left = '0';
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.position = 'absolute';
  iframe.frameBorder = '0';
  iframe.allow = 'autoplay; fullscreen; picture-in-picture';
  iframe.allowFullscreen = true;
  iframe.title = 'Content from Vimeo';
  iframe.loading = 'lazy';

  wrapper.appendChild(iframe);
  return wrapper;
}

function getVideoElement(source) {
  const video = document.createElement('video');
  video.style.maxWidth = '100%';
  video.style.display = 'block';
  video.style.margin = '0 auto';
  video.setAttribute('autoplay', '');
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', '');
  video.setAttribute('loop', '');
  video.setAttribute('preload', 'auto');

  const sourceEl = document.createElement('source');
  sourceEl.setAttribute('src', source);
  sourceEl.setAttribute('type', `video/${source.split('.').pop()}`);

  video.append(sourceEl);
  video.addEventListener('canplay', () => {
    const playPromise = video.play();
    if (playPromise && typeof playPromise.then === 'function') {
      playPromise.catch(() => {});
    }
  });
  return video;
}

function loadVideoEmbed(block, link) {
  if (block.dataset.embedLoaded === 'true') return;

  let url;
  try {
    url = new URL(link, window.location.origin);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('Hero block: Invalid video URL', link);
    return;
  }

  const isYoutube = /youtube\.com|youtu\.be/.test(url.href);
  const isVimeo = /vimeo\.com/.test(url.href);

  if (isYoutube) {
    const embedWrapper = embedYoutube(url);
    block.append(embedWrapper);
    embedWrapper.querySelector('iframe').addEventListener('load', () => {
      block.dataset.embedLoaded = 'true';
    });
  } else if (isVimeo) {
    const embedWrapper = embedVimeo(url);
    block.append(embedWrapper);
    embedWrapper.querySelector('iframe').addEventListener('load', () => {
      block.dataset.embedLoaded = 'true';
    });
  } else {
    const videoEl = getVideoElement(url.href);
    block.append(videoEl);
    videoEl.addEventListener('canplay', () => {
      block.dataset.embedLoaded = 'true';
    });
  }
}

export default async function decorate(block) {
  block.classList.add('hero');
  const rows = Array.from(block.children);
  let link = '';
  let linkRow = null;

  rows.forEach((row) => {
    const cells = Array.from(row.children);
    const cell = cells[0] || row;
    const a = cell.querySelector('a');
    const cellText = (cell.textContent || '').trim();

    if (!link && a && a.href) {
      link = a.href;
      linkRow = row;
      return;
    }
    if (!link && /^(https?:\/\/|\/)/.test(cellText)) {
      link = cellText;
      linkRow = row;
    }
  });

  const overlay = document.createElement('div');
  overlay.className = 'cmp-text';
  const frag = document.createDocumentFragment();
  rows.forEach((row) => {
    if (row !== linkRow) frag.append(row.cloneNode(true));
  });
  overlay.append(frag);

  block.textContent = '';
  block.dataset.embedLoaded = 'false';

  if (overlay.childNodes.length) {
    block.append(overlay);
  }

  if (!link) {
    return;
  }

  const player = document.createElement('div');
  player.className = 'hero-player';
  block.append(player);

  const start = () => loadVideoEmbed(player, link);
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        observer.disconnect();
        if (!prefersReducedMotion.matches) {
          start();
        } else {
          start();
        }
      }
    },
    { rootMargin: '200px' },
  );
  observer.observe(block);
}
