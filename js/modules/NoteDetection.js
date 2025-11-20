import { frequencyToNote } from './PitchUtils.js';
import { createAudioContext, stopMediaStream, closeAudioContext, cancelAnimationFrameSafe } from './AudioResourceManager.js';
import { GeometryScope } from './GeometryScope.js';

export class NoteDetection {
    constructor() {
        this.startButton = document.getElementById("start-note-detection");
        this.stopButton = document.getElementById("stop-note-detection");
        this.statusMessage = document.getElementById("status-message");
        this.noteDisplay = document.getElementById("note-display");
        this.frequencyDisplay = document.getElementById("frequency-display");
        this.chordDisplay = document.getElementById("chord-display");
        this.waveformCanvas = document.getElementById("waveform-canvas");
        this.canvasCtx = this.waveformCanvas ? this.waveformCanvas.getContext("2d") : null;
        this.microphoneSelect = document.getElementById("microphone-select");
        this.melodyTracker = document.getElementById("melody-tracker");
        this.clearMelodyButton = document.getElementById("clear-melody");
        this.visualKeyboard = document.getElementById("visual-keyboard");
        this.powerLed = document.getElementById("power-led");
        this.signalLed = document.getElementById("signal-led");
        this.octaveDisplay = document.getElementById("octave-display");
        this.scaleDisplay = document.getElementById("scale-display");

        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        this.isDetecting = false;
        this.availableDevices = [];
        this.lastNote = null;
        this.noteLingerTimeout = null;
        this.melodyHistory = [];
        this.waveformColors = ['#ff00ff', '#00ffff', '#ffff00', '#00ff00', '#ff6600'];
        this.colorIndex = 0;
        this.activeKeys = new Set();
        this.keyLingerTimeouts = new Map();
        this.detectedNotes = new Map(); // For multi-note detection
        this.currentChord = null;
        this.pitchOptions = { minFrequency: 70, maxFrequency: 2000, maxCentError: 70 };

        this.geometryScope = null;

        this.detectFrameId = null;
        this.waveformFrameId = null;
        this.uiFrameId = null;
        this.pendingUiPayload = null;
        this.mediaStream = null;
        this.boundVisibilityHandler = null;
        this.boundUnloadHandler = null;

        this.chordPatterns = {
            "Major": [0, 4, 7],
            "Minor": [0, 3, 7],
            "Diminished": [0, 3, 6],
            "Augmented": [0, 4, 8],
            "Sus2": [0, 2, 7],
            "Sus4": [0, 5, 7],
            "Major7": [0, 4, 7, 11],
            "Minor7": [0, 3, 7, 10],
            "Dominant7": [0, 4, 7, 10]
        };

        this.init();
        this.attachLifecycleHooks();
    }

    init() {
        this.loadMicrophones();
        this.generateKeyboard();
        if (this.startButton) this.startButton.addEventListener("click", () => this.start());
        if (this.stopButton) this.stopButton.addEventListener("click", () => this.stop());
        if (this.clearMelodyButton) this.clearMelodyButton.addEventListener("click", () => this.clearMelody());
        if (typeof window !== 'undefined') {
            this.geometryScope = new GeometryScope();
        }
    }

    attachLifecycleHooks() {
        if (typeof document === 'undefined' || this.boundVisibilityHandler) return;
        this.boundVisibilityHandler = () => this.handleVisibilityChange();
        document.addEventListener('visibilitychange', this.boundVisibilityHandler);
        this.boundUnloadHandler = () => this.dispose();
        window.addEventListener('beforeunload', this.boundUnloadHandler);
    }

    detachLifecycleHooks() {
        if (this.boundVisibilityHandler && typeof document !== 'undefined') {
            document.removeEventListener('visibilitychange', this.boundVisibilityHandler);
            this.boundVisibilityHandler = null;
        }
        if (this.boundUnloadHandler) {
            window.removeEventListener('beforeunload', this.boundUnloadHandler);
            this.boundUnloadHandler = null;
        }
    }

    handleVisibilityChange() {
        if (!this.audioContext) return;
        if (document.hidden && this.audioContext.state === 'running') {
            this.audioContext.suspend();
        } else if (!document.hidden && this.audioContext.state === 'suspended' && this.isDetecting) {
            this.audioContext.resume();
        }
    }

    queueUiRender(payload) {
        this.pendingUiPayload = payload;
        const raf = typeof window !== 'undefined' ? window.requestAnimationFrame : null;
        if (!raf) {
            this.flushPendingUi();
            return;
        }
        if (this.uiFrameId) return;
        this.uiFrameId = raf(() => this.flushPendingUi());
    }

