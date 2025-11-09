/**
 * Beatbox Mode - Interactive beat creation
 */

class BeatboxMode {
    constructor() {
        this.audioContext = null;
        this.sounds = {};
        this.pads = document.querySelectorAll('.beatbox-pad');
        
        this.init();
    }

    init() {
        this.setupAudioContext();
        this.setupPads();
        this.loadSounds();
    }

    setupAudioContext() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    setupPads() {
        this.pads.forEach((pad, index) => {
            const soundType = this.getSoundType(index);
            pad.addEventListener('click', () => this.playSound(soundType));
            pad.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.playSound(soundType);
            });
        });
    }

    getSoundType(index) {
        const types = ['kick', 'snare', 'hihat', 'cymbal'];
        return types[index] || 'kick';
    }

    loadSounds() {
        // Create synthetic drum sounds using Web Audio API
        this.sounds = {
            kick: this.createKickSound(),
            snare: this.createSnareSound(),
            hihat: this.createHiHatSound(),
            cymbal: this.createCymbalSound()
        };
    }

    createKickSound() {
        return () => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.frequency.setValueAtTime(60, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
            
            gainNode.gain.setValueAtTime(1, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.5);
        };
    }

    createSnareSound() {
        return () => {
            const bufferSize = this.audioContext.sampleRate * 0.2;
            const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
            const output = buffer.getChannelData(0);
            
            for (let i = 0; i < bufferSize; i++) {
                output[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
            }
            
            const source = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();
            
            source.buffer = buffer;
            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
            
            source.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            source.start();
        };
    }

    createHiHatSound() {
        return () => {
            const bufferSize = this.audioContext.sampleRate * 0.1;
            const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
            const output = buffer.getChannelData(0);
            
            for (let i = 0; i < bufferSize; i++) {
                output[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
            }
            
            const source = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();
            
            filter.type = 'highpass';
            filter.frequency.value = 8000;
            
            source.buffer = buffer;
            gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
            
            source.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            source.start();
        };
    }

    createCymbalSound() {
        return () => {
            const bufferSize = this.audioContext.sampleRate * 0.5;
            const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
            const output = buffer.getChannelData(0);
            
            for (let i = 0; i < bufferSize; i++) {
                output[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.5);
            }
            
            const source = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();
            
            filter.type = 'bandpass';
            filter.frequency.value = 3000;
            filter.Q.value = 1;
            
            source.buffer = buffer;
            gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
            
            source.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            source.start();
        };
    }

    playSound(type) {
        if (this.sounds[type]) {
            this.sounds[type]();
            this.animatePad(type);
        }
    }

    animatePad(type) {
        const padIndex = ['kick', 'snare', 'hihat', 'cymbal'].indexOf(type);
        const pad = this.pads[padIndex];
        
        if (pad) {
            pad.style.transform = 'scale(0.95)';
            pad.style.filter = 'brightness(1.5)';
            
            setTimeout(() => {
                pad.style.transform = 'scale(1)';
                pad.style.filter = 'brightness(1)';
            }, 100);
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.beatboxMode = new BeatboxMode();
});

