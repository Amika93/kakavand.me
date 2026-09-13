// Process Obsidian-style callouts in Markdown content
document.addEventListener('DOMContentLoaded', function() {
  // Find all blockquotes that start with [!
  const blockquotes = document.querySelectorAll('blockquote');
  
  blockquotes.forEach(blockquote => {
    const firstParagraph = blockquote.querySelector('p:first-child');
    if (!firstParagraph) return;
    
    const text = firstParagraph.textContent;
    // Match the Obsidian callout syntax: [!TYPE] Title
    const calloutMatch = text.match(/^\[!(\w+)\](\+|-)?\s*(.*)?/);
    
    if (calloutMatch) {
      // Extract callout type, state, and custom title
      const calloutType = calloutMatch[1].trim().toLowerCase();
      const calloutState = calloutMatch[2] || '';
      const customTitle = calloutMatch[3] ? calloutMatch[3].trim() : '';
      
      // Create callout structure
      const calloutDiv = document.createElement('div');
      calloutDiv.className = 'callout';
      calloutDiv.setAttribute('data-callout', calloutType);
      
      // Create title div
      const titleDiv = document.createElement('div');
      titleDiv.className = 'callout-title';
      
      // Create icon span
      const iconSpan = document.createElement('span');
      iconSpan.className = 'callout-icon';
      
      // Create title inner span
      const titleInnerSpan = document.createElement('span');
      titleInnerSpan.className = 'callout-title-inner';
      
      // Use custom title if provided, otherwise use capitalized callout type
      if (customTitle) {
        titleInnerSpan.textContent = customTitle;
      } else {
        titleInnerSpan.textContent = calloutType.charAt(0).toUpperCase() + calloutType.slice(1);
      }
      
      // Append icon and title to title div
      titleDiv.appendChild(iconSpan);
      titleDiv.appendChild(titleInnerSpan);
      
      // Create content div
      const contentDiv = document.createElement('div');
      contentDiv.className = 'callout-content';
      
      // Move all content from blockquote to content div
      // First, remove the callout syntax from the first paragraph
      const newText = text.replace(/^\[!(\w+)\](\+|-)?\s*(.*)?/, '').trim();
      
      if (newText) {
        // If there's text remaining after removing the callout syntax, keep it
        firstParagraph.textContent = newText;
      } else {
        // If no text remains, remove the paragraph
        firstParagraph.remove();
      }
      
      // Move all children from blockquote to content div
      while (blockquote.firstChild) {
        contentDiv.appendChild(blockquote.firstChild);
      }
      
      // Append title and content to callout div
      calloutDiv.appendChild(titleDiv);
      calloutDiv.appendChild(contentDiv);
      
      // Replace blockquote with callout div
      blockquote.parentNode.replaceChild(calloutDiv, blockquote);
      
      // Handle collapsible callouts
      if (calloutState === '+' || calloutState === '-') {
        const isCollapsed = calloutState === '-';
        
        // Make the title clickable
        titleDiv.style.cursor = 'pointer';
        
        // Add a collapse/expand indicator
        const indicator = document.createElement('span');
        indicator.className = 'callout-fold';
        indicator.textContent = isCollapsed ? '◀' : '▼';
        indicator.style.marginLeft = '0.5rem';
        indicator.style.fontSize = '0.8rem';
        titleDiv.appendChild(indicator);
        
        // Set initial state
        contentDiv.style.display = isCollapsed ? 'none' : 'block';
        
        // Add click event
        titleDiv.addEventListener('click', function() {
          const isCurrentlyCollapsed = contentDiv.style.display === 'none';
          contentDiv.style.display = isCurrentlyCollapsed ? 'block' : 'none';
          indicator.textContent = isCurrentlyCollapsed ? '▼' : '◀';
        });
      }
    }
  });
});
