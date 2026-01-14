/*
 * Video Block
 * Show a video referenced by a link
 * https://www.hlx.live/developer/block-collection/video
 */

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function embedYoutube(url, autoplay, background) {
  const usp = new URLSearchParams(url.search);
  let suffix = '';
  if (background || autoplay) {
    const suffixParams = {
      autoplay: autoplay ? '1' : '0',
      mute: background ? '1' : '0',
      controls: background ? '0' : '1',
      disablekb: background ? '1' : '0',
      loop: background ? '1' : '0',
      playsinline: background ? '1' : '0',
    };
    suffix = `&${Object.entries(suffixParams).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}`;
  }
  let vid = usp.get('v') ? encodeURIComponent(usp.get('v')) : '';
  const embed = url.pathname;
  if (url.origin.includes('youtu.be')) {
    [, vid] = url.pathname.split('/');
  }

  const temp = document.createElement('div');
  temp.innerHTML = `<div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;">
      <iframe src="https://www.youtube.com${vid ? `/embed/${vid}?rel=0&v=${vid}${suffix}` : embed}" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute;" 
      allow="autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope; picture-in-picture" allowfullscreen="" scrolling="no" title="Content from Youtube" loading="lazy"></iframe>
    </div>`;
  return temp.children.item(0);
}

function embedVimeo(url, autoplay, background) {
  const [, video] = url.pathname.split('/');
  let suffix = '';
  if (background || autoplay) {
    const suffixParams = {
      autoplay: autoplay ? '1' : '0',
      background: background ? '1' : '0',
    };
    suffix = `?${Object.entries(suffixParams).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}`;
  }
  const temp = document.createElement('div');
  temp.innerHTML = `<div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;">
      <iframe src="https://player.vimeo.com/video/${video}${suffix}" 
      style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute;" 
      frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen  
      title="Content from Vimeo" loading="lazy"></iframe>
    </div>`;
  return temp.children.item(0);
}

function getVideoElement(source, autoplay, background) {
  const video = document.createElement('video');
  video.setAttribute('controls', '');
  if (autoplay) video.setAttribute('autoplay', '');
  if (background) {
    video.setAttribute('loop', '');
    video.setAttribute('playsinline', '');
    video.removeAttribute('controls');
    video.addEventListener('canplay', () => {
      video.muted = true;
      if (autoplay) video.play();
    });
  }

  const sourceEl = document.createElement('source');
  sourceEl.setAttribute('src', source);
  sourceEl.setAttribute('type', `video/${source.split('.').pop()}`);
  video.append(sourceEl);

  return video;
}

const loadVideoEmbed = (block, link, autoplay, background) => {
  if (block.dataset.embedLoaded === 'true') {
    return;
  }
  const url = new URL(link);

  const isYoutube = link.includes('youtube') || link.includes('youtu.be');
  const isVimeo = link.includes('vimeo');

  if (isYoutube) {
    const embedWrapper = embedYoutube(url, autoplay, background);
    block.append(embedWrapper);
    embedWrapper.querySelector('iframe').addEventListener('load', () => {
      block.dataset.embedLoaded = true;
    });
  } else if (isVimeo) {
    const embedWrapper = embedVimeo(url, autoplay, background);
    block.append(embedWrapper);
    embedWrapper.querySelector('iframe').addEventListener('load', () => {
      block.dataset.embedLoaded = true;
    });
  } else {
    const videoEl = getVideoElement(link, autoplay, background);
    block.append(videoEl);
    videoEl.addEventListener('canplay', () => {
      block.dataset.embedLoaded = true;
    });
  }
};

export default async function decorate(block) {
  const rows = [...block.children];
  let link = '';
  let placeholder = null;
  let caption = '';

  // Extract content from Universal Editor structure or fallback to legacy
  rows.forEach((row, index) => {
    const cells = [...row.children];
    if (cells.length === 0) return;

    const cell = cells[0];
    const cellContent = cell.textContent.trim();
    const linkElement = cell.querySelector('a');
    const pictureElement = cell.querySelector('picture');

    // Debug: log each row
    // eslint-disable-next-line no-console
    console.log(`Row ${index}:`, { cellContent, hasLink: !!linkElement, hasPicture: !!pictureElement });

    if (linkElement) {
      link = linkElement.href;
    } else if (cellContent && (cellContent.startsWith('http') || cellContent.startsWith('/'))) {
      // Handle direct URL text
      link = cellContent;
    } else if (pictureElement) {
      placeholder = pictureElement;
    } else if (cellContent && cellContent.length > 0) {
      // More aggressive caption detection - any text that's not obviously a URL
      if (!cellContent.startsWith('http') && !cellContent.startsWith('/') && !cellContent.includes('.jpg') && !cellContent.includes('.png')) {
        caption = cellContent;
        // eslint-disable-next-line no-console
        console.log('Found caption text:', caption);
      }
    }
  });

  // Debug: log all extracted content
  // eslint-disable-next-line no-console
  console.log('Video block extraction results:', {
    link, caption, hasPlaceholder: !!placeholder, rowCount: rows.length,
  });

  // Fallback: if no link found, try the legacy approach
  if (!link) {
    const linkElement = block.querySelector('a');
    if (linkElement) {
      link = linkElement.href;
    }
  }

  // Fallback: if no placeholder found, try the legacy approach
  if (!placeholder) {
    const pictureElement = block.querySelector('picture');
    if (pictureElement) {
      placeholder = pictureElement;
    }
  }

  if (!link) {
    // eslint-disable-next-line no-console
    console.warn('Video block: No video URL found');
    return;
  }

  block.textContent = '';
  block.dataset.embedLoaded = false;

  // Create video container and caption container
  const videoContainer = document.createElement('div');
  videoContainer.className = 'video-player';

  const autoplay = block.classList.contains('autoplay');
  if (placeholder) {
    videoContainer.classList.add('placeholder');
    const wrapper = document.createElement('div');
    wrapper.className = 'video-placeholder';
    wrapper.append(placeholder);

    if (!autoplay) {
      wrapper.insertAdjacentHTML(
        'beforeend',
        '<div class="video-placeholder-play"><button type="button" title="Play"></button></div>',
      );
      wrapper.addEventListener('click', () => {
        wrapper.remove();
        loadVideoEmbed(videoContainer, link, true, false);
      });
    }
    videoContainer.append(wrapper);
  }

  // Add video container to block
  block.append(videoContainer);

  // Add caption if it exists
  if (caption) {
    // eslint-disable-next-line no-console
    console.log('Adding caption:', caption);
    const captionElement = document.createElement('div');
    captionElement.className = 'video-caption';
    captionElement.textContent = caption;
    block.append(captionElement);
  }

  if (!placeholder || autoplay) {
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        observer.disconnect();
        const playOnLoad = autoplay && !prefersReducedMotion.matches;
        loadVideoEmbed(videoContainer, link, playOnLoad, autoplay);
      }
    });
    observer.observe(block);
  }
}
