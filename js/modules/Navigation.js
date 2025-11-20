/**
 * Navigation System - Handles smooth scrolling, active link highlighting, and hamburger menu functionality.
 */
export class Navigation {
    constructor() {
        this.navLinks = document.querySelectorAll(".main-nav a");
        this.hamburgerMenu = document.querySelector(".hamburger-menu");
        this.mainNav = document.querySelector(".main-nav");
        this.isOpen = false;

        this.initEventListeners();
        this.updateActiveLink();
    }

    initEventListeners() {
        if (this.hamburgerMenu) {
            this.hamburgerMenu.addEventListener("click", () => this.toggleMenu());
        }

        this.navLinks.forEach(link => {
            link.addEventListener("click", (e) => {
                if (link.getAttribute("href").startsWith("#")) {
                    e.preventDefault();
                    const targetId = link.getAttribute("href").substring(1);
                    this.navigateToSection(targetId);
                }
                this.closeMenu();
            });
        });
    }

    toggleMenu() {
        if (this.isOpen) {
            this.closeMenu();
        } else {
            this.openMenu();
        }
    }

    openMenu() {
        this.isOpen = true;
        if (this.mainNav) this.mainNav.classList.add("open");
        if (this.hamburgerMenu) this.hamburgerMenu.classList.add("open");
        document.body.style.overflow = 'hidden';
    }

    closeMenu() {
        this.isOpen = false;
        if (this.mainNav) this.mainNav.classList.remove("open");
        if (this.hamburgerMenu) this.hamburgerMenu.classList.remove("open");
        document.body.style.overflow = '';
    }

    navigateToSection(id) {
        const targetSection = document.getElementById(id);
        if (targetSection) {
            window.scrollTo({
                top: targetSection.offsetTop,
                behavior: "smooth"
            });
            history.pushState(null, null, `#${id}`);
        }
    }

    updateActiveLink() {
        const currentPath = window.location.pathname.split('/').pop() || 'index.html';
        this.navLinks.forEach(link => {
            link.classList.remove("active");
            const linkPath = link.getAttribute("href").split('/').pop();
            if (linkPath === currentPath) {
                link.classList.add("active");
            }
        });
    }
}
