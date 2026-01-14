import { createOptimizedPicture } from '../../scripts/aem.js';
import { renderBlock } from '../../scripts/faintly.js';
import { isUniversalEditorActive } from '../../scripts/scripts.js';
import { IMAGE_WIDTHS } from '../../scripts/constants.js';

const transformCardColumn = (context) => {
  const col = context.card;
  const picture = col.querySelector('picture');

  if (picture && col.children.length === 1) col.className = 'cards-card-image';
  else col.className = 'cards-card-body';

  // Only optimize pictures when not in Universal Editor
  if (picture && !isUniversalEditorActive()) {
    const img = picture.querySelector(':scope > img');
    picture.replaceWith(createOptimizedPicture(
      img.src,
      img.alt,
      false,
      [{ width: IMAGE_WIDTHS.DEFAULT }],
    ));
  }
  return col;
};

/**
 * Get AEM-specific attributes for a card element based on context
 * Used by the data-fly-attributes directive in the template
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
      'data-aue-model': 'card',
      'data-aue-label': `Card ${rowIndex + 1}`,
    };
  }
  return {};
};

export default async function decorate(block) {
  await renderBlock(block, {
    transformCardColumn,
    cardRowAttributes,
  });
}
