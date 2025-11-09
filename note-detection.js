/**
 * Note Detection - Real-time musical note recognition
 */

class NoteDetector {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        this.dataArray = null;
        this.isListening = false;
        this.noteDisplay = document.getElementById('note-name');
        this.frequencyDisplay = document.getElementById('frequency-value');
        this.startBtn = document.querySelector('.start-btn');
        this.resetBtn = document.querySelector('.reset-btn');
        
        this.noteFrequencies = {
            'C': 261.63, 'C#': 277.18, 'D': 293.66, 'D#': 311.13,
            'E': 329.63, 'F': 349.23, 'F#': 369.99, 'G': 392.00,
            'G#': 415.30, 'A': 440.00, 'A#': 466.16, 'B': 493.88
        };
        
        this.init();
    }

    init() {
        if (this.startBtn) {
            this.startBtn.addEventListener('click', () => this.toggleListening());
        }
        if (this.resetBtn) {
            this.resetBtn.addEventListener('click', () => this.reset());
        }
    }

    async toggleListening() {
        if (!this.isListening) {
            await this.startListening();
        } else {
            this.stopListening();
        }
    }

    async startListening() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.microphone = this.audioContext.createMediaStreamSource(stream);
            
            this.analyser.fftSize = 4096;
            this.analyser.smoothingTimeConstant = 0.8;
            this.dataArray = new Float32Array(this.analyser.frequencyBinCount);
            
            this.microphone.connect(this.analyser);
            
            this.isListening = true;
            if (this.startBtn) this.startBtn.textContent = 'STOP';
            
            this.detectNote();
        } catch (error) {
            console.error('Error accessing microphone:', error);
            this.updateDisplay('Error', 'Mic access denied');
        }
    }

    stopListening() {
        this.isListening = false;
        if (this.startBtn) this.startBtn.textContent = 'START';
        
        if (this.microphone) {
            this.microphone.disconnect();
        }
        if (this.audioContext) {
            this.audioContext.close();
        }
    }

    detectNote() {
        if (!this.isListening) return;
        
        this.analyser.getFloatFrequencyData(this.dataArray);
        
        const frequency = this.findFundamentalFrequency();
        if (frequency > 80 && frequency < 2000) {
            const note = this.frequencyToNote(frequency);
            this.updateDisplay(note, frequency.toFixed(2) + ' Hz');
        } else {
            this.updateDisplay('-', 'Listening...');
        }
        
        requestAnimationFrame(() => this.detectNote());
    }

    findFundamentalFrequency() {
        let maxIndex = 0;
        let maxValue = -Infinity;
        
        for (let i = 0; i < this.dataArray.length; i++) {
            if (this.dataArray[i] > maxValue) {
                maxValue = this.dataArray[i];
                maxIndex = i;
            }
        }
        
        const nyquist = this.audioContext.sampleRate / 2;
        return (maxIndex * nyquist) / this.dataArray.length;
    }

    frequencyToNote(frequency) {
        let closestNote = 'C';
        let minDiff = Infinity;
        
        for (const [note, freq] of Object.entries(this.noteFrequencies)) {
            const diff = Math.abs(frequency - freq);
            if (diff < minDiff) {
                minDiff = diff;
                closestNote = note;
            }
        }
        
        return closestNote;
    }

    updateDisplay(note, frequency) {
        if (this.noteDisplay) this.noteDisplay.textContent = note;
        if (this.frequencyDisplay) this.frequencyDisplay.textContent = frequency;
    }

    reset() {
        this.stopListening();
        this.updateDisplay('-', 'Ready');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.noteDetector = new NoteDetector();
});

