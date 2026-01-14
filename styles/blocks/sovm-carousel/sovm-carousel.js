/* eslint-disable indent */
/* eslint-disable arrow-body-style */
import { loadScript } from '../../scripts/aem.js';

export default async function decorate(block) {
  const rows = [...block.children];
  const configRow = rows[0];

  let variation = 'var-default';

  if (configRow) {
    const cells = [...configRow.children];
    if (cells.length > 0) {
      const paragraphs = [...cells[0].children];
      if (paragraphs[0]) {
        const value = paragraphs[0].textContent.trim();
        if (value && value.startsWith('var-')) {
          variation = value;
        }
      }
    }
    configRow.remove();
  }

  block.classList.add(variation);

  const slides = [...block.children];

  slides.forEach((slide) => {
    const cells = [...slide.children];
    if (cells.length >= 2) {
      const topSection = cells[0];
      const bottomSection = cells[1];

      const picture = topSection.querySelector('picture');

      let heading = topSection.querySelector('h1, h2, h3, h4, h5, h6');
      if (!heading) {
        const paragraphs = Array.from(topSection.querySelectorAll('p'));
        heading = paragraphs.find((p) => !p.querySelector('picture'));
      }

      if (heading && heading.tagName === 'P') {
        const h4 = document.createElement('h4');
        h4.textContent = heading.textContent;
        heading = h4;
      }

      const cta = bottomSection.querySelector('.button-container');
      const rawLink = bottomSection.querySelector('a');

      slide.innerHTML = '';
      slide.classList.add('sovm-carousel-slide');

      // var-default, var-alternate
      if (variation === 'var-default' || variation === 'var-alternate') {
        const top = document.createElement('div');
        top.className = 'sovm-carousel-slide-top';

        if (picture) {
          const wrapper = picture.closest('p') || picture;
          wrapper.classList.add('sovm-carousel-icon');
          top.appendChild(wrapper);
        }

        if (heading) {
          heading.classList.add('sovm-carousel-heading');
          top.appendChild(heading);
        }

        slide.appendChild(top);

        const bottom = document.createElement('div');
        bottom.className = 'sovm-carousel-slide-bottom';

        Array.from(bottomSection.children).forEach((child) => {
          if (child === cta || child.contains(rawLink)) return;
          child.classList.add('sovm-carousel-description');
          bottom.appendChild(child);
        });

        slide.appendChild(bottom);
      }

      // var-cta
      if (variation === 'var-cta') {
        const allPictures = topSection.querySelectorAll('picture');
        const iconSpritePicture = allPictures[1];
        let svgSpritePath = '';
        if (iconSpritePicture) {
          const img = iconSpritePicture.querySelector('img');
          if (img && img.src) {
            svgSpritePath = img.src;
          }
        }

        const allParagraphs = Array.from(topSection.querySelectorAll('p'));
        const textOnlyParagraphs = allParagraphs.filter((p) => !p.querySelector('picture'));
        const iconNameParagraph = textOnlyParagraphs[1];
        const iconName = iconNameParagraph ? iconNameParagraph.textContent.trim() : '';

        const top = document.createElement('div');
        top.className = 'sovm-carousel-slide-top';

        if (heading) {
          heading.classList.add('sovm-carousel-heading');
          top.appendChild(heading);
        }

        if (svgSpritePath && iconName) {
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          svg.classList.add('icon-link-fixed');

          const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
          use.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', `${svgSpritePath}#${iconName}`);

          svg.appendChild(use);
          top.appendChild(svg);
        }

        slide.appendChild(top);

        const bottom = document.createElement('div');
        bottom.className = 'sovm-carousel-slide-bottom';

        if (picture) {
          const wrapper = picture.closest('p') || picture;
          bottom.appendChild(wrapper);
        }

        slide.appendChild(bottom);

        if (rawLink) {
          const linkOverlay = document.createElement('a');
          linkOverlay.href = rawLink.href;
          linkOverlay.target = '_blank';
          linkOverlay.rel = 'noopener noreferrer';
          linkOverlay.className = 'sovm-carousel-card-link-overlay';
          linkOverlay.setAttribute('aria-label', rawLink.title || rawLink.textContent || 'View details');
          slide.appendChild(linkOverlay);
        }
      }

      // var-image
      if (variation === 'var-image') {
        if (picture) {
          const wrapper = picture.closest('p') || picture;
          slide.appendChild(wrapper);
        }
      }
    }
  });

  if (!window.jQuery) {
    await loadScript('/scripts/jquery.min.js');
  }

  await loadScript('/scripts/slick.min.js');

  setTimeout(() => {
    window.jQuery(block).slick({
      dots: true,
      infinite: true,
      speed: 300,
      slidesToShow: 1,
      slidesToScroll: 1,
      prevArrow: '<button type="button" class="slick-prev"><span class="slick-prev-icon" aria-hidden="true"></span><span class="slick-sr-only">Previous</span></button>',
      nextArrow: '<button type="button" class="slick-next"><span class="slick-next-icon" aria-hidden="true"></span><span class="slick-sr-only">Next</span></button>',
      customPaging(slider, i) {
        return `<button type="button"><span class="slick-dot-icon" aria-hidden="true"></span><span class="slick-sr-only">Go to slide ${i + 1}</span></button>`;
      },
      responsive: [
        {
          breakpoint: 992,
          settings: {
            arrows: false,
          },
        },
      ],
    });
  }, 100);
}
