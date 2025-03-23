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
  const tocButton = document.querySelector('.toc-button');
  const tocContent = document.querySelector('.toc-content');
  const nextSectionIcon = document.querySelector('.next-section-icon');
  const scrollTopButton = document.querySelector('.scroll-top-button');
  const currentSectionTitle = document.querySelector('.current-section-title');
  const progressCircle = document.querySelector('.progress-circle-value');
  
  if (!tocButton || !tocContent) return;
  
  // Get all headings in the content
  const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).filter(heading => {
    // Filter out headings that are in the TOC or header
    return !heading.closest('.toc-content') && !heading.closest('header');
  });
  
  // Sort headings by their position in the document
  headings.sort((a, b) => {
    return a.getBoundingClientRect().top - b.getBoundingClientRect().top;
  });
  
  // TOC toggle functionality
  tocButton.addEventListener('click', (e) => {
    // If clicking on the next section icon, navigate to next section
    if (e.target.closest('.next-section-icon') || e.target.closest('polyline') || e.target.closest('line')) {
      navigateToNextSection();
    } else {
      // Otherwise toggle TOC
      tocContent.classList.toggle('show');
    }
  });
  
  // Function to navigate to the next section
  function navigateToNextSection() {
    const currentPosition = window.scrollY + 100; // Add offset to account for sticky header
    let nextHeading = null;
    
    // Find the next heading
    for (const heading of headings) {
      if (heading.getBoundingClientRect().top > 100) { // 100px from the top of the viewport
        nextHeading = heading;
        break;
      }
    }
    
    // If no next heading found, go to the first one
    if (!nextHeading && headings.length > 0) {
      nextHeading = headings[0];
    }
    
    if (nextHeading) {
      nextHeading.scrollIntoView({ behavior: 'smooth' });
    }
  }
  
  // Close TOC when clicking outside
  document.addEventListener('click', (event) => {
    const isClickInside = tocButton.contains(event.target) || tocContent.contains(event.target);
    if (!isClickInside && tocContent.classList.contains('show')) {
      tocContent.classList.remove('show');
    }
  });
  
  // Add smooth scrolling to TOC links
  const tocLinks = tocContent.getElementsByTagName('a');
  Array.from(tocLinks).forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href');
      const targetElement = document.querySelector(targetId);
      
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth' });
        tocContent.classList.remove('show');
      }
    });
  });
  
  // Scroll to top functionality
  if (scrollTopButton) {
    scrollTopButton.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
  
  // Update current section and progress indicator on scroll
  function updateCurrentSection() {
    if (!currentSectionTitle || headings.length === 0) return;
    
    const scrollPosition = window.scrollY;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    
    // Calculate scroll progress (0 to 1)
    const scrollProgress = scrollPosition / (documentHeight - windowHeight);
    
    // Update progress circle
    if (progressCircle) {
      const circumference = 2 * Math.PI * 18; // 2πr where r=18 (from the SVG)
      const offset = circumference - (scrollProgress * circumference);
      progressCircle.style.strokeDashoffset = offset;
    }
    
    // Find current section
    let currentHeading = headings[0];
    for (let i = 0; i < headings.length; i++) {
      const heading = headings[i];
      const headingTop = heading.getBoundingClientRect().top + window.scrollY;
      
      if (headingTop - 100 <= scrollPosition) {
        currentHeading = heading;
      } else {
        break;
      }
    }
    
    // Update current section title
    if (currentHeading) {
      currentSectionTitle.textContent = currentHeading.textContent;
      
      // Update active class in TOC
      const tocLinks = tocContent.querySelectorAll('a');
      tocLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${currentHeading.id}`) {
          link.classList.add('active');
        }
      });
    }
  }
  
  // Initial update
  updateCurrentSection();
  
  // Update on scroll
  window.addEventListener('scroll', updateCurrentSection);
}