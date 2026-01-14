PROJECT CONTEXT:
- This is an AEM Edge Data Services X-Walk project for Otsuka
- We use data-fly-* attributes for content management
- Universal Editor integration requires specific data-aue-* attributes
- Our blocks use a standard structure: HTML template, JS for functionality, CSS for styling, and a JSON model

REFERENCE EXAMPLE:
Please use the "cards" block as a reference implementation. It demonstrates:
1. Proper _cards.json model structure with component definitions
2. HTML template with data-fly-* attributes
3. JavaScript transformers for content extraction
4. CSS styling patterns for our project

TECHNICAL REQUIREMENTS:
1. Block JSON Model (_scrolling-timeline.json):
   - Define model with two fields: year (string/rich text) and description (rich text)
   - Include proper filters and component definitions

2. HTML Template (scrolling-timeline.html):
   - Use <template> structure with data-fly-repeat for timeline entries
   - Include data-fly-content attributes linked to transformer functions
   - Structure the HTML with proper accessibility considerations

3. JavaScript (scrolling-timeline.js):
   - Implement transformer functions (transformYear, transformDescription)
   - Create timelineEntryAttributes function for Universal Editor support
   - Use IntersectionObserver for scroll animations
   - Keep pure functions with JSDoc comments

4. CSS (scrolling-timeline.css):
   - Use BEM-like naming with scrolling-timeline-container as the root
   - Implement responsive designs with specific breakpoints (desktop ≥992px, mobile <768px)
   - Create transitions for smooth animations
   - Use pure CSS for the separator line implementation

DESIGN SPECIFICS:
- Reference the Otsuka website for visual styling
- Year text should be significantly larger than description text
- Active state should have visual emphasis
- The separator line is a key visual element that should appear continuous on desktop and properly aligned on mobile

COMPONENT STRUCTURE:
This component should be included in the section component. Remember to add it to the allowed components in /models/_section.json.