console.log('Obsidian Links script starting...');

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, searching for Obsidian links...');
    
    // Get current section from URL
    const currentPath = window.location.pathname;
    const currentSection = currentPath.split('/')[1] || 'posts';
    console.log('Current section:', currentSection);
    
    // Just search all the HTML content
    const html = document.body.innerHTML;
    
    // Find all Obsidian links (both with and without pipe)
    const obsidianLinkRegex = /\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/g;
    
    // If there are matches, replace them
    if (html.match(obsidianLinkRegex)) {
        console.log('Found Obsidian links, replacing...');
        
        // Replace all instances
        const newHtml = html.replace(obsidianLinkRegex, function(match, docName, linkText) {
            docName = docName.trim();
            linkText = linkText ? linkText.trim() : docName; // If no link text, use docName
            
            let docPath;
            
            // Check if it's a cross-directory link
            if (docName.startsWith('content/')) {
                // Remove 'content/' and get the directory name
                const dirName = docName.replace(/^content\//, '').split('/')[0];
                docPath = `/${dirName}`;
            } else {
                // Same directory link
                docPath = `/${currentSection}/${docName.toLowerCase().replace(/\s+/g, '-')}`;
            }
            
            console.log(`Converting: ${match} → <a href="${docPath}">${linkText}</a>`);
            
            return `<a href="${docPath}" title="${linkText}">${linkText}</a>`;
        });
        
        // Update the HTML
        document.body.innerHTML = newHtml;
        console.log('Conversion complete!');
    } else {
        console.log('No Obsidian links found.');
    }
}); 