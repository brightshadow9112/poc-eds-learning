let alpinePromise = null;
let isObserving = false;
const pendingComponents = [];

/**
 * Load Alpine.js immediately
 * @returns {Promise<object>} Promise resolves to the Alpine instance
 */
export function loadAlpineImmediate() {
  if (!alpinePromise) {
    alpinePromise = new Promise((resolve) => {
      // Check if Alpine is already loaded to prevent duplicate loading
      if (window.Alpine) {
        resolve(window.Alpine);
        return;
      }

      // Create script element to hold Alpine.js
      const script = document.createElement('script');
      // Use import.meta.url to get the correct path relative to current script
      const alpineUrl = new URL('./alpine.min.js', import.meta.url).href;
      script.src = alpineUrl;
      script.defer = true;

      // Resolve promise when script loads
      script.onload = () => {
        // Give Alpine time to initialize
        setTimeout(() => {
          // Process any pending component registrations
          while (pendingComponents.length > 0) {
            const { name, config } = pendingComponents.shift();
            window.Alpine.data(name, config);
          }
          resolve(window.Alpine);
        }, 50);
      };

      // Handle errors
      script.onerror = (err) => {
        // eslint-disable-next-line no-console
        console.error('Failed to load Alpine.js', err);
        // Resolve anyway to prevent blocking
        resolve(null);
      };

      // Add script to document
      document.head.appendChild(script);
    });
  }

  return alpinePromise;
}

/**
 * Setup global IntersectionObserver to load Alpine when
 * any Alpine component becomes visible
 */
function setupGlobalObserver() {
  if (isObserving) return;
  isObserving = true;

  const observer = new IntersectionObserver((entries) => {
    // If any observed element intersects, load Alpine
    // and disconnect the observer
    if (entries.some((entry) => entry.isIntersecting)) {
      loadAlpineImmediate().then(() => {
        observer.disconnect();
      });
    }
  }, { threshold: 0.1 });

  // Start observing elements with the alpine-component attribute
  document.querySelectorAll('[data-alpine-component]').forEach((el) => {
    observer.observe(el);
  });

  // Check for new components periodically
  const checkInterval = setInterval(() => {
    const newComponents = document.querySelectorAll('[data-alpine-component]:not([data-alpine-observed])');
    if (newComponents.length > 0) {
      newComponents.forEach((el) => {
        el.setAttribute('data-alpine-observed', 'true');
        observer.observe(el);
      });
    }

    // If Alpine loaded stop checking
    if (window.Alpine) {
      clearInterval(checkInterval);
    }
  }, 1000);
}

/**
 * Register an Alpine component for lazy loading
 * @param {string} name The component name
 * @param {function} config The component configuration factory
 */
export function registerAlpineComponent(name, config) {
  // If Alpine  already loaded register immediately
  if (window.Alpine) {
    window.Alpine.data(name, config);
    return;
  }

  // else queue for when Alpine loads
  pendingComponents.push({ name, config });

  // ensure observing visibility
  setupGlobalObserver();

  // listen for Alpine init event as fallback
  document.addEventListener('alpine:init', () => {
    // If component still in the queue, register it
    const index = pendingComponents.findIndex((c) => c.name === name);
    if (index >= 0) {
      const component = pendingComponents.splice(index, 1)[0];
      window.Alpine.data(component.name, component.config);
    }
  });
}

/**
 * Mark an element as an Alpine component for lazy loading
 * @param {HTMLElement} element The element to mark
 * @param {string} componentName The Alpine component name
 */
export function markForLazyLoad(element, componentName) {
  element.setAttribute('data-alpine-component', componentName);
  element.setAttribute('x-data', `${componentName}()`);

  // Setup the observer if not already
  setupGlobalObserver();
}

// Initialize the observer when this module loads
if (document.readyState !== 'loading') {
  setupGlobalObserver();
} else {
  document.addEventListener('DOMContentLoaded', setupGlobalObserver);
}
