Create a new "scrolling-timeline" block for our AEM Edge Data Services X-Walk project. The block should:

1. Structure:
   - Display multiple timeline entries, each with a year and description (rich text fields only)
   - Show years as large headings (7.5em font size on desktop, 2rem on mobile)
   - Include proper Universal Editor integration with data-aue-* attributes
   - Support content extraction via transformer functions

2. Visual Design:
   - Black background (#000) with light gray text (#AAA) that turns white (#FFF) when active
   - Create a vertical separator line between the year and description that:
      - Takes up the full container height in desktop view
      - Is positioned consistently between year and description columns
      - Changes from #555 to white (#FFF) when entry is active
   - In mobile view (below 992px):
      - Display items vertically (year above, description below)
      - Replace the vertical separator with a horizontal line below the year
      - Ensure the horizontal separator has full width matching the content

3. Animation/Interaction:
   - Implement scroll-based highlighting: entries become active (opacity 1, transform scale 1.03) as they enter viewport
   - Inactive entries should be at 0.4 opacity
   - Use IntersectionObserver for efficient scroll detection
   - Add smooth transitions for opacity, transform, and color (0.5s ease)

4. Responsive Design:
   - Desktop (≥992px): Year and description side-by-side, with vertical separator
   - Mobile (<992px): Year above separator, description below
   - Adjust spacing, font sizes, and alignments accordingly

5. Implementation Requirements:
   - Pure CSS solution for the separator line positioning
   - Use data-fly-content for proper content extraction
   - Integrate with Universal Editor by implementing proper attributes
   - Follow project code conventions (reference the cards block for structure)
   - Create all necessary files: _scrolling-timeline.json, scrolling-timeline.html, scrolling-timeline.js, scrolling-timeline.css
   - Add "scrolling-timeline" to the allowed components in /models/_section.json