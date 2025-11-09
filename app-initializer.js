/**
 * App Initializer - Handles audio context initialization and permissions
 */

class AppInitializer {
    constructor() {
        this.audioContext = null;
        this.isInitialized = false;
        this.initMessage = document.getElementById("app-init-message");
        
        this.init();
    }

    async init() {
        this.showInitMessage();
        
        try {
            await this.requestAudioPermissions();
            await this.initializeAudioContext();
            this.isInitialized = true;
        } catch (error) {
            console.error("Initialization error:", error);
        } finally {
            // Ensure the message is hidden after a short delay, regardless of success or failure
            setTimeout(() => {
                this.hideInitMessage();
            }, 1000); // Hide after 1 second
        }
    }

    showInitMessage() {
        if (this.initMessage) {
            this.initMessage.style.display = "flex";
        }
    }

    hideInitMessage() {
        if (this.initMessage) {
            this.initMessage.style.display = "none";
        }
    }

    async requestAudioPermissions() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Stop the stream immediately, we just needed permission
            stream.getTracks().forEach(track => track.stop());
            return true;
        } catch (error) {
            console.warn("Audio permission denied:", error);
            return false;
        }
    }

    async initializeAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Resume audio context if it's suspended
            if (this.audioContext.state === "suspended") {
                await this.audioContext.resume();
            }
            
            return true;
        } catch (error) {
            console.error("Audio context initialization failed:", error);
            return false;
        }
    }

    getAudioContext() {
        return this.audioContext;
    }
}

// Initialize immediately
window.appInitializer = new AppInitializer();


