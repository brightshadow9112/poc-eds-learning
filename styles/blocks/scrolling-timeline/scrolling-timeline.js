import { renderBlock } from '../../scripts/faintly.js';
import { isUniversalEditorActive } from '../../scripts/scripts.js';

/**
 * Transform year content from the entry
 * @param {Object} context - The rendering context
 * @returns {HTMLElement} The transformed year content
 */
const transformYear = (context) => {
  const { entry } = context;
  if (!entry || !entry.children || entry.children.length === 0) return '';

  const yearDiv = entry.children[0];
  if (!yearDiv || !yearDiv.querySelector('p')) return '';

  return yearDiv.querySelector('p').textContent;
};

/**
 * Transform description content from the entry
 * @param {Object} context - The rendering context
 * @returns {HTMLElement} The transformed description content
 */
const transformDescription = (context) => {
  const { entry } = context;
  if (!entry || !entry.children || entry.children.length < 2) return '';

  const descDiv = entry.children[1];
  if (!descDiv || !descDiv.querySelector('p')) return '';

  return descDiv.querySelector('p').textContent;
};

/**
 * Get AEM-specific attributes for a timeline entry based on context
 * Used by the data-fly-attributes directive in the template
 * @param {Object} context - The rendering context
 * @returns {Object} The attributes object
 */
const timelineEntryAttributes = (context) => {
  if (isUniversalEditorActive()) {
    let entryIndex = 0;
    if (context.entryIndex !== undefined) {
      entryIndex = context.entryIndex;
    }

    // Get AEM resource path using optional chaining and entryIndex
    const entryPath = context.block?.children?.[entryIndex]?.dataset?.aueResource || '';
    if (!entryPath) return {};

    return {
      'data-aue-resource': entryPath,
      'data-aue-type': 'component',
      'data-aue-model': 'timeline-entry',
      'data-aue-label': `Timeline Entry ${entryIndex + 1}`,
    };
  }
  return {};
};

/**
 * Initialize the scroll animation for the timeline entries
 * Highlights entries when they scroll into view
 * @param {HTMLElement} block - The scrolling timeline block element
 */
const initScrollAnimation = (block) => {
  if (isUniversalEditorActive()) return;

  const entries = block.querySelectorAll('.timeline-entry');
  if (!entries.length) return;

  // Create IntersectionObserver instance
  const observer = new IntersectionObserver((intersectionEntries) => {
    intersectionEntries.forEach((entry) => {
      // When entry is at least 50% visible
      if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
        // Remove active class from all entries
        document.querySelectorAll('.timeline-entry').forEach((item) => {
          item.classList.remove('active');
        });

        // Add active class to current entry
        entry.target.classList.add('active');
      }
    });
  }, {
    root: null, // Use viewport as root
    rootMargin: '0px',
    threshold: [0.5], // When element is 50% visible
  });

  // Observe each timeline entry
  entries.forEach((entry) => {
    observer.observe(entry);
  });

  // Activate the first entry by default if in viewport
  if (entries[0].getBoundingClientRect().top < window.innerHeight) {
    entries[0].classList.add('active');
  }

  // Add scroll event for enhanced animations
  window.addEventListener('scroll', () => {
    const scrollPosition = window.scrollY + (window.innerHeight / 2);

    // Find the entry closest to the center of the viewport
    let closestEntry = null;
    let closestDistance = Infinity;

    entries.forEach((entry) => {
      const rect = entry.getBoundingClientRect();
      const entryMiddle = window.scrollY + rect.top + (rect.height / 2);
      const distance = Math.abs(scrollPosition - entryMiddle);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestEntry = entry;
      }
    });

    // Apply active state to closest entry
    if (closestEntry) {
      entries.forEach((entry) => {
        if (entry === closestEntry) {
          entry.classList.add('active');
        } else {
          entry.classList.remove('active');
        }
      });
    }
  }, { passive: true });
};

export default async function decorate(block) {
  await renderBlock(block, {
    timelineEntryAttributes,
    transformYear,
    transformDescription,
  });

  // Initialize the scroll animation after rendering
  initScrollAnimation(block);
}