    flushPendingUi() {
        const payload = this.pendingUiPayload;
        this.pendingUiPayload = null;
        this.uiFrameId = null;
        if (!payload) return;

        switch (payload.type) {
            case 'note':
                this.renderNotePayload(payload);
                break;
            case 'clear':
                this.renderClearPayload();
                break;
            case 'signalOff':
                if (this.signalLed) this.signalLed.classList.remove('on');
                break;
            default:
                break;
        }
    }

    renderNotePayload(payload) {
        const { note, frequency, cents, chord, octave, scale, melodyText, highlightNote, highlightIntensity } = payload;
        if (this.noteDisplay) this.noteDisplay.textContent = note;
        if (this.frequencyDisplay) {
            const centsText = cents >= 0 ? `+${cents.toFixed(1)}¢` : `${cents.toFixed(1)}¢`;
            this.frequencyDisplay.textContent = `${frequency.toFixed(2)} Hz (${centsText})`;
        }
        if (this.signalLed) this.signalLed.classList.add('on');
        if (this.chordDisplay) this.chordDisplay.textContent = chord || '---';
        if (this.octaveDisplay) this.octaveDisplay.textContent = `Octave: ${octave}`;
        if (this.scaleDisplay) this.scaleDisplay.textContent = `Scale: ${scale}`;
        if (this.melodyTracker) this.melodyTracker.textContent = melodyText;
        if (highlightNote) this.lightUpKey(highlightNote, highlightIntensity);
        this.geometryScope?.updateFromNote(payload);
    }

    renderClearPayload() {
        if (this.noteDisplay) this.noteDisplay.textContent = '---';
        if (this.frequencyDisplay) this.frequencyDisplay.textContent = '0.00 Hz';
        if (this.signalLed) this.signalLed.classList.remove('on');
        if (this.chordDisplay) this.chordDisplay.textContent = '---';
        if (this.octaveDisplay) this.octaveDisplay.textContent = 'Octave: -';
        if (this.scaleDisplay) this.scaleDisplay.textContent = 'Scale: -';
        this.geometryScope?.clear();
    }

    scheduleNoteClear() {
        if (this.noteLingerTimeout) clearTimeout(this.noteLingerTimeout);
        this.noteLingerTimeout = setTimeout(() => {
            this.queueUiRender({ type: 'clear' });
        }, 2000);
    }

    getScaleLabel() {
        if (!this.currentChord) return '-';
        if (this.currentChord.includes('Major')) return 'Major';
        if (this.currentChord.includes('Minor')) return 'Minor';
        return this.currentChord.split(' ')[1] || '-';
    }

