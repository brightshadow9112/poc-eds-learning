import { createOptimizedPicture } from './aem.js';
import { moveInstrumentation } from './scripts.js';
import { IMAGE_WIDTHS } from './constants.js';

/**
 * Parses block content into structured data
 * @param {HTMLElement} block The block element to parse
 * @param {Object} options Configuration options
 * @param {Function} options.rowParser Function to parse each row
 * @param {boolean} options.skipEmpty Skip empty rows
 * @returns {Array} Parsed data array
 */
export function parseBlockContent(block, options = {}) {
  const items = [];
  const { rowParser, skipEmpty = true } = options;

  // Default row parser returns column content
  const defaultRowParser = (row) => {
    const item = {};
    [...row.children].forEach((col, index) => {
      item[`col${index + 1}`] = col.innerHTML;
    });
    return item;
  };

  // Process each row
  [...block.children].forEach((row) => {
    // Skip empty rows if configured
    if (skipEmpty && row.children.length === 0) {
      return;
    }

    // Use provided parser or default
    const parser = typeof rowParser === 'function' ? rowParser : defaultRowParser;
    const parsedItem = parser(row);

    // Add to items array if not null
    if (parsedItem !== null) {
      items.push(parsedItem);
    }
  });

  return items;
}

/**
 * Checks if an element contains only an image
 * @param {HTMLElement} element Element to check
 * @returns {boolean} True if element contains only an image
 */
export function isImageOnly(element) {
  return element.children.length === 1
    && (element.querySelector('picture'));
}

/**
 * Gets optimized image from an element
 * @param {HTMLElement} element Element containing the image
 * @param {Object} options Image options
 * @param {string|number} options.width Default image width
 * @param {boolean} options.eager Load image eagerly
 * @returns {HTMLElement} Optimized picture element
 */
export function getOptimizedImage(element, options = {}) {
  const { width = IMAGE_WIDTHS.DEFAULT, eager = false } = options;
  const img = element.querySelector('img');

  if (!img) return null;
  const optimizedPic = createOptimizedPicture(
    img.src,
    img.alt,
    eager,
    [{ width }],
  );

  // Transfer instrumentation if available
  if (typeof moveInstrumentation === 'function') {
    moveInstrumentation(img, optimizedPic.querySelector('img'));
  }

  return optimizedPic;
}
