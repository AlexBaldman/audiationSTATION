/** Ear Rational: the listening room inside Audiation Station. */
import { Navigation } from '../modules/Navigation.js';
import { EarTraining } from '../modules/EarTraining.js';

export class EarTrainingPage {
    constructor() {
        this.navigation = new Navigation();
        this.earTraining = new EarTraining();
        this.type = 'interval';
        this.difficulty = 'easy';
        this.playbackId = 0;
        this.playing = false;
        this.heard = false;
        document.querySelectorAll('.exercise-type-btn').forEach(button => {
            button.addEventListener('click', () => {
                this.type = button.dataset.type;
                this.generateNewExercise();
            });
        });
        document.querySelectorAll('.difficulty-btn').forEach(button => {
            button.addEventListener('click', () => {
                this.difficulty = button.dataset.difficulty;
                this.generateNewExercise();
            });
        });
        this.element('play-exercise').addEventListener('click', () => this.playExercise());
        this.element('new-exercise').addEventListener('click', () => this.generateNewExercise());
        this.element('submit-answer').addEventListener('click', () => this.submitAnswer());
        this.element('answer-input').addEventListener('keydown', event => {
            if (event.key === 'Enter') this.submitAnswer();
        });
        window.addEventListener('pagehide', () => {
            this.playbackId++;
            this.earTraining.stopPlayback();
        });
        this.generateNewExercise();
        this.updateScoreDisplay();
    }

    element(id) { return document.getElementById(id); }

    generateNewExercise() {
        this.playbackId++;
        this.playing = false;
        this.heard = false;
        this.currentExercise = this.earTraining.generateExercise(this.type, this.difficulty);
        for (const [selector, key, value] of [
            ['.exercise-type-btn', 'type', this.type],
            ['.difficulty-btn', 'difficulty', this.difficulty]
        ]) {
            document.querySelectorAll(selector).forEach(button => {
                const active = button.dataset[key] === value;
                button.classList.toggle('active', active);
                button.setAttribute('aria-pressed', String(active));
            });
        }
        this.element('exercise-type').textContent = this.type;
        this.element('exercise-difficulty').textContent = this.difficulty;
        const exercise = this.currentExercise;
        const instructions = {
            interval: exercise.harmonic ? 'Two notes together. What is the interval?' : 'Two notes in sequence. What is the interval?',
            chord: 'Listen to the chord. Which quality do you hear?',
            rhythm: `${exercise.meter} at ${exercise.tempo} BPM. Enter x for each hit and - for each rest. ${exercise.rhythm?.length} slots; ${exercise.stepBeats} quarter-note beats per slot.`,
            melody: `Key of ${exercise.key}. Enter scale degrees 1–8 in order (1 = tonic, 8 = upper tonic). ${exercise.melody?.length} notes.`
        };
        this.element('exercise-info').textContent = instructions[this.type];
        this.element('play-exercise').textContent = 'Listen';
        this.element('play-exercise').disabled = false;
        this.element('answer-input').value = '';
        this.element('answer-input').placeholder = this.type === 'rhythm' ? 'e.g. x - x x' : 'e.g. 1 3 5 1';
        this.element('answer-input').disabled = true;
        this.element('answer-input').parentElement.hidden = !['rhythm', 'melody'].includes(this.type);
        const result = this.element('result-display');
        result.textContent = 'Listen first, then choose your answer. Replay as often as you like.';
        result.className = 'result-display';
        this.element('error-display').style.display = 'none';
        const choices = this.element('answer-choices');
        choices.replaceChildren();
        const options = this.type === 'interval' ? this.earTraining.getIntervalsForDifficulty(this.difficulty)
            : this.type === 'chord' ? this.earTraining.getChordsForDifficulty(this.difficulty) : [];
        options.forEach(option => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'control-button secondary';
            button.textContent = option.name;
            button.disabled = true;
            button.addEventListener('click', () => this.submitAnswer(option.name));
            choices.append(button);
        });
    }

    setAnswerEnabled(enabled) {
        this.element('answer-input').disabled = !enabled;
        this.element('submit-answer').disabled = !enabled;
        this.element('answer-choices').querySelectorAll('button').forEach(button => { button.disabled = !enabled; });
    }

    async playExercise() {
        if (this.playing) return;
        const id = ++this.playbackId;
        this.playing = true;
        this.element('play-exercise').disabled = true;
        this.element('play-exercise').textContent = 'Listening…';
        try {
            await this.earTraining.playExercise();
            if (id !== this.playbackId) return;
            setTimeout(() => {
                if (id !== this.playbackId) return;
                this.playing = false;
                this.heard = true;
                this.element('play-exercise').disabled = false;
                this.element('play-exercise').textContent = 'Replay';
                this.setAnswerEnabled(!this.earTraining.answered);
            }, this.earTraining.getExerciseDuration() * 1000 + 100);
        } catch (error) {
            if (id !== this.playbackId) return;
            this.playing = false;
            this.element('play-exercise').disabled = false;
            this.element('play-exercise').textContent = 'Try audio again';
            this.showError(error.message);
        }
    }

    submitAnswer(choice) {
        if (!this.heard || this.earTraining.answered) return;
        let answer = choice || this.element('answer-input').value.trim();
        if (!answer) return this.showError('Enter your answer first.');
        answer = answer.replace(/\s+/g, ' ');
        const result = this.earTraining.validateAnswer(answer);
        this.element('result-display').textContent = result.correct
            ? '✓ Correct. Replay to hear it again, or choose New Exercise.'
            : `The answer is ${result.correctAnswer}. Replay and listen for the difference, then choose New Exercise.`;
        this.element('result-display').className = `result-display ${result.correct ? 'correct' : 'incorrect'}`;
        this.setAnswerEnabled(false);
        this.updateScoreDisplay();
    }

    updateScoreDisplay() {
        const progress = this.earTraining.getProgress();
        this.element('score-display').textContent = `${progress.score}/${progress.totalAttempts}`;
        this.element('accuracy-display').textContent = `${progress.accuracy}%`;
    }

    showError(message) {
        this.element('error-display').textContent = message;
        this.element('error-display').style.display = 'block';
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new EarTrainingPage(), { once: true });
} else {
    new EarTrainingPage();
}
