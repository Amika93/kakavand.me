console.log('Obsidian Links script starting...');

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing features...');
    
    // Get current section from URL
    const currentPath = window.location.pathname;
    const currentSection = currentPath.split('/')[1] || 'posts';
    console.log('Current section:', currentSection);
    
    // --- Obsidian Links Refactored ---
    function convertObsidianLinksInNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            // Replace obsidian links in text nodes only
            const obsidianLinkRegex = /\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/g;
            let text = node.nodeValue;
            let match;
            let lastIndex = 0;
            let parent = node.parentNode;
            let frag = document.createDocumentFragment();
            let changed = false;
            while ((match = obsidianLinkRegex.exec(text)) !== null) {
                changed = true;
                // Text before the match
                if (match.index > lastIndex) {
                    frag.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
                }
                const docName = match[1].trim();
                const linkText = match[2] ? match[2].trim() : docName;
                let a = document.createElement('a');
                if (docName.startsWith('#')) {
                    // Internal anchor link
                    a.href = docName;
                    a.className = 'obsidian-anchor-link';
                } else {
                    // Internal page link
                    const docPath = '/posts/' + docName.toLowerCase().replace(/\s+/g, '-');
                    a.href = docPath;
                    a.className = 'obsidian-page-link';
                }
                a.textContent = linkText;
                frag.appendChild(a);
                lastIndex = match.index + match[0].length;
            }
            if (changed) {
                // Remaining text
                if (lastIndex < text.length) {
                    frag.appendChild(document.createTextNode(text.slice(lastIndex)));
                }
                parent.replaceChild(frag, node);
            }
        } else if (node.nodeType === Node.ELEMENT_NODE && node.childNodes) {
            // Avoid replacing inside script/style/pre/code
            if (!['SCRIPT', 'STYLE', 'PRE', 'CODE'].includes(node.tagName)) {
                Array.from(node.childNodes).forEach(convertObsidianLinksInNode);
            }
        }
    }

    function convertObsidianLinks() {
        // Only process main content area
        const contentElements = document.querySelectorAll('main, .post-content, .content, article, .single-content');
        if (contentElements.length === 0) return;
        contentElements.forEach(element => {
            convertObsidianLinksInNode(element);
        });
    }

    convertObsidianLinks();
    // Now trigger callout initialization if available
    if (typeof window.initObsidianCallouts === 'function') {
        window.initObsidianCallouts();
    } else if (typeof initObsidianCallouts === 'function') {
        initObsidianCallouts();
    } else {
        // Fallback: try to find and run callout init from global scope
        if (window.obsidianCalloutsInit) {
            window.obsidianCalloutsInit();
        }
    }

    // Handle footnotes
    // Select only footnote reference links NOT inside .footnotes and only in main content
    const footnotes = Array.from(document.querySelectorAll('.single-content a[href^="#fn"]')).filter(link => !link.closest('.footnotes'));
    // Remove any buggy duplicate footnote sections (keep only the first)
    const allFootnoteSections = Array.from(document.querySelectorAll('.footnotes'));
    if (allFootnoteSections.length > 1) {
        // Keep the first, remove the rest
        allFootnoteSections.slice(1).forEach(section => {
            section.parentNode && section.parentNode.removeChild(section);
        });
    }
    let activeTooltip = null;
    footnotes.forEach(footnote => {
        const footnoteId = footnote.getAttribute('href').substring(1);
        let footnoteContent = document.getElementById(footnoteId)?.innerHTML;
        if (!footnoteContent) return;
        
        // Remove 'back to content' and 'go to footnote' links from footnoteContent
        footnoteContent = footnoteContent.replace(/<a[^>]*href="#fnref[^"]*"[^>]*>.*?<\/a>/gi, ''); // Remove back links
        footnoteContent = footnoteContent.replace(/<a[^>]*href="#fn[^"]*"[^>]*>.*?<\/a>/gi, ''); // Remove go-to links

        // Create tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'footnote-tooltip';
        tooltip.style.border = 'none !important';
        
        // Add content and close button to tooltip
        tooltip.innerHTML = `
            <div class="footnote-tooltip-header">
                <button type="button" aria-label="Close footnote">×</button>
            </div>
            <div class="footnote-content">${footnoteContent}</div>
        `;
        const contentDiv = tooltip.querySelector('.footnote-content');
        const closeButton = tooltip.querySelector('.footnote-tooltip-header button');
        // Cap visible lines to 4 with scrolling
        if (contentDiv) {
            contentDiv.style.maxHeight = '8.4em'; // 4 lines * 1.6em line-height
            contentDiv.style.overflowY = 'auto';
            contentDiv.style.overflowX = 'hidden';
        }
        
        document.body.appendChild(tooltip);
        
        // Make content scrollable if long
        if (contentDiv && contentDiv.textContent.length > 200) {
            tooltip.classList.add('scrollable');
        }
        
        // Hide any active tooltip
        function hideActiveTooltip() {
            if (activeTooltip) {
                activeTooltip.style.display = 'none';
                activeTooltip = null;
            }
        }
        // Position tooltip below footnote (absolute, anchored in document)
        function positionTooltip() {
            const rect = footnote.getBoundingClientRect();
            tooltip.style.display = 'block';
            tooltip.style.position = 'absolute';
            tooltip.style.left = `${rect.left + window.scrollX}px`;
            tooltip.style.top = `${rect.bottom + window.scrollY + 5}px`;
            tooltip.style.zIndex = '1000';
            tooltip.style.backgroundColor = 'var(--background)';
            tooltip.style.border = 'none !important';
            tooltip.style.padding = '10px';
            tooltip.style.borderRadius = '12px';
            tooltip.style.maxWidth = '300px';
            tooltip.style.boxShadow = '0 8px 32px rgba(0,0,0,0.16), 0 1.5px 6px rgba(0,0,0,0.10)';
            tooltip.style.fontSize = '0.8em';
            tooltip.style.lineHeight = '1.4';
        }
        
        footnote.addEventListener('click', (e) => {
            e.preventDefault();
            hideActiveTooltip();
            positionTooltip();
            activeTooltip = tooltip;
        });
        
        // Prevent page scroll when scrolling tooltip (if scrollable)
        tooltip.addEventListener('wheel', (e) => {
            if (!tooltip.classList.contains('scrollable')) return;
            const delta = e.deltaY;
            const atTop = contentDiv.scrollTop === 0;
            const atBottom = contentDiv.scrollHeight - contentDiv.scrollTop === contentDiv.clientHeight;
            if ((delta < 0 && atTop) || (delta > 0 && atBottom)) {
                e.preventDefault();
            }
        }, { passive: false });
        
        // Close tooltip when clicking the close button
        closeButton.addEventListener('click', () => {
            tooltip.style.display = 'none';
            activeTooltip = null;
        });
        
        // Hide tooltip when clicking outside
        document.addEventListener('click', (e) => {
            if (!footnote.contains(e.target) && !tooltip.contains(e.target)) {
                tooltip.style.display = 'none';
                activeTooltip = null;
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
                }, 1000);
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

setTimeout(convertObsidianLinks, 1000);