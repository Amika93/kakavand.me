// Theme toggle and TOC functionality
document.addEventListener('DOMContentLoaded', function() {
  initThemeToggle();
  initTableOfContents();
});

function initThemeToggle() {
  const themeToggle = document.getElementById('theme-toggle');
  const themeToggleIcon = document.getElementById('theme-toggle-icon');
  const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
  
  // Get saved theme from localStorage or use system preference
  const savedTheme = localStorage.getItem('theme');
  let currentTheme = savedTheme || (prefersDarkScheme.matches ? 'dark' : 'light');
  
  // Apply the theme on page load
  document.documentElement.setAttribute('data-theme', currentTheme);
  updateThemeIcon(currentTheme);
  
  // Toggle theme when button is clicked
  if (themeToggle) {
    themeToggle.addEventListener('click', function() {
      currentTheme = currentTheme === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', currentTheme);
      localStorage.setItem('theme', currentTheme);
      updateThemeIcon(currentTheme);
    });
  }
}

// Update the theme toggle icon based on current theme
function updateThemeIcon(theme) {
  const themeToggleIcon = document.getElementById('theme-toggle-icon');
  if (!themeToggleIcon) return;
  
  if (theme === 'dark') {
    themeToggleIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
  } else {
    themeToggleIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
  }
}

