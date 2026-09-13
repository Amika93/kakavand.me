// Process Obsidian-style callouts in Markdown content.
//
// The callout marker and its title live on the first line of the blockquote's
// first paragraph, and Goldmark keeps the following body lines in that SAME
// paragraph (a soft line break, not a new <p>). So the marker has to be peeled
// off by moving DOM nodes, never by rewriting textContent: doing the latter
// flattens the paragraph and throws away links, bold and inline code.

document.addEventListener('DOMContentLoaded', function () {
  // Marker, optional fold state, then the title - which stops at the end of
  // the line. `[ \t]*` rather than `\s*` on purpose: `\s` eats the newline and
  // would swallow the first body line as the title on an untitled callout.
  const CALLOUT_RE = /^\[!(\w+)\]([+-])?[ \t]*([^\r\n]*)/;

  // Detach the first `count` characters of text from `container`, keeping any
  // markup inside them, and return them as a fragment.
  function cutFront(container, count) {
    const frag = document.createDocumentFragment();

    while (count > 0 && container.firstChild) {
      const node = container.firstChild;
      const len = node.textContent.length;

      if (len <= count) {
        count -= len;
        frag.appendChild(node); // moves the node out of the container
      } else if (node.nodeType === Node.TEXT_NODE) {
        frag.appendChild(document.createTextNode(node.data.slice(0, count)));
        node.data = node.data.slice(count);
        count = 0;
      } else {
        // An element straddling the cut point: split inside it.
        frag.appendChild(cutFront(node, count));
        count = 0;
      }
    }

    return frag;
  }

  function trimLeading(el) {
    while (el.firstChild &&
           el.firstChild.nodeType === Node.TEXT_NODE &&
           !el.firstChild.data.trim()) {
      el.removeChild(el.firstChild);
    }
    if (el.firstChild && el.firstChild.nodeType === Node.TEXT_NODE) {
      el.firstChild.data = el.firstChild.data.replace(/^\s+/, '');
    }
  }

  const blockquotes = document.querySelectorAll('blockquote');

  blockquotes.forEach(blockquote => {
    const firstParagraph = blockquote.firstElementChild;
    if (!firstParagraph || firstParagraph.tagName !== 'P') return;

    const calloutMatch = firstParagraph.textContent.match(CALLOUT_RE);
    if (!calloutMatch) return;

    const calloutType = calloutMatch[1].trim().toLowerCase();
    const calloutState = calloutMatch[2] || '';
    const titleText = calloutMatch[3] || '';
    const markerLength = calloutMatch[0].length - titleText.length;

    const calloutDiv = document.createElement('div');
    calloutDiv.className = 'callout';
    calloutDiv.setAttribute('data-callout', calloutType);

    const titleDiv = document.createElement('div');
    titleDiv.className = 'callout-title';

    const iconSpan = document.createElement('span');
    iconSpan.className = 'callout-icon';

    const titleInnerSpan = document.createElement('span');
    titleInnerSpan.className = 'callout-title-inner';

    // Drop the `[!type]` marker, then lift the title out with its markup.
    cutFront(firstParagraph, markerLength);
    const titleNodes = cutFront(firstParagraph, titleText.length);

    if (titleText.trim()) {
      titleInnerSpan.appendChild(titleNodes);
    } else {
      titleInnerSpan.textContent =
        calloutType.charAt(0).toUpperCase() + calloutType.slice(1);
    }

    titleDiv.appendChild(iconSpan);
    titleDiv.appendChild(titleInnerSpan);

    const contentDiv = document.createElement('div');
    contentDiv.className = 'callout-content';

    // Whatever is left of the first paragraph is body text; drop it only if
    // nothing at all remains (an image-only paragraph still counts).
    trimLeading(firstParagraph);
    if (!firstParagraph.textContent.trim() && firstParagraph.children.length === 0) {
      firstParagraph.remove();
    }

    while (blockquote.firstChild) {
      contentDiv.appendChild(blockquote.firstChild);
    }

    calloutDiv.appendChild(titleDiv);
    calloutDiv.appendChild(contentDiv);

    blockquote.parentNode.replaceChild(calloutDiv, blockquote);

    // Collapsible callouts
    if (calloutState === '+' || calloutState === '-') {
      const isCollapsed = calloutState === '-';

      titleDiv.style.cursor = 'pointer';

      const indicator = document.createElement('span');
      indicator.className = 'callout-fold';
      indicator.textContent = isCollapsed ? '◀' : '▼';
      indicator.style.marginLeft = '0.5rem';
      indicator.style.fontSize = '0.8rem';
      titleDiv.appendChild(indicator);

      contentDiv.style.display = isCollapsed ? 'none' : 'block';

      titleDiv.addEventListener('click', function (event) {
        // Let a link inside the title behave like a link.
        if (event.target.closest('a')) return;
        const isCurrentlyCollapsed = contentDiv.style.display === 'none';
        contentDiv.style.display = isCurrentlyCollapsed ? 'block' : 'none';
        indicator.textContent = isCurrentlyCollapsed ? '▼' : '◀';
      });
    }
  });
});
