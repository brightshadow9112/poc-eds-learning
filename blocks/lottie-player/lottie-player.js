import { isNullOrEmpty, truthy } from '../../scripts/block-utils.js';

let lottiePlayerLoaded;

async function loadLottiePlayer() {
  if (lottiePlayerLoaded) return lottiePlayerLoaded;

  lottiePlayerLoaded = new Promise((resolve, reject) => {
    // LottieFiles web component (ES module)
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });

  return lottiePlayerLoaded;
}

function setObjectFromRows(rows) {
  // eslint-disable-next-line max-len
  const [url, lottieSelect, autoplay, loop, controls, background, speed, styleWidth, styleHeight, ariaLabel] = rows;
  const lottieObject = {};
  lottieObject.url = url;
  lottieObject.lottieSelect = lottieSelect;
  lottieObject.autoplay = autoplay ? truthy(autoplay) : 'true';
  lottieObject.loop = loop ? truthy(loop) : 'true';
  lottieObject.controls = controls ? truthy(controls) : 'false';
  lottieObject.background = background || 'transparent';
  lottieObject.speed = speed || '1';
  lottieObject.styleWidth = styleWidth || '400px';
  lottieObject.styleHeight = styleHeight || '400px';
  lottieObject.ariaLabel = ariaLabel || 'Lottie Animation';
  return lottieObject;
}

export default async function decorate(block) {
  const rows = [...block.children].map((row) => [...row.children].map((c) => c.textContent.trim()));

  const lottieObj = setObjectFromRows(rows);

  // Determine the Lottie animation source URL
  // Prioritize lottieSelect field, fallback to url field if empty
  // Exit early if no source is provided
  let src = lottieObj.lottieSelect;
  if (isNullOrEmpty(src)) {
    src = lottieObj.url;
  }
  if (!src) return;

  await loadLottiePlayer();

  const player = document.createElement('lottie-player');
  // need to fix to get file from DAM or URL
  player.setAttribute('src', src);

  // booleans
  if (truthy(lottieObj.autoplay)) player.setAttribute('autoplay', '');
  if (truthy(lottieObj.loop)) player.setAttribute('loop', '');
  if (truthy(lottieObj.controls)) player.setAttribute('controls', '');

  // opitonal attributes
  if (!isNullOrEmpty(lottieObj.background)) player.setAttribute('background', lottieObj.background);
  if (!isNullOrEmpty(lottieObj.speed)) player.setAttribute('speed', lottieObj.speed);

  // size and accessibility
  if (!isNullOrEmpty(lottieObj.styleWidth)) player.style.width = lottieObj.styleWidth;
  if (!isNullOrEmpty(lottieObj.styleHeight)) player.style.height = lottieObj.styleHeight;
  if (!isNullOrEmpty(lottieObj.ariaLabel)) player.setAttribute('aria-label', lottieObj.ariaLabel);

  const wrapper = document.createElement('div');
  wrapper.className = 'lottie-player-wrapper';
  wrapper.append(player);

  block.replaceChildren(wrapper);
}
