/**
 * Ear Training Page Controller
 * Handles UI interactions and coordinates with the EarTraining module
 */

import { Navigation } from '../modules/Navigation.js';
import { EarTraining } from '../modules/EarTraining.js';

export class EarTrainingPage {
    constructor() {
        this.navigation = new Navigation();
        this.earTraining = new EarTraining();
        this.currentExercise = null;
        this.isPlaying = false;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeControls();
        this.hideComingSoonMessage();
    }

    setupEventListeners() {
        // Exercise type buttons
        const exerciseButtons = document.querySelectorAll('.exercise-type-btn');
        exerciseButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                this.selectExerciseType(e.target.dataset.type);
            });
        });

        // Difficulty buttons
        const difficultyButtons = document.querySelectorAll('.difficulty-btn');
        difficultyButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                this.selectDifficulty(e.target.dataset.difficulty);
            });
        });

        // Control buttons
        const playButton = document.getElementById('play-exercise');
        const answerButton = document.getElementById('submit-answer');
        const newExerciseButton = document.getElementById('new-exercise');

        if (playButton) {
            playButton.addEventListener('click', () => this.playExercise());
        }
        if (answerButton) {
            answerButton.addEventListener('click', () => this.submitAnswer());
        }
        if (newExerciseButton) {
            newExerciseButton.addEventListener('click', () => this.generateNewExercise());
        }

        // Answer input
        const answerInput = document.getElementById('answer-input');
        if (answerInput) {
            answerInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.submitAnswer();
                }
            });
        }
    }

    initializeControls() {
        // Set initial exercise type and difficulty
        this.selectExerciseType('interval');
        this.selectDifficulty('easy');
        this.generateNewExercise();
    }

    hideComingSoonMessage() {
        const comingSoonNotice = document.querySelector('.coming-soon-notice');
        if (comingSoonNotice) {
            comingSoonNotice.style.display = 'none';
        }
    }

    selectExerciseType(type) {
        // Update UI
        const buttons = document.querySelectorAll('.exercise-type-btn');
        buttons.forEach(button => {
            button.classList.toggle('active', button.dataset.type === type);
        });

        // Generate new exercise
        this.generateNewExercise();
    }

    selectDifficulty(difficulty) {
        // Update UI
        const buttons = document.querySelectorAll('.difficulty-btn');
        buttons.forEach(button => {
            button.classList.toggle('active', button.dataset.difficulty === difficulty);
        });

        // Generate new exercise
        this.generateNewExercise();
    }

    async generateNewExercise() {
        try {
            const exerciseType = document.querySelector('.exercise-type-btn.active')?.dataset.type || 'interval';
            const difficulty = document.querySelector('.difficulty-btn.active')?.dataset.difficulty || 'easy';
            
            this.currentExercise = this.earTraining.generateExercise(exerciseType, difficulty);
            this.updateExerciseDisplay();
            this.clearAnswer();
        } catch (error) {
            console.error('Failed to generate exercise:', error);
            this.showError('Failed to generate exercise. Please try again.');
        }
    }

    async playExercise() {
        if (this.isPlaying) return;
        
        try {
            this.isPlaying = true;
            this.updatePlayButton('Playing...');
            
            await this.earTraining.playExercise();
            
            // Reset play button after exercise duration
            setTimeout(() => {
                this.isPlaying = false;
                this.updatePlayButton('Play Again');
            }, 2000);
            
        } catch (error) {
            console.error('Failed to play exercise:', error);
            this.showError('Failed to play exercise. Please check your audio settings.');
            this.isPlaying = false;
            this.updatePlayButton('Play');
        }
    }

    submitAnswer() {
        const answerInput = document.getElementById('answer-input');
        if (!answerInput || !answerInput.value.trim()) {
            this.showError('Please enter an answer.');
            return;
        }

        try {
            const result = this.earTraining.validateAnswer(answerInput.value.trim());
            this.showResult(result);
            this.updateScoreDisplay();
            
            if (result.correct) {
                // Generate new exercise after a delay
                setTimeout(() => this.generateNewExercise(), 2000);
            }
            
        } catch (error) {
            console.error('Failed to validate answer:', error);
            this.showError('Failed to validate answer. Please try again.');
        }
    }

    updateExerciseDisplay() {
        const exerciseTypeDisplay = document.getElementById('exercise-type');
        const difficultyDisplay = document.getElementById('exercise-difficulty');
        const exerciseInfo = document.getElementById('exercise-info');
        
        if (exerciseTypeDisplay) {
            exerciseTypeDisplay.textContent = this.currentExercise.type.charAt(0).toUpperCase() + this.currentExercise.type.slice(1);
        }
        
        if (difficultyDisplay) {
            difficultyDisplay.textContent = this.currentExercise.difficulty.charAt(0).toUpperCase() + this.currentExercise.difficulty.slice(1);
        }
        
        if (exerciseInfo) {
            let info = '';
            switch (this.currentExercise.type) {
                case 'interval':
                    info = this.currentExercise.harmonic ? 'Harmonic interval' : 'Melodic interval';
                    break;
                case 'chord':
                    info = `${this.currentExercise.chordType.name} chord`;
                    break;
                case 'rhythm':
                    info = `${this.currentExercise.meter} meter at ${this.currentExercise.tempo} BPM`;
                    break;
                case 'melody':
                    info = `Melody in ${this.currentExercise.key}`;
                    break;
            }
            exerciseInfo.textContent = info;
        }
    }

    updatePlayButton(text) {
        const playButton = document.getElementById('play-exercise');
        if (playButton) {
            playButton.textContent = text;
            playButton.disabled = this.isPlaying;
        }
    }

    clearAnswer() {
        const answerInput = document.getElementById('answer-input');
        if (answerInput) {
            answerInput.value = '';
            answerInput.focus();
        }
        
        // Clear previous result
        const resultDisplay = document.getElementById('result-display');
        if (resultDisplay) {
            resultDisplay.textContent = '';
            resultDisplay.className = 'result-display';
        }
    }

    showResult(result) {
        const resultDisplay = document.getElementById('result-display');
        if (!resultDisplay) return;
        
        resultDisplay.textContent = result.correct ? '✓ Correct!' : `✗ Incorrect. The answer was: ${result.correctAnswer}`;
        resultDisplay.className = `result-display ${result.correct ? 'correct' : 'incorrect'}`;
        
        // Clear answer input
        const answerInput = document.getElementById('answer-input');
        if (answerInput) {
            answerInput.value = '';
        }
    }

    updateScoreDisplay() {
        const progress = this.earTraining.getProgress();
        const scoreDisplay = document.getElementById('score-display');
        const accuracyDisplay = document.getElementById('accuracy-display');
        
        if (scoreDisplay) {
            scoreDisplay.textContent = `${progress.score}/${progress.totalAttempts}`;
        }
        
        if (accuracyDisplay) {
            accuracyDisplay.textContent = `${progress.accuracy}%`;
        }
    }

    showError(message) {
        const errorDisplay = document.getElementById('error-display');
        if (errorDisplay) {
            errorDisplay.textContent = message;
            errorDisplay.style.display = 'block';
            
            // Hide after 3 seconds
            setTimeout(() => {
                errorDisplay.style.display = 'none';
            }, 3000);
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new EarTrainingPage();
});
