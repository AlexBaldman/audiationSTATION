/**
 * Ear Training Module
 * Provides comprehensive ear training exercises with audio generation and validation
 */

export class EarTraining {
    constructor(options = {}) {
        this.audioContext = null;
        this.currentExercise = null;
        this.score = 0;
        this.totalAttempts = 0;
        this.progress = new Map();
        this.difficulty = 'easy';
        this.exerciseType = 'interval';
        
        this.options = {
            tempo: 120,
            volume: 0.5,
            ...options
        };
        
        this.init();
    }

    async init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log('EarTraining: AudioContext initialized');
        } catch (error) {
            console.error('EarTraining: Failed to initialize AudioContext:', error);
        }
    }

    /**
     * Generate a new exercise based on type and difficulty
     */
    generateExercise(type = 'interval', difficulty = 'easy') {
        this.exerciseType = type;
        this.difficulty = difficulty;
        
        const exerciseGenerators = {
            interval: () => this.generateIntervalExercise(difficulty),
            chord: () => this.generateChordExercise(difficulty),
            rhythm: () => this.generateRhythmExercise(difficulty),
            melody: () => this.generateMelodyExercise(difficulty)
        };
        
        const generator = exerciseGenerators[type];
        if (!generator) {
            throw new Error(`Unknown exercise type: ${type}`);
        }
        
        this.currentExercise = generator();
        return this.currentExercise;
    }

    /**
     * Generate interval recognition exercise
     */
    generateIntervalExercise(difficulty) {
        const intervals = this.getIntervalsForDifficulty(difficulty);
        const startNote = this.getRandomNote();
        const interval = intervals[Math.floor(Math.random() * intervals.length)];
        const endNote = this.applyInterval(startNote, interval);
        
        return {
            type: 'interval',
            difficulty,
            startNote,
            endNote,
            interval,
            answer: interval.name,
            harmonic: Math.random() > 0.5 // 50% chance of harmonic vs melodic
        };
    }

    /**
     * Generate chord identification exercise
     */
    generateChordExercise(difficulty) {
        const chords = this.getChordsForDifficulty(difficulty);
        const root = this.getRandomNote();
        const chordType = chords[Math.floor(Math.random() * chords.length)];
        const chord = this.buildChord(root, chordType);
        
        return {
            type: 'chord',
            difficulty,
            root,
            chordType,
            chord,
            answer: chordType.name
        };
    }

    /**
     * Generate rhythm training exercise
     */
    generateRhythmExercise(difficulty) {
        const meters = this.getMetersForDifficulty(difficulty);
        const meter = meters[Math.floor(Math.random() * meters.length)];
        const rhythm = this.generateRhythmPattern(meter, difficulty);
        
        return {
            type: 'rhythm',
            difficulty,
            meter,
            rhythm,
            answer: this.rhythmToString(rhythm),
            tempo: this.options.tempo
        };
    }

    /**
     * Generate melodic dictation exercise
     */
    generateMelodyExercise(difficulty) {
        const key = this.getRandomKey();
        const melody = this.generateMelody(key, difficulty);
        
        return {
            type: 'melody',
            difficulty,
            key,
            melody,
            answer: this.melodyToString(melody)
        };
    }

    /**
     * Play the current exercise audio
     */
    async playExercise() {
        if (!this.audioContext) {
            throw new Error('AudioContext not initialized');
        }
        
        if (!this.currentExercise) {
            throw new Error('No exercise to play');
        }

        // Resume audio context if suspended
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }

        const players = {
            interval: () => this.playIntervalExercise(),
            chord: () => this.playChordExercise(),
            rhythm: () => this.playRhythmExercise(),
            melody: () => this.playMelodyExercise()
        };

        const player = players[this.currentExercise.type];
        if (!player) {
            throw new Error(`No player for exercise type: ${this.currentExercise.type}`);
        }

        return player();
    }

    /**
     * Play interval exercise
     */
    async playIntervalExercise() {
        const { startNote, endNote, harmonic } = this.currentExercise;
        const now = this.audioContext.currentTime;
        
        if (harmonic) {
            // Play both notes simultaneously
            this.playNote(startNote.frequency, now, 1.0);
            this.playNote(endNote.frequency, now, 1.0);
        } else {
            // Play notes sequentially
            this.playNote(startNote.frequency, now, 0.5);
            this.playNote(endNote.frequency, now + 0.5, 0.5);
        }
    }

    /**
     * Play chord exercise
     */
    async playChordExercise() {
        const { chord } = this.currentExercise;
        const now = this.audioContext.currentTime;
        
        chord.forEach(note => {
            this.playNote(note.frequency, now, 1.0);
        });
    }

    /**
     * Play rhythm exercise
     */
    async playRhythmExercise() {
        const { rhythm, tempo } = this.currentExercise;
        const beatDuration = 60 / tempo;
        const now = this.audioContext.currentTime;
        
        rhythm.forEach((beat, index) => {
            if (beat > 0) {
                this.playNote(440, now + (index * beatDuration), 0.1); // Use A440 for rhythm
            }
        });
    }

    /**
     * Play melodic exercise
     */
    async playMelodyExercise() {
        const { melody, tempo } = this.currentExercise;
        const noteDuration = 60 / tempo;
        const now = this.audioContext.currentTime;
        
        melody.forEach((note, index) => {
            if (note.frequency) {
                this.playNote(note.frequency, now + (index * noteDuration), noteDuration);
            }
        });
    }

    /**
     * Play a single note
     */
    playNote(frequency, startTime, duration) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        
        // Apply envelope
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(this.options.volume, startTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
    }

    /**
     * Validate user's answer
     */
    validateAnswer(userAnswer) {
        if (!this.currentExercise) {
            throw new Error('No exercise to validate');
        }
        
        this.totalAttempts++;
        const isCorrect = this.compareAnswers(userAnswer, this.currentExercise.answer);
        
        if (isCorrect) {
            this.score++;
            this.updateProgress(true);
        } else {
            this.updateProgress(false);
        }
        
        return {
            correct: isCorrect,
            userAnswer,
            correctAnswer: this.currentExercise.answer,
            score: this.score,
            totalAttempts: this.totalAttempts
        };
    }

    /**
     * Compare user answer with correct answer
     */
    compareAnswers(userAnswer, correctAnswer) {
        // Normalize answers for comparison
        const normalize = (answer) => answer.toLowerCase().trim();
        return normalize(userAnswer) === normalize(correctAnswer);
    }

    /**
     * Update progress tracking
     */
    updateProgress(correct) {
        const key = `${this.exerciseType}_${this.difficulty}`;
        const current = this.progress.get(key) || { correct: 0, total: 0 };
        
        current.total++;
        if (correct) current.correct++;
        
        this.progress.set(key, current);
    }

    /**
     * Get progress statistics
     */
    getProgress() {
        return {
            score: this.score,
            totalAttempts: this.totalAttempts,
            accuracy: this.totalAttempts > 0 ? (this.score / this.totalAttempts * 100).toFixed(1) : 0,
            progress: Object.fromEntries(this.progress)
        };
    }

    /**
     * Helper methods for exercise generation
     */
    getIntervalsForDifficulty(difficulty) {
        const intervals = {
            easy: [
                { name: 'unison', semitones: 0 },
                { name: 'major 2nd', semitones: 2 },
                { name: 'major 3rd', semitones: 4 },
                { name: 'perfect 4th', semitones: 5 },
                { name: 'perfect 5th', semitones: 7 }
            ],
            medium: [
                ...this.getIntervalsForDifficulty('easy'),
                { name: 'minor 2nd', semitones: 1 },
                { name: 'minor 3rd', semitones: 3 },
                { name: 'tritone', semitones: 6 },
                { name: 'major 6th', semitones: 9 },
                { name: 'minor 6th', semitones: 8 }
            ],
            hard: [
                ...this.getIntervalsForDifficulty('medium'),
                { name: 'minor 7th', semitones: 10 },
                { name: 'major 7th', semitones: 11 },
                { name: 'octave', semitones: 12 },
                { name: 'minor 9th', semitones: 13 },
                { name: 'major 9th', semitones: 14 }
            ]
        };
        
        return intervals[difficulty] || intervals.easy;
    }

    getChordsForDifficulty(difficulty) {
        const chords = {
            easy: [
                { name: 'major', intervals: [0, 4, 7] },
                { name: 'minor', intervals: [0, 3, 7] }
            ],
            medium: [
                ...this.getChordsForDifficulty('easy'),
                { name: 'diminished', intervals: [0, 3, 6] },
                { name: 'augmented', intervals: [0, 4, 8] }
            ],
            hard: [
                ...this.getChordsForDifficulty('medium'),
                { name: 'major 7th', intervals: [0, 4, 7, 11] },
                { name: 'minor 7th', intervals: [0, 3, 7, 10] },
                { name: 'dominant 7th', intervals: [0, 4, 7, 10] }
            ]
        };
        
        return chords[difficulty] || chords.easy;
    }

    getMetersForDifficulty(difficulty) {
        const meters = {
            easy: ['4/4', '3/4'],
            medium: ['4/4', '3/4', '2/4', '6/8'],
            hard: ['4/4', '3/4', '2/4', '6/8', '5/4', '7/8']
        };
        
        return meters[difficulty] || meters.easy;
    }

    getRandomNote() {
        const notes = [
            { name: 'C', frequency: 261.63 },
            { name: 'D', frequency: 293.66 },
            { name: 'E', frequency: 329.63 },
            { name: 'F', frequency: 349.23 },
            { name: 'G', frequency: 392.00 },
            { name: 'A', frequency: 440.00 },
            { name: 'B', frequency: 493.88 }
        ];
        
        return notes[Math.floor(Math.random() * notes.length)];
    }

    applyInterval(note, interval) {
        const frequencyRatio = Math.pow(2, interval.semitones / 12);
        return {
            name: note.name,
            frequency: note.frequency * frequencyRatio
        };
    }

    buildChord(root, chordType) {
        return chordType.intervals.map((semitone, index) => {
            const frequencyRatio = Math.pow(2, semitone / 12);
            return {
                name: this.getNoteName(root.frequency * frequencyRatio),
                frequency: root.frequency * frequencyRatio
            };
        });
    }

    generateRhythmPattern(meter, difficulty) {
        const [beatsPerMeasure, beatUnit] = meter.split('/').map(Number);
        const pattern = [];
        
        for (let i = 0; i < beatsPerMeasure; i++) {
            if (difficulty === 'easy') {
                pattern.push(Math.random() > 0.3 ? 1 : 0); // 70% chance of note
            } else if (difficulty === 'medium') {
                pattern.push(Math.random() > 0.2 ? 1 : 0); // 80% chance of note
            } else {
                // Hard: include subdivisions
                if (Math.random() > 0.5) {
                    pattern.push(1, 0.5); // Eighth note pattern
                    i += 0.5;
                } else {
                    pattern.push(1);
                }
            }
        }
        
        return pattern;
    }

    getRandomKey() {
        const keys = ['C', 'G', 'D', 'A', 'E', 'F', 'Bb', 'Eb'];
        return keys[Math.floor(Math.random() * keys.length)];
    }

    generateMelody(key, difficulty) {
        const melodyLength = difficulty === 'easy' ? 4 : difficulty === 'medium' ? 6 : 8;
        const melody = [];
        const scale = this.getScaleNotes(key);
        
        for (let i = 0; i < melodyLength; i++) {
            const noteIndex = Math.floor(Math.random() * scale.length);
            melody.push(scale[noteIndex]);
        }
        
        return melody;
    }

    getScaleNotes(key) {
        const scales = {
            'C': [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25],
            'G': [392.00, 440.00, 493.88, 523.25, 587.33, 659.25, 739.99, 783.99],
            'D': [293.66, 329.63, 369.99, 392.00, 440.00, 493.88, 554.37, 587.33],
            'A': [440.00, 493.88, 554.37, 587.33, 659.25, 739.99, 830.61, 880.00],
            'E': [329.63, 369.99, 415.30, 440.00, 493.88, 554.37, 622.25, 659.25],
            'F': [349.23, 392.00, 440.00, 466.16, 523.25, 587.33, 659.25, 698.46],
            'Bb': [233.08, 261.63, 293.66, 311.13, 349.23, 392.00, 440.00, 466.16],
            'Eb': [311.13, 349.23, 392.00, 415.30, 466.16, 523.25, 587.33, 622.25]
        };
        
        return scales[key] || scales.C;
    }

    getNoteName(frequency) {
        // Simple note name calculation (could be improved)
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const A4 = 440;
        const semitonesFromA4 = 12 * Math.log2(frequency / A4);
        const noteIndex = Math.round(semitonesFromA4 + 9) % 12;
        return noteNames[(noteIndex + 12) % 12];
    }

    rhythmToString(rhythm) {
        return rhythm.map(beat => beat > 0 ? 'x' : '-').join(' ');
    }

    melodyToString(melody) {
        return melody.map(note => note.name || 'rest').join(' ');
    }

    /**
     * Cleanup resources
     */
    dispose() {
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }
}