    async loadMicrophones() {
        try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
            const devices = await navigator.mediaDevices.enumerateDevices();
            this.availableDevices = devices.filter(device => device.kind === 'audioinput');

            if (this.microphoneSelect) {
                this.microphoneSelect.innerHTML = '';
                if (this.availableDevices.length === 0) {
                    this.microphoneSelect.innerHTML = '<option value="">No microphones found</option>';
                    return;
                }
                this.microphoneSelect.innerHTML = '<option value="">Default Microphone</option>';
                this.availableDevices.forEach((device, index) => {
                    const option = document.createElement('option');
                    option.value = device.deviceId;
                    option.textContent = device.label || `Microphone ${index + 1}`;
                    this.microphoneSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error("Error loading microphones:", error);
            if (this.microphoneSelect) this.microphoneSelect.innerHTML = '<option value="">Error loading microphones</option>';
        }
    }

    generateKeyboard() {
        if (!this.visualKeyboard) return;
        this.visualKeyboard.innerHTML = '';
        const whiteKeys = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
        const blackKeys = ['C#', 'D#', 'F#', 'G#', 'A#'];
        for (let octave = 3; octave <= 5; octave++) {
            whiteKeys.forEach(note => {
                const key = document.createElement('div');
                key.className = 'piano-key white';
                key.dataset.note = note + octave;
                key.textContent = note + octave;
                this.visualKeyboard.appendChild(key);
            });
        }
        const whiteKeyElements = this.visualKeyboard.querySelectorAll('.white');
        const blackKeyPositions = [0, 1, 3, 4, 5];
        for (let octave = 3; octave <= 5; octave++) {
            blackKeyPositions.forEach((pos, index) => {
                const whiteKeyIndex = (octave - 3) * 7 + pos;
                const whiteKey = whiteKeyElements[whiteKeyIndex];
                if (whiteKey) {
                    const blackKey = document.createElement('div');
                    blackKey.className = 'piano-key black';
                    blackKey.dataset.note = blackKeys[index] + octave;
                    blackKey.textContent = blackKeys[index] + octave;
                    this.visualKeyboard.insertBefore(blackKey, whiteKey.nextSibling);
                }
            });
        }
    }

    lightUpKey(note, intensity = 1) {
        const key = this.visualKeyboard.querySelector(`[data-note="${note}"]`);
        if (key) {
            key.classList.add('active');
            key.style.filter = `brightness(${1 + intensity})`;
            this.activeKeys.add(note);
            if (this.keyLingerTimeouts.has(note)) {
                clearTimeout(this.keyLingerTimeouts.get(note));
            }
            const timeout = setTimeout(() => {
                key.classList.remove('active');
                key.style.filter = '';
                this.activeKeys.delete(note);
                this.keyLingerTimeouts.delete(note);
            }, 1500);
            this.keyLingerTimeouts.set(note, timeout);
        }
    }

    detectChord(notes) {
        if (notes.length < 3) return null;
        const noteToSemitone = { 'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11 };
        const semitones = notes.map(note => noteToSemitone[note.replace(/\d+/, '')]).sort((a, b) => a - b);
        const intervals = semitones.map(s => (s - semitones[0] + 12) % 12).sort((a, b) => a - b);
        for (const [chordType, pattern] of Object.entries(this.chordPatterns)) {
            if (pattern.length === intervals.length && pattern.every((interval, index) => interval === intervals[index])) {
                const rootNote = Object.keys(noteToSemitone).find(key => noteToSemitone[key] === semitones[0]);
                return `${rootNote} ${chordType}`;
            }
        }
        return `${notes.length}-note chord`;
    }

    drawWaveform() {
        if (!this.canvasCtx || !this.analyser || !this.isDetecting) return;
        const raf = typeof window !== 'undefined' ? window.requestAnimationFrame : null;
        if (!raf) return;
        this.waveformFrameId = raf(() => this.drawWaveform());
        const bufferLength = this.analyser.fftSize;
        const dataArray = new Uint8Array(bufferLength);
        this.analyser.getByteTimeDomainData(dataArray);
        const gradient = this.canvasCtx.createLinearGradient(0, 0, 0, this.waveformCanvas.height);
        gradient.addColorStop(0, 'rgba(0, 20, 40, 0.8)');
        gradient.addColorStop(0.5, 'rgba(0, 10, 20, 0.9)');
        gradient.addColorStop(1, 'rgba(0, 20, 40, 0.8)');
        this.canvasCtx.fillStyle = gradient;
        this.canvasCtx.fillRect(0, 0, this.waveformCanvas.width, this.waveformCanvas.height);
        for (let layer = 0; layer < 3; layer++) {
            const alpha = 1 - (layer * 0.3);
            const thickness = 3 - layer;
            const offset = layer * 2;
            this.canvasCtx.lineWidth = thickness;
            this.canvasCtx.strokeStyle = this.waveformColors[this.colorIndex] + Math.floor(alpha * 255).toString(16).padStart(2, '0');
            this.canvasCtx.beginPath();
            const sliceWidth = this.waveformCanvas.width * 1.0 / bufferLength;
            let x = 0;
            for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128.0;
                const y = (v * this.waveformCanvas.height / 2) + offset;
                if (i === 0) this.canvasCtx.moveTo(x, y);
                else this.canvasCtx.lineTo(x, y);
                x += sliceWidth;
            }
            this.canvasCtx.stroke();
        }
        this.canvasCtx.shadowColor = this.waveformColors[this.colorIndex];
        this.canvasCtx.shadowBlur = 10;
        this.canvasCtx.lineWidth = 1;
        this.canvasCtx.strokeStyle = this.waveformColors[this.colorIndex];
        this.canvasCtx.beginPath();
        const sliceWidth = this.waveformCanvas.width * 1.0 / bufferLength;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
            const y = v * this.waveformCanvas.height / 2;
            if (i === 0) this.canvasCtx.moveTo(x, y);
            else this.canvasCtx.lineTo(x, y);
            x += sliceWidth;
        }
        this.canvasCtx.stroke();
        this.canvasCtx.shadowBlur = 0;
        const time = Date.now() * 0.005;
        const pulseAlpha = (Math.sin(time) + 1) * 0.5;
        this.canvasCtx.strokeStyle = `rgba(0, 255, 255, ${0.3 + pulseAlpha * 0.3})`;
        this.canvasCtx.lineWidth = 1;
        this.canvasCtx.beginPath();
        this.canvasCtx.moveTo(0, this.waveformCanvas.height / 2);
        this.canvasCtx.lineTo(this.waveformCanvas.width, this.waveformCanvas.height / 2);
        this.canvasCtx.stroke();
    }

    detectNoteLoop() {
        if (!this.analyser || !this.isDetecting) return;
        const raf = typeof window !== 'undefined' ? window.requestAnimationFrame : null;
        const bufferLength = this.analyser.fftSize;
        const buffer = new Float32Array(bufferLength);
        this.analyser.getFloatTimeDomainData(buffer);
        let bestCorrelation = 0;
        let bestLag = -1;
        const sampleRate = this.audioContext.sampleRate;
        for (let lag = 40; lag < bufferLength; lag++) {
            let correlation = 0;
            for (let i = 0; i < bufferLength - lag; i++) {
                correlation += buffer[i] * buffer[i + lag];
            }
            if (correlation > bestCorrelation) {
                bestCorrelation = correlation;
                bestLag = lag;
            }
        }
        const frequency = bestLag > 0 ? sampleRate / bestLag : 0;
        const noteInfo = frequencyToNote(frequency, this.pitchOptions);
        if (noteInfo) {
            const note = noteInfo.note;
            if (note !== this.lastNote) {
                this.melodyHistory.push(note);
                this.lastNote = note;
                this.colorIndex = (this.colorIndex + 1) % this.waveformColors.length;
            }
            this.detectedNotes.set(note, Date.now());
            const now = Date.now();
            for (const [n, time] of this.detectedNotes.entries()) {
                if (now - time > 1000) this.detectedNotes.delete(n);
            }
            const currentNotes = Array.from(this.detectedNotes.keys());
            this.currentChord = this.detectChord(currentNotes);
            const octave = note.match(/\d+/)?.[0] ?? '-';
            const melodyText = this.melodyHistory.slice(-12).join(' - ');
            this.queueUiRender({
                type: 'note',
                note,
                frequency,
                cents: noteInfo.cents,
                chord: this.currentChord,
                octave,
                scale: this.getScaleLabel(),
                melodyText,
                highlightNote: note,
                highlightIntensity: 1 + Math.min(Math.abs(noteInfo.cents) / 50, 1),
            });
            this.scheduleNoteClear();
        } else {
            this.queueUiRender({ type: 'signalOff' });
        }
        if (this.isDetecting && raf) {
            this.detectFrameId = raf(() => this.detectNoteLoop());
        }
    }

    async start() {
        if (this.isDetecting) return;
        try {
            const selectedDeviceId = this.microphoneSelect ? this.microphoneSelect.value : null;
            const constraints = { audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } };
            if (selectedDeviceId) constraints.audio.deviceId = { exact: selectedDeviceId };
            this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
            this.audioContext = createAudioContext();
            this.microphone = this.audioContext.createMediaStreamSource(this.mediaStream);
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048;
            this.microphone.connect(this.analyser);
            this.isDetecting = true;
            if (this.startButton) this.startButton.disabled = true;
            if (this.stopButton) this.stopButton.disabled = false;
            if (this.powerLed) this.powerLed.classList.add('on');
            if (this.statusMessage) this.statusMessage.textContent = "🟢 Live Note Detection Active";
            this.detectNoteLoop();
            this.drawWaveform();
        } catch (error) {
            if (this.statusMessage) this.statusMessage.textContent = "❌ Error: " + error.message;
            this.stop();
        }
    }

