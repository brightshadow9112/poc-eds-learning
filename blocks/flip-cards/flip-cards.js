import { createOptimizedPicture } from '../../scripts/aem.js';
import { renderBlock } from '../../scripts/faintly.js';
import { isUniversalEditorActive } from '../../scripts/scripts.js';
import { IMAGE_WIDTHS } from '../../scripts/constants.js';

/**
 * Transform the front side content of the flip card
 * Based on the original DOM structure where each card has three children:
 * 1. Image div with picture
 * 2. Front text div with paragraph
 * 3. Back text div with paragraph
 */
const transformFrontContent = (context) => {
  // Get the current row which contains all children for this card
  const { row } = context;
  if (!row || !row.children) {
    return document.createDocumentFragment();
  }

  const fragment = document.createDocumentFragment();

  // Process the first two children (image and front text)
  // First child: Image
  if (row.children[0]) {
    const imageDiv = row.children[0].cloneNode(true);
    const picture = imageDiv.querySelector('picture');

    if (picture) {
      imageDiv.className = 'flip-cards-card-image';

      // Only optimize pictures when not in Universal Editor
      if (!isUniversalEditorActive()) {
        const img = picture.querySelector(':scope > img');
        if (img) {
          const optimizedPicture = createOptimizedPicture(
            img.src,
            img.alt,
            false,
            [{ width: IMAGE_WIDTHS.DEFAULT }],
          );
          picture.replaceWith(optimizedPicture);
        }
      }
      fragment.appendChild(imageDiv);
    }
  }

  // Second child: Front text
  if (row.children[1]) {
    const frontTextDiv = row.children[1].cloneNode(true);
    frontTextDiv.className = 'flip-cards-card-body front-text';
    // Ensure all links and interactive elements within front text are properly accessible
    const interactiveElements = frontTextDiv.querySelectorAll('a, button');
    interactiveElements.forEach((el) => {
      el.setAttribute('tabindex', '0');
    });
    fragment.appendChild(frontTextDiv);
  }

  return fragment;
};

/**
 * Transform the back side content of the flip card
 */
const transformBackContent = (context) => {
  // Get the current row which contains all children for this card
  const { row } = context;
  if (!row || !row.children || row.children.length < 3) {
    return document.createDocumentFragment();
  }

  const fragment = document.createDocumentFragment();

  // Third child: Back text
  const backTextDiv = row.children[2].cloneNode(true);
  backTextDiv.className = 'flip-cards-card-back-body back-text';
  // Ensure all links and interactive elements within back text are properly accessible
  const interactiveElements = backTextDiv.querySelectorAll('a, button');
  interactiveElements.forEach((el) => {
    el.setAttribute('tabindex', '0');
  });
  fragment.appendChild(backTextDiv);

  return fragment;
};

/**
 * Get AEM-specific attributes for a flip card element based on context
 * @param {Object} context - The rendering context
 * @returns {Object} The attributes object
 */
const cardRowAttributes = (context) => {
  if (isUniversalEditorActive()) {
    let rowIndex = 0;
    if (context.rowIndex !== undefined) {
      rowIndex = context.rowIndex;
    }

    // Get AEM resource path using optional chaining and rowIndex
    const cardPath = context.block?.children?.[rowIndex]?.dataset?.aueResource || '';
    if (!cardPath) return {};

    return {
      'data-aue-resource': cardPath,
      'data-aue-type': 'component',
      'data-aue-model': 'flip-card',
      'data-aue-label': `Flip Card ${rowIndex + 1}`,
    };
  }
  return {};
};

/**
 * Add event listeners to the flip buttons
 */
function addFlipFunctionality(block) {
  const flipToBackButtons = block.querySelectorAll('.flip-to-back');
  const flipToFrontButtons = block.querySelectorAll('.flip-to-front');

  flipToBackButtons.forEach((button) => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      const flipCardContainer = button.closest('.flip-card-container');
      flipCardContainer.classList.add('flipped');
    });
  });

  flipToFrontButtons.forEach((button) => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      const flipCardContainer = button.closest('.flip-card-container');
      flipCardContainer.classList.remove('flipped');
    });
  });
}

export default async function decorate(block) {
  await renderBlock(block, {
    transformFrontContent,
    transformBackContent,
    cardRowAttributes,
  });

  // Add flip functionality after the block is rendered
  if (!isUniversalEditorActive()) {
    addFlipFunctionality(block);
  }
}
