export default async function decorate(block) {
  const paragraph = block.children[0].querySelector('p');
  const link = block.children[0].querySelector('a');
  const iconName = block.children[1]
    .querySelectorAll('p')[1]
    ?.textContent?.trim();
  const iconPath = block.children[1]
    .querySelector('picture img')
    ?.getAttribute('src');
  const paragraphText = paragraph ? paragraph.textContent.trim() : '';
  const href = link ? link.getAttribute('href') : '#';

  const anchor = document.createElement('a');
  const span = document.createElement('span');

  anchor.classList.add('anchor-menu-link');
  anchor.setAttribute('target', '_self');
  anchor.setAttribute('href', href);
  span.classList.add('anchor-menu-text');
  span.textContent = paragraphText;

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const XLINK_NS = 'http://www.w3.org/1999/xlink';

  const svg = document.createElementNS(SVG_NS, 'svg');
  const use = document.createElementNS(SVG_NS, 'use');

  if (iconPath && iconName) {
    svg.classList.add('anchor-menu-icon');
    use.setAttributeNS(XLINK_NS, 'xlink:href', `${iconPath}?#${iconName}`);
  }
  svg.append(use);
  anchor.append(span);
  anchor.append(svg);
  block.replaceChildren(anchor);
}
