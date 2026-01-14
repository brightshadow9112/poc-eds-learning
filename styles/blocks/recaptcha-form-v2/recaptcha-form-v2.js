/**
 * Load reCaptcha v2 script
 */
function loadRecaptchaScript() {
  if (document.querySelector('script[src*="recaptcha"]')) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://www.google.com/recaptcha/api.js';
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

/**
 * Handle form submission with reCaptcha v2
 */
async function handleFormSubmit(event, form) {
  event.preventDefault();

  const submitButton = form.querySelector('button[type="submit"]');
  const messageContainer = form.querySelector('.form-message');

  // Get reCaptcha response
  const recaptchaResponse = window.grecaptcha.getResponse();

  if (!recaptchaResponse) {
    // Show error if reCaptcha not completed
    if (messageContainer) {
      messageContainer.className = 'form-message error';
      messageContainer.textContent = 'Please complete the reCaptcha verification';
      messageContainer.style.display = 'block';
    }
    return;
  }

  // Disable submit button
  submitButton.disabled = true;
  submitButton.textContent = 'Submitting...';

  try {
    // Get form data
    const formData = new FormData(form);
    formData.append('g-recaptcha-response', recaptchaResponse);

    // Show success message (replace with actual form submission)
    if (messageContainer) {
      messageContainer.className = 'form-message success';
      messageContainer.textContent = `Form submitted successfully! reCaptcha response: ${recaptchaResponse.substring(0, 20)}...`;
      messageContainer.style.display = 'block';
    }

    // Reset form and reCaptcha
    form.reset();
    window.grecaptcha.reset();

    // In production, you would send the form data to your backend:
    // const response = await fetch('/api/submit-form', {
    //   method: 'POST',
    //   body: formData
    // });
    // Backend should verify the reCaptcha response using Google's API
  } catch (error) {
    // Show error message
    if (messageContainer) {
      messageContainer.className = 'form-message error';
      messageContainer.textContent = `Error: ${error.message}`;
      messageContainer.style.display = 'block';
    }
  } finally {
    // Re-enable submit button
    submitButton.disabled = false;
    submitButton.textContent = 'Submit';
  }
}

/**
 * Create form HTML structure
 */
function createFormStructure(siteKey) {
  const form = document.createElement('form');
  form.innerHTML = `
    <div class="form-group">
      <label for="name">Name *</label>
      <input type="text" id="name" name="name" required>
    </div>
    <div class="form-group">
      <label for="email">Email *</label>
      <input type="email" id="email" name="email" required>
    </div>
    <div class="form-group">
      <label for="subject">Subject</label>
      <input type="text" id="subject" name="subject">
    </div>
    <div class="form-group">
      <label for="message">Message *</label>
      <textarea id="message" name="message" required></textarea>
    </div>
    <div class="recaptcha-container">
      ${siteKey ? `<div class="g-recaptcha" data-sitekey="${siteKey}"></div>` : ''}
    </div>
    <div class="form-message" style="display: none;"></div>
    <button type="submit">Submit</button>
  `;
  return form;
}

export default async function decorate(block) {
  const rows = [...block.children];

  // Extract configuration
  let siteKey = '6LfNREIsAAAAAIter-as5-05my3qndAW6G6d_Kw0';
  let heading = 'Contact Form';

  rows.forEach((row) => {
    const cell = row.children[0];
    const textContent = cell.textContent.trim();

    // Check if this is a site key (starts with reCaptcha identifier)
    if (textContent.toLowerCase().startsWith('sitekey:')) {
      siteKey = textContent.split(':')[1].trim();
      row.remove();
    } else if (textContent && !textContent.includes('=')) {
      // If it's plain text and not a config value, use as heading
      heading = textContent;
      row.remove();
    }
  });

  // Clear the block
  block.innerHTML = '';

  // Add heading
  const h2 = document.createElement('h2');
  h2.textContent = heading;
  block.appendChild(h2);

  // Create and add form
  const form = createFormStructure(siteKey);
  block.appendChild(form);

  // Load reCaptcha if site key is provided
  if (siteKey) {
    try {
      await loadRecaptchaScript();

      // Wait for grecaptcha to be ready and render
      const checkRecaptcha = setInterval(() => {
        if (window.grecaptcha && window.grecaptcha.render) {
          clearInterval(checkRecaptcha);
          form.addEventListener('submit', (e) => handleFormSubmit(e, form));
        }
      }, 100);

      // Clear interval after 5 seconds if not ready
      setTimeout(() => clearInterval(checkRecaptcha), 5000);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load reCaptcha:', error);
    }
  } else {
    // If no site key, show a warning
    const warning = document.createElement('p');
    warning.style.cssText = 'color: var(--text-secondary); font-size: var(--font-size-body-s);';
    warning.textContent = 'Note: Add "sitekey:YOUR_RECAPTCHA_SITE_KEY" to the block content to enable reCaptcha v2';
    form.insertBefore(warning, form.querySelector('.recaptcha-container'));

    // Add basic form submission handler
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const messageContainer = form.querySelector('.form-message');
      messageContainer.className = 'form-message success';
      messageContainer.textContent = 'Form submitted (reCaptcha not configured)';
      messageContainer.style.display = 'block';
      form.reset();
    });
  }
}
