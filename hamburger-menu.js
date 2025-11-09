/**
 * Hamburger Menu - Enhanced navigation functionality
 */

class HamburgerMenu {
    constructor() {
        this.hamburgerBtn = document.getElementById('hamburger-menu');
        this.nav = document.getElementById('main-nav');
        this.navOverlay = document.getElementById('nav-overlay');
        this.navLinks = document.querySelectorAll('.nav-link');
        this.isOpen = false;
        
        this.init();
    }

    init() {
        if (!this.hamburgerBtn || !this.nav || !this.navOverlay) {
            console.warn('Hamburger menu elements not found');
            return;
        }

        // Hamburger button click
        this.hamburgerBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggle();
        });

        // Overlay click to close
        this.navOverlay.addEventListener('click', () => {
            this.close();
        });

        // Navigation link clicks
        this.navLinks.forEach(link => {
            link.addEventListener('click', () => {
                this.close();
            });
        });

        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768 && this.isOpen) {
                this.close();
            }
        });

        // Set initial active link
        this.setActiveLink();
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    open() {
        this.isOpen = true;
        this.hamburgerBtn.classList.add('open');
        this.nav.classList.add('open');
        this.navOverlay.classList.add('open');
        
        // Prevent body scroll when menu is open
        document.body.style.overflow = 'hidden';
        
        // Add staggered animation to nav items
        this.animateNavItems();
    }

    close() {
        this.isOpen = false;
        this.hamburgerBtn.classList.remove('open');
        this.nav.classList.remove('open');
        this.navOverlay.classList.remove('open');
        
        // Restore body scroll
        document.body.style.overflow = '';
    }

    animateNavItems() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach((item, index) => {
            item.style.opacity = '0';
            item.style.transform = 'translateX(20px)';
            
            setTimeout(() => {
                item.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                item.style.opacity = '1';
                item.style.transform = 'translateX(0)';
            }, index * 50);
        });
    }

    setActiveLink() {
        const currentPath = window.location.pathname.split('/').pop() || 'index.html';
        
        this.navLinks.forEach(link => {
            link.classList.remove('active');
            const linkPath = link.getAttribute('href');
            
            if (linkPath === currentPath || 
                (currentPath === '' && linkPath === 'index.html') ||
                (currentPath === 'index.html' && linkPath === 'index.html')) {
                link.classList.add('active');
            }
        });
    }

    // Add hover animations to nav icons
    addHoverAnimations() {
        const navIcons = document.querySelectorAll('.nav-icon');
        
        navIcons.forEach(icon => {
            icon.addEventListener('mouseenter', () => {
                icon.style.transform = 'scale(1.2) rotate(10deg)';
                icon.style.transition = 'transform 0.2s ease';
            });
            
            icon.addEventListener('mouseleave', () => {
                icon.style.transform = 'scale(1) rotate(0deg)';
            });
            
            // Touch events for mobile
            icon.addEventListener('touchstart', () => {
                icon.style.transform = 'scale(1.1)';
            });
            
            icon.addEventListener('touchend', () => {
                setTimeout(() => {
                    icon.style.transform = 'scale(1)';
                }, 150);
            });
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.hamburgerMenu = new HamburgerMenu();
    
    // Add hover animations after a short delay
    setTimeout(() => {
        if (window.hamburgerMenu) {
            window.hamburgerMenu.addHoverAnimations();
        }
    }, 100);
});