    stop() {
        if (!this.isDetecting) {
            this.resetUiState();
            return;
        }
        this.isDetecting = false;
        stopMediaStream(this.mediaStream);
        this.mediaStream = null;
        cancelAnimationFrameSafe(this.detectFrameId);
        cancelAnimationFrameSafe(this.waveformFrameId);
        cancelAnimationFrameSafe(this.uiFrameId);
        this.detectFrameId = null;
        this.waveformFrameId = null;
        this.uiFrameId = null;
        closeAudioContext(this.audioContext);
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        if (this.startButton) this.startButton.disabled = false;
        if (this.stopButton) this.stopButton.disabled = true;
        if (this.powerLed) this.powerLed.classList.remove('on');
        if (this.statusMessage) this.statusMessage.textContent = "🔴 Note Detection Inactive";
        this.resetUiState();
    }

    resetUiState() {
        this.queueUiRender({ type: 'clear' });
        if (this.canvasCtx && this.waveformCanvas) {
            this.canvasCtx.clearRect(0, 0, this.waveformCanvas.width, this.waveformCanvas.height);
        }
    }

    dispose() {
        this.stop();
        this.detachLifecycleHooks();
        this.geometryScope?.dispose();
        if (this.startButton) this.startButton.replaceWith(this.startButton.cloneNode(true));
        if (this.stopButton) this.stopButton.replaceWith(this.stopButton.cloneNode(true));
    }

    clearMelody() {
        this.melodyHistory = [];
        if (this.melodyTracker) this.melodyTracker.textContent = "";
    }
}
