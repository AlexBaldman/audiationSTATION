/**
 * Ear Training Page Controller
 * Handles UI interactions and coordinates with the EarTraining module
 */

import { Navigation } from '../modules/Navigation.js';

export class EarTrainingPage {
    constructor() {
        this.navigation = new Navigation();
        this.currentExercise = null;
        this.isPlaying = false;
        this.score = 0;
        this.totalAttempts = 0;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.showComingSoonMessage();
    }

    setupEventListeners() {
        // Future: Add event listeners for exercise controls
        // For now, just handle navigation
    }

    showComingSoonMessage() {
        const comingSoonNotice = document.querySelector('.coming-soon-notice');
        if (comingSoonNotice) {
            // Add subtle animation to draw attention
            comingSoonNotice.style.animation = 'pulse 2s infinite';
        }
    }

    // Placeholder methods for future implementation
    startExercise(type) {
        console.log(`Starting ${type} exercise - Coming Soon!`);
        // Future: Initialize exercise type and start audio playback
    }

    submitAnswer(answer) {
        console.log(`Answer submitted: ${answer} - Coming Soon!`);
        // Future: Validate answer and update score
    }

    playExample() {
        console.log('Playing example - Coming Soon!');
        // Future: Play audio example for current exercise
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new EarTrainingPage();
});
