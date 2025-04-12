console.log('Obsidian Links script starting...');

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing features...');
    
    // Get current section from URL
    const currentPath = window.location.pathname;
    const currentSection = currentPath.split('/')[1] || 'posts';
    console.log('Current section:', currentSection);
    
    // Find all Obsidian links (both with and without pipe)
    const obsidianLinkRegex = /\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/g;
    
    // Function to convert Obsidian links to HTML
    function convertObsidianLinks(element) {
        const html = element.innerHTML;
    if (html.match(obsidianLinkRegex)) {
        const newHtml = html.replace(obsidianLinkRegex, function(match, docName, linkText) {
            docName = docName.trim();
                linkText = linkText ? linkText.trim() : docName;
            
            let docPath;
            if (docName.startsWith('content/')) {
                const dirName = docName.replace(/^content\//, '').split('/')[0];
                docPath = `/${dirName}`;
            } else {
                docPath = `/${currentSection}/${docName.toLowerCase().replace(/\s+/g, '-')}`;
                }
                
                return `<a href="${docPath}" title="${linkText}">${linkText}</a>`;
            });
            element.innerHTML = newHtml;
        }
    }
    
    // Convert Obsidian links in the main content
    const mainContent = document.querySelector('.single-content');
    if (mainContent) {
        convertObsidianLinks(mainContent);
    }
    
    // Handle footnotes
    const footnotes = document.querySelectorAll('a[href^="#fn"]');
    footnotes.forEach(footnote => {
        const footnoteId = footnote.getAttribute('href').substring(1);
        const footnoteContent = document.getElementById(footnoteId)?.innerHTML;
        if (!footnoteContent) return;
        
        // Create tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'footnote-tooltip';
        
        // Create close button
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '×';
        closeButton.style.position = 'absolute';
        closeButton.style.top = '5px';
        closeButton.style.right = '5px';
        closeButton.style.background = 'none';
        closeButton.style.border = 'none';
        closeButton.style.fontSize = '1.2em';
        closeButton.style.cursor = 'pointer';
        closeButton.style.color = 'var(--content-secondary)';
        closeButton.style.padding = '0 5px';
        
        // Add content and close button to tooltip
        tooltip.innerHTML = `
            <div class="footnote-content">${footnoteContent}</div>
        `;
        tooltip.appendChild(closeButton);
        document.body.appendChild(tooltip);
        
        // Position tooltip on click
        footnote.addEventListener('click', (e) => {
            e.preventDefault();
            const rect = footnote.getBoundingClientRect();
            tooltip.style.display = 'block';
            tooltip.style.position = 'fixed';
            tooltip.style.left = `${rect.left}px`;
            tooltip.style.top = `${rect.bottom + 5}px`;
            tooltip.style.zIndex = '1000';
            tooltip.style.backgroundColor = 'var(--background)';
            tooltip.style.border = '1px solid var(--content-secondary)';
            tooltip.style.padding = '10px';
            tooltip.style.borderRadius = '4px';
            tooltip.style.maxWidth = '300px';
            tooltip.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
            tooltip.style.fontSize = '0.8em';
            tooltip.style.lineHeight = '1.4';
        });
        
        // Close tooltip when clicking the close button
        closeButton.addEventListener('click', () => {
            tooltip.style.display = 'none';
        });
        
        // Hide tooltip when clicking outside
        document.addEventListener('click', (e) => {
            if (!footnote.contains(e.target) && !tooltip.contains(e.target)) {
                tooltip.style.display = 'none';
            }
        });
    });

    // Only handle internal link previews if we're on a post page
    if (document.querySelector('.single-content')) {
        // Handle internal link previews
        const internalLinks = document.querySelectorAll('.single-content a[href^="/posts/"]');
        internalLinks.forEach(link => {
            let previewTimeout;
            const preview = document.createElement('div');
            preview.className = 'link-preview';
            document.body.appendChild(preview);
            
            link.addEventListener('mouseenter', () => {
                previewTimeout = setTimeout(async () => {
                    try {
                        const response = await fetch(link.href);
                        const text = await response.text();
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(text, 'text/html');
                        
                        // Get the main content
                        const content = doc.querySelector('.single-content');
                        if (!content) {
                            throw new Error('Content not found');
                        }
                        
                        // Clone the content and clean it up
                        const previewContent = content.cloneNode(true);
                        
                        // Remove elements we don't want in the preview
                        const elementsToRemove = previewContent.querySelectorAll('img, .giscus, .single-pagination, .single-tags, .single-intro-container');
                        elementsToRemove.forEach(el => el.remove());
                        
                        const rect = link.getBoundingClientRect();
                        preview.innerHTML = `
                            <div class="preview-content">
                                <h3>${link.textContent}</h3>
                                <div class="preview-scrollable">
                                    ${previewContent.innerHTML}
                                </div>
                            </div>
                        `;
                        preview.style.display = 'block';
                        preview.style.position = 'fixed';
                        preview.style.left = `${rect.left}px`;
                        preview.style.top = `${rect.bottom + 5}px`;
                        preview.style.zIndex = '1000';
                        preview.style.backgroundColor = 'var(--background)';
                        preview.style.border = '1px solid var(--content-secondary)';
                        preview.style.padding = '10px';
                        preview.style.borderRadius = '4px';
                        preview.style.maxWidth = '600px';
                        preview.style.maxHeight = '500px';
                        preview.style.overflow = 'hidden';
                        preview.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
                        
                        // Style the scrollable content
                        const scrollable = preview.querySelector('.preview-scrollable');
                        scrollable.style.maxHeight = '450px';
                        scrollable.style.overflowY = 'auto';
                        scrollable.style.paddingRight = '10px';
                        scrollable.style.fontSize = '0.9em';
                        scrollable.style.lineHeight = '1.5';
                        
                        // Style the preview content
                        const previewContentDiv = preview.querySelector('.preview-content');
                        previewContentDiv.style.display = 'flex';
                        previewContentDiv.style.flexDirection = 'column';
                        previewContentDiv.style.gap = '10px';
                        
                        // Style the title
                        const title = preview.querySelector('h3');
                        title.style.margin = '0';
                        title.style.fontSize = '1.1em';
                        title.style.fontWeight = 'bold';
                        
                        // Preserve original formatting
                        const paragraphs = scrollable.querySelectorAll('p');
                        paragraphs.forEach(p => {
                            p.style.marginTop = 'var(--p-margin-top)';
                            p.style.marginBottom = 'var(--p-margin-bottom)';
                            p.style.fontSize = 'var(--p-font-size)';
                            p.style.lineHeight = 'var(--p-line-height)';
                        });
                        
                        const headings = scrollable.querySelectorAll('h1, h2, h3, h4, h5, h6');
                        headings.forEach(h => {
                            h.style.marginTop = 'var(--hx-margin-top)';
                            h.style.marginBottom = 'var(--hx-margin-bottom)';
                            h.style.fontSize = 'var(--hx-font-size)';
                        });
                        
                        const lists = scrollable.querySelectorAll('ul, ol');
                        lists.forEach(list => {
                            list.style.marginTop = 'var(--ul-margin-top)';
                            list.style.marginBottom = 'var(--ul-margin-bottom)';
                        });
                        
                        const listItems = scrollable.querySelectorAll('li');
                        listItems.forEach(li => {
                            li.style.marginLeft = 'var(--li-indent)';
                            li.style.marginRight = 'var(--li-indent)';
                        });
                        
                        const codeBlocks = scrollable.querySelectorAll('pre, code');
                        codeBlocks.forEach(code => {
                            code.style.backgroundColor = 'var(--code-background)';
                            code.style.border = '1px solid var(--code-border)';
                            code.style.borderRadius = 'var(--code-border-radius)';
                        });
                    } catch (error) {
                        console.error('Error fetching preview:', error);
                        preview.innerHTML = `
                            <div class="preview-content">
                                <h3>${link.textContent}</h3>
                                <p>Preview not available</p>
                            </div>
                        `;
                        preview.style.display = 'block';
                    }
                }, 500);
            });
            
            // Only hide preview when mouse leaves both the link and the preview
            let isMouseOverPreview = false;
            
            preview.addEventListener('mouseenter', () => {
                isMouseOverPreview = true;
            });
            
            preview.addEventListener('mouseleave', () => {
                isMouseOverPreview = false;
                preview.style.display = 'none';
            });
            
            link.addEventListener('mouseleave', () => {
                setTimeout(() => {
                    if (!isMouseOverPreview) {
                        preview.style.display = 'none';
                    }
                }, 100);
            });
        });
    }
}); 