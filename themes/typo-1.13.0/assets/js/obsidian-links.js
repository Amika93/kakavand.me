console.log('Obsidian Links script starting...');

function convertObsidianLinks() {
    console.log('Starting link conversion...');
    
    // Find all elements that might contain Obsidian-style links
    const contentElements = document.querySelectorAll('body');
    console.log('Found content elements:', contentElements.length);
    
    contentElements.forEach(element => {
        // Convert Obsidian-style links to HTML links
        const obsidianLinkRegex = /\[\[([^|\]]+)\|([^\]]+)\]\]/g;
        let html = element.innerHTML;
        let match;
        let foundLinks = 0;
        
        while ((match = obsidianLinkRegex.exec(html)) !== null) {
            foundLinks++;
            const docName = match[1].trim();
            const linkText = match[2].trim();
            
            // Extract the folder name from the current page's URL
            const currentPath = window.location.pathname;
            const folderMatch = currentPath.match(/^\/([^\/]+)/);
            const folder = folderMatch ? folderMatch[1] : 'posts';
            
            const docPath = `/${folder}/` + docName.toLowerCase().replace(/\s+/g, '-');
            console.log('Found link to convert:', {
                original: match[0],
                docName,
                linkText,
                docPath
            });
            
            const replacement = `<a href="${docPath}" title="${linkText}">${linkText}</a>`;
            html = html.replace(match[0], replacement);
        }
        
        if (foundLinks > 0) {
            console.log(`Converted ${foundLinks} links`);
            element.innerHTML = html;
        }
    });
}

// Run immediately
convertObsidianLinks();

// Also run after a short delay to catch any dynamically loaded content
setTimeout(convertObsidianLinks, 1000); 