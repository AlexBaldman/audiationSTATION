/**
 * Section Navigation Fix for AUDIATION STATION
 * Ensures that navigation between different HTML pages works correctly
 * and highlights the active page link in the navigation bar.
 */
export class SectionNavigator {
    constructor() {
        this.navLinks = document.querySelectorAll(".main-nav a, .mobile-nav a");
        this.currentPath = window.location.pathname.split('/').pop();

        this.init();
    }

    init() {
        this.updateActiveLink();
        this.addClickListeners();
    }

    updateActiveLink() {
        this.navLinks.forEach(link => {
            const linkPath = link.getAttribute("href");

            // Remove any existing 'active' class
            link.classList.remove("active");

            // Handle special case for the root/index page
            if ((this.currentPath === "" || this.currentPath === "index.html") && linkPath === "index.html") {
                link.classList.add("active");
            }
            // Handle other pages
            else if (linkPath === this.currentPath) {
                link.classList.add("active");
            }
        });
    }

    addClickListeners() {
        this.navLinks.forEach(link => {
            link.addEventListener("click", (e) => {
                const href = link.getAttribute("href");

                // If it's a different page, let the browser handle it
                if (!href.startsWith("#")) {
                    // Optional: Add a loading indicator or transition effect here
                    return;
                }

                // If it's an in-page anchor link
                e.preventDefault();
                const targetId = href.substring(1);
                const targetElement = document.getElementById(targetId);

                if (targetElement) {
                    window.scrollTo({
                        top: targetElement.offsetTop,
                        behavior: "smooth"
                    });
                }
            });
        });
    }
}
