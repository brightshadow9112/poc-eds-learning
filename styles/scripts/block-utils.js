/**
* Creates and returns a block container element
* @param {HTMLElement} block Content block element
* @param {HTMLElement} container The container element to append
* @returns {HTMLElement} new block container element
*/
export const appendBlockContent = (block, container) => {
  const newBlock = block.cloneNode(false);
  newBlock.appendChild(container);
  block.replaceWith(newBlock);

  return newBlock;
};

/**
 * Checks if a value is null, undefined, or empty string
 * @param {*} value The value to check
 * @returns {boolean} true if the value is null, undefined, or empty
 */
export function isNullOrEmpty(value) {
  return value === null || value === undefined || String(value).trim() === '';
}

/**
 * Checks if a string value represents a boolean true
 * @param {*} val The value to check
 * @returns {boolean} true if the value is 'true' (case-insensitive)
 */
export function truthy(val) {
  return String(val || '').trim().toLowerCase() === 'true';
}

/**
 * Creates and returns an error container element
 * @param {Error} error The error that occurred
 * @returns {HTMLElement} The error container element
 */
export const createErrorUI = (error) => {
  const errorContainer = document.createElement('div');
  errorContainer.className = 'error-message';
  const heading = document.createElement('div');
  heading.textContent = 'Error loading data';
  errorContainer.appendChild(heading);

  const details = document.createElement('div');
  details.className = 'error-details';
  details.textContent = error.message;
  errorContainer.appendChild(details);

  return errorContainer;
};

/**
 * Loads a template file and creates a container with its content
 * @param {string} templatePath Path to the template file
 * @returns {Promise<HTMLElement>} A container with the template content
 */
export async function loadTemplate(templatePath) {
  // Load template
  const templateResponse = await fetch(templatePath);

  if (!templateResponse.ok) {
    throw new Error(`Failed to load template: ${templateResponse.status} ${templateResponse.statusText}`);
  }

  const template = await templateResponse.text();

  // Create container with template content
  const container = document.createElement('div');
  const templateEl = document.createElement('template');
  templateEl.innerHTML = template;
  container.append(...templateEl.content.childNodes);

  return container;
}

/**
 * Creates a URL for a template in the same directory as the calling module
 * @param {string} templateName The name of the template file
 * @param {Object} importMeta The import.meta object from the calling module
 * @returns {string} The full path to the template
 */
export function getTemplatePath(templateName, importMeta) {
  return new URL(templateName, importMeta.url).pathname;
}
