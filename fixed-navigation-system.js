/**
 * AUDIATION STATION - Fixed Navigation System
 * Handles smooth scrolling, active link highlighting, and hamburger menu functionality.
 */

class FixedNavigation {
    constructor() {
        this.navLinks = document.querySelectorAll("#main-nav .nav-link");
        this.hamburgerMenu = document.getElementById("hamburger-menu");
        this.mainNav = document.getElementById("main-nav");
        this.navOverlay = document.getElementById("nav-overlay");

        this.initEventListeners();
        this.updateActiveLink();
    }

    initEventListeners() {
        this.hamburgerMenu.addEventListener("click", () => this.toggleMenu());
        this.navOverlay.addEventListener("click", () => this.closeMenu());

        this.navLinks.forEach(link => {
            link.addEventListener("click", (e) => {
                // Prevent default behavior only if it's an internal link (hash)
                if (link.getAttribute("href").startsWith("#")) {
                    e.preventDefault();
                    const targetId = link.getAttribute("href").substring(1);
                    this.navigateToSection(targetId);
                }
                this.closeMenu();
            });
        });

        // No longer need scroll event listener for active link on single-page sections
        // window.addEventListener("scroll", () => this.updateActiveLink());
    }

    toggleMenu() {
        this.mainNav.classList.toggle("open");
        this.navOverlay.classList.toggle("open");
        this.hamburgerMenu.classList.toggle("open");
    }

    closeMenu() {
        this.mainNav.classList.remove("open");
        this.navOverlay.classList.remove("open");
        this.hamburgerMenu.classList.remove("open");
    }

    // This function is now primarily for internal page navigation (e.g., on index.html)
    navigateToSection(id) {
        const targetSection = document.getElementById(id);
        if (targetSection) {
            window.scrollTo({
                top: targetSection.offsetTop,
                behavior: "smooth"
            });
            // Update URL hash without triggering scroll
            history.pushState(null, null, `#${id}`);
        }
    }

    updateActiveLink() {
        const currentPath = window.location.pathname.split('/').pop();
        this.navLinks.forEach(link => {
            link.classList.remove("active");
            const linkPath = link.getAttribute("href");
            if (linkPath === currentPath || (currentPath === "" && linkPath === "index.html")) {
                link.classList.add("active");
            }
        });
    }
}

document.addEventListener("DOMContentLoaded", () => {
    window.fixedNav = new FixedNavigation();
});