// Table of Contents functionality
function initTableOfContents() {
  const tocContainer = document.querySelector('.toc-container');
  const tocButton = document.querySelector('.toc-button');
  const tocContent = document.querySelector('.toc-content');
  const scrollTopButton = document.querySelector('.scroll-top-button');
  const currentSectionTitle = document.querySelector('.current-section-title');
  const progressCircle = document.querySelector('.progress-circle-value');
  const header = document.querySelector('header.header'); // More specific selector if possible
  const nextSectionIcon = document.querySelector('.next-section-icon'); // Get the icon again

  if (!tocContainer || !tocButton || !tocContent || !currentSectionTitle) {
    console.log("TOC elements not found, exiting initTableOfContents");
    return;
  }

  const contentArea = document.querySelector('div.single-content'); // Adjust if your content is elsewhere
  if (!contentArea) {
      console.log("Content area not found for TOC headings");
      return;
  }
  const headings = Array.from(contentArea.querySelectorAll('h2, h3, h4, h5, h6')).filter(heading => heading.id);

  if (headings.length === 0) {
    console.log("No headings found for TOC");
    tocContainer.style.display = 'none'; // Hide TOC if no headings
    return;
  }

  headings.sort((a, b) => a.offsetTop - b.offsetTop);

  let activeHeadingId = null;
  let currentHeadingIndex = -1; // Track index of the active heading
  let isScrolling = false; // Flag to prevent scroll updates during programmatic scroll

  // --- TOC Toggle Functionality & Next Section ---
  tocButton.addEventListener('click', (e) => {
    // Check if the click is on the next section icon
    if (nextSectionIcon && nextSectionIcon.contains(e.target)) {
      navigateToNextSection();
    } else if (!e.target.closest('.scroll-top-button')) {
      // Otherwise, toggle TOC if not clicking scroll-to-top
      tocContent.classList.toggle('show');
    }
  });

  // --- Close TOC when clicking outside ---
  document.addEventListener('click', (event) => {
    if (!tocContainer.contains(event.target) && tocContent.classList.contains('show')) {
      tocContent.classList.remove('show');
    }
  });

  const tocLinks = tocContent.querySelectorAll('a');
  tocLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const href = link.getAttribute('href');
      const targetId = href.substring(1);
      const targetElement = document.getElementById(targetId);

      if (targetElement) {
        isScrolling = true; 
        const headerHeight = header ? header.offsetHeight : 0;
        const targetPosition = targetElement.getBoundingClientRect().top + window.scrollY - headerHeight - 10; 

        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });

        // Update URL hash without triggering navigation (pushState is better)
        // history.pushState(null, null, href); // Keep hash update on click only
        // Update active state immediately for responsiveness
        updateActiveLink(targetId);
        currentSectionTitle.textContent = targetElement.textContent;
        // Find and set current index
        currentHeadingIndex = headings.findIndex(h => h.id === targetId);

        tocContent.classList.remove('show');

        setTimeout(() => {
            isScrolling = false;
        }, 1000); 
      }
    });
  });

  if (scrollTopButton) {
    scrollTopButton.addEventListener('click', () => {
      isScrolling = true;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      // Optionally clear hash and active state
      history.pushState(null, null, window.location.pathname + window.location.search);
      updateActiveLink(null);
      currentSectionTitle.textContent = 'فهرست'; // Reset title
      currentHeadingIndex = -1; // Reset index
      // Manually reset progress circle
      if (progressCircle) {
          const circumference = 2 * Math.PI * 18;
          progressCircle.style.strokeDashoffset = circumference; // Reset to empty
      }
      setTimeout(() => {
          isScrolling = false;
      }, 1000);
    });
  }

  // --- Function to Navigate to Next Section ---
  function navigateToNextSection() {
      if (headings.length === 0) return;

      const nextIndex = (currentHeadingIndex + 1) % headings.length;
      const nextHeading = headings[nextIndex];

      if (nextHeading) {
          isScrolling = true;
          const headerHeight = header ? header.offsetHeight : 0;
          const targetPosition = nextHeading.getBoundingClientRect().top + window.scrollY - headerHeight - 10;

          window.scrollTo({ top: targetPosition, behavior: 'smooth' });

          const nextId = nextHeading.id;
          history.pushState(null, null, `#${nextId}`);
          updateActiveLink(nextId);
          currentSectionTitle.textContent = nextHeading.textContent;
          currentHeadingIndex = nextIndex;

          tocContent.classList.remove('show'); // Close TOC if open

          // Clear the isScrolling flag and update scroll-dependent elements
          // after the smooth scroll animation is likely finished.
          setTimeout(() => {
              isScrolling = false;
              handleScroll(); // Manually update progress bar and active heading based on new position
          }, 700); // Adjust timing if scroll feels too slow/fast
      }
  }

  function updateActiveLink(targetId) {
    tocLinks.forEach(link => {
      if (link.getAttribute('href') === `#${targetId}`) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
    activeHeadingId = targetId;
  }

  // --- Update Current Section on Scroll (Throttled) ---
  function handleScroll() {
      if (isScrolling) return; 

      const headerHeight = header ? header.offsetHeight : 0;
      const scrollPosition = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      if (progressCircle) {
          const scrollProgress = Math.max(0, Math.min(1, scrollPosition / (documentHeight - windowHeight)));
          const circumference = 2 * Math.PI * 18; 
          const offset = circumference - (scrollProgress * circumference);
          progressCircle.style.strokeDashoffset = offset;
      }

      let currentHeading = null;
      for (let i = headings.length - 1; i >= 0; i--) {
          const heading = headings[i];
          if (heading.offsetTop <= scrollPosition + headerHeight + 15) { 
              currentHeading = heading;
              break;
          }
      }

      // Also handle if scrolled right to the top
      if (scrollPosition < (headings[0]?.offsetTop - headerHeight - 15 || 10)) {
          currentHeading = null;
      }

      const newActiveId = currentHeading ? currentHeading.id : null;
      currentHeadingIndex = currentHeading ? headings.findIndex(h => h.id === newActiveId) : -1;

      // Only update if the active heading has changed
      if (newActiveId !== activeHeadingId) {
          if (currentHeading) {
              currentSectionTitle.textContent = currentHeading.textContent;
              updateActiveLink(newActiveId);
              // Optionally update hash silently during scroll (can be annoying)
              // history.replaceState(null, null, `#${newActiveId}`);
          } else {
              // Scrolled above the first heading
              currentSectionTitle.textContent = 'فهرست'; // Reset title
              updateActiveLink(null);
              currentHeadingIndex = -1;
              // Optionally clear hash
              // history.replaceState(null, null, window.location.pathname + window.location.search);
          }
      }
  }

  function throttle(func, limit) {
    let lastFunc;
    let lastRan;
    return function(...args) {
      const context = this;
      if (!lastRan) {
        func.apply(context, args);
        lastRan = Date.now();
      } else {
        clearTimeout(lastFunc);
        lastFunc = setTimeout(function() {
          if ((Date.now() - lastRan) >= limit) {
            func.apply(context, args);
            lastRan = Date.now();
          }
        }, limit - (Date.now() - lastRan));
      }
    }
  }

  const throttledScrollHandler = throttle(handleScroll, 100); 
  window.addEventListener('scroll', throttledScrollHandler);

  handleScroll(); 
  if(window.location.hash) {
      const loadId = window.location.hash.substring(1);
      const loadElement = document.getElementById(loadId);
      if (loadElement) {
          setTimeout(() => {
              const headerHeight = header ? header.offsetHeight : 0;
              const loadPosition = loadElement.getBoundingClientRect().top + window.scrollY - headerHeight - 10;
              window.scrollTo({ top: loadPosition, behavior: 'auto' }); 
              isScrolling = true; 
              setTimeout(() => { isScrolling = false; }, 50); 
          }, 100);
      }
  }
}