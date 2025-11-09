document.addEventListener("DOMContentLoaded", () => {
    const startButton = document.getElementById("start-note-detection");
    const stopButton = document.getElementById("stop-note-detection");
    const statusMessage = document.getElementById("status-message");
    const noteDisplay = document.getElementById("note-display");
    const frequencyDisplay = document.getElementById("frequency-display");
    const chordDisplay = document.getElementById("chord-display");
    const waveformCanvas = document.getElementById("waveform-canvas");
    const canvasCtx = waveformCanvas ? waveformCanvas.getContext("2d") : null;
    const microphoneSelect = document.getElementById("microphone-select");
    const melodyTracker = document.getElementById("melody-tracker");
    const clearMelodyButton = document.getElementById("clear-melody");
    const visualKeyboard = document.getElementById("visual-keyboard");
    const powerLed = document.getElementById("power-led");
    const signalLed = document.getElementById("signal-led");
    const octaveDisplay = document.getElementById("octave-display");
    const scaleDisplay = document.getElementById("scale-display");

    let audioContext;
    let analyser;
    let microphone;
    let isDetecting = false;
    let animationId;
    let availableDevices = [];
    let lastNote = null;
    let noteLingerTimeout = null;
    let melodyHistory = [];
    let waveformColors = ['#ff00ff', '#00ffff', '#ffff00', '#00ff00', '#ff6600'];
    let colorIndex = 0;
    let activeKeys = new Set();
    let keyLingerTimeouts = new Map();
    let detectedNotes = new Map(); // For multi-note detection
    let currentChord = null;

    // Load available microphones
    async function loadMicrophones() {
        try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
            const devices = await navigator.mediaDevices.enumerateDevices();
            availableDevices = devices.filter(device => device.kind === 'audioinput');
            
            microphoneSelect.innerHTML = '';
            
            if (availableDevices.length === 0) {
                microphoneSelect.innerHTML = '<option value="">No microphones found</option>';
                return;
            }
            
            microphoneSelect.innerHTML = '<option value="">Default Microphone</option>';
            
            availableDevices.forEach((device, index) => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.textContent = device.label || `Microphone ${index + 1}`;
                microphoneSelect.appendChild(option);
            });
            
            console.log("AUDIATION STATION: Found", availableDevices.length, "microphone(s)");
        } catch (error) {
            console.error("AUDIATION STATION: Error loading microphones:", error);
            microphoneSelect.innerHTML = '<option value="">Error loading microphones</option>';
        }
    }

    loadMicrophones();

    // Note frequencies (A4 = 440Hz as reference)
    const noteFrequencies = {
        "C": 261.63, "C#": 277.18, "D": 293.66, "D#": 311.13,
        "E": 329.63, "F": 349.23, "F#": 369.99, "G": 392.00,
        "G#": 415.30, "A": 440.00, "A#": 466.16, "B": 493.88
    };

    // Chord definitions
    const chordPatterns = {
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

    // Generate visual keyboard
    function generateKeyboard() {
        if (!visualKeyboard) return;
        
        visualKeyboard.innerHTML = '';
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const whiteKeys = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
        const blackKeys = ['C#', 'D#', 'F#', 'G#', 'A#'];
        
        // Generate 3 octaves (C3 to B5)
        for (let octave = 3; octave <= 5; octave++) {
            // Add white keys first
            whiteKeys.forEach(note => {
                const key = document.createElement('div');
                key.className = 'piano-key white';
                key.dataset.note = note + octave;
                key.textContent = note + octave;
                visualKeyboard.appendChild(key);
            });
        }
        
        // Add black keys with proper positioning
        const whiteKeyElements = visualKeyboard.querySelectorAll('.white');
        const blackKeyPositions = [0, 1, 3, 4, 5]; // Positions relative to white keys in each octave
        
        for (let octave = 3; octave <= 5; octave++) {
            blackKeyPositions.forEach((pos, index) => {
                const whiteKeyIndex = (octave - 3) * 7 + pos;
                const whiteKey = whiteKeyElements[whiteKeyIndex];
                if (whiteKey) {
                    const blackKey = document.createElement('div');
                    blackKey.className = 'piano-key black';
                    blackKey.dataset.note = blackKeys[index] + octave;
                    blackKey.textContent = blackKeys[index] + octave;
                    visualKeyboard.insertBefore(blackKey, whiteKey.nextSibling);
                }
            });
        }
    }

    // Light up keyboard key
    function lightUpKey(note, intensity = 1) {
        const key = visualKeyboard.querySelector(`[data-note="${note}"]`);
        if (key) {
            key.classList.add('active');
            key.style.filter = `brightness(${1 + intensity})`;
            activeKeys.add(note);
            
            // Clear existing timeout for this key
            if (keyLingerTimeouts.has(note)) {
                clearTimeout(keyLingerTimeouts.get(note));
            }
            
            // Set linger timeout
            const timeout = setTimeout(() => {
                key.classList.remove('active');
                key.style.filter = '';
                activeKeys.delete(note);
                keyLingerTimeouts.delete(note);
            }, 1500);
            
            keyLingerTimeouts.set(note, timeout);
        }
    }

    // Detect chord from active notes
    function detectChord(notes) {
        if (notes.length < 3) return null;
        
        // Convert notes to semitone numbers
        const noteToSemitone = {
            'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
            'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11
        };
        
        const semitones = notes.map(note => {
            const noteName = note.replace(/\d+/, '');
            return noteToSemitone[noteName];
        }).sort((a, b) => a - b);
        
        // Normalize to root position
        const intervals = semitones.map(s => (s - semitones[0] + 12) % 12).sort((a, b) => a - b);
        
        // Check against chord patterns
        for (const [chordType, pattern] of Object.entries(chordPatterns)) {
            if (pattern.length === intervals.length && 
                pattern.every((interval, index) => interval === intervals[index])) {
                const rootNote = Object.keys(noteToSemitone).find(key => noteToSemitone[key] === semitones[0]);
                return `${rootNote} ${chordType}`;
            }
        }
        
        return `${notes.length}-note chord`;
    }

    // Function to find the closest note
    function findClosestNote(frequency) {
        if (frequency < 80 || frequency > 2000) return null;
        
        let closestNote = null;
        let minDifference = Infinity;

        for (const note in noteFrequencies) {
            for (let octave = 1; octave <= 6; octave++) {
                const noteFreq = noteFrequencies[note] * Math.pow(2, octave - 4);
                const diff = Math.abs(noteFreq - frequency);
                if (diff < minDifference) {
                    minDifference = diff;
                    closestNote = note + octave;
                }
            }
        }
        
        return minDifference < 30 ? closestNote : null;
    }

    // Enhanced waveform drawing with multiple colors and effects
    function drawWaveform() {
        if (!canvasCtx || !analyser || !isDetecting) return;

        animationId = requestAnimationFrame(drawWaveform);

        const bufferLength = analyser.fftSize;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteTimeDomainData(dataArray);

        // Create gradient background
        const gradient = canvasCtx.createLinearGradient(0, 0, 0, waveformCanvas.height);
        gradient.addColorStop(0, 'rgba(0, 20, 40, 0.8)');
        gradient.addColorStop(0.5, 'rgba(0, 10, 20, 0.9)');
        gradient.addColorStop(1, 'rgba(0, 20, 40, 0.8)');
        
        canvasCtx.fillStyle = gradient;
        canvasCtx.fillRect(0, 0, waveformCanvas.width, waveformCanvas.height);

        // Draw multiple waveform layers for depth
        const layers = 3;
        for (let layer = 0; layer < layers; layer++) {
            const alpha = 1 - (layer * 0.3);
            const thickness = 3 - layer;
            const offset = layer * 2;
            
            canvasCtx.lineWidth = thickness;
            canvasCtx.strokeStyle = waveformColors[colorIndex] + Math.floor(alpha * 255).toString(16).padStart(2, '0');
            canvasCtx.beginPath();

            const sliceWidth = waveformCanvas.width * 1.0 / bufferLength;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128.0;
                const y = (v * waveformCanvas.height / 2) + offset;

                if (i === 0) {
                    canvasCtx.moveTo(x, y);
                } else {
                    canvasCtx.lineTo(x, y);
                }

                x += sliceWidth;
            }

            canvasCtx.stroke();
        }

        // Add glow effect
        canvasCtx.shadowColor = waveformColors[colorIndex];
        canvasCtx.shadowBlur = 10;
        canvasCtx.lineWidth = 1;
        canvasCtx.strokeStyle = waveformColors[colorIndex];
        canvasCtx.beginPath();

        const sliceWidth = waveformCanvas.width * 1.0 / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
            const y = v * waveformCanvas.height / 2;

            if (i === 0) {
                canvasCtx.moveTo(x, y);
            } else {
                canvasCtx.lineTo(x, y);
            }

            x += sliceWidth;
        }

        canvasCtx.stroke();
        canvasCtx.shadowBlur = 0;

        // Draw center line with pulse effect
        const time = Date.now() * 0.005;
        const pulseAlpha = (Math.sin(time) + 1) * 0.5;
        canvasCtx.strokeStyle = `rgba(0, 255, 255, ${0.3 + pulseAlpha * 0.3})`;
        canvasCtx.lineWidth = 1;
        canvasCtx.beginPath();
        canvasCtx.moveTo(0, waveformCanvas.height / 2);
        canvasCtx.lineTo(waveformCanvas.width, waveformCanvas.height / 2);
        canvasCtx.stroke();

        // Cycle through colors periodically
        if (Math.random() < 0.01) {
            colorIndex = (colorIndex + 1) % waveformColors.length;
        }
    }

    // Autocorrelation function for pitch detection
    function autoCorrelate(buffer, sampleRate) {
        const SIZE = buffer.length;
        const rms = Math.sqrt(buffer.reduce((sum, val) => sum + val * val, 0) / SIZE);
        
        if (rms < 0.01) return -1;

        let r1 = 0, r2 = SIZE - 1;
        const thres = 0.2;
        
        for (let i = 0; i < SIZE / 2; i++) {
            if (Math.abs(buffer[i]) < thres) { r1 = i; break; }
        }
        for (let i = 1; i < SIZE / 2; i++) {
            if (Math.abs(buffer[SIZE - i]) < thres) { r2 = SIZE - i; break; }
        }

        buffer = buffer.slice(r1, r2);
        const newSize = buffer.length;

        const c = new Array(newSize).fill(0);
        for (let i = 0; i < newSize; i++) {
            for (let j = 0; j < newSize - i; j++) {
                c[i] = c[i] + buffer[j] * buffer[j + i];
            }
        }

        let d = 0;
        while (c[d] > c[d + 1]) d++;
        
        let maxval = -1, maxpos = -1;
        for (let i = d; i < newSize; i++) {
            if (c[i] > maxval) {
                maxval = c[i];
                maxpos = i;
            }
        }

        let T0 = maxpos;
        
        if (maxpos > 0 && maxpos < newSize - 1) {
            const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
            const a = (x1 + x3 - 2 * x2) / 2;
            const b = (x3 - x1) / 2;
            if (a) T0 = T0 - b / (2 * a);
        }

        return sampleRate / T0;
    }

    // Enhanced multi-note detection using FFT analysis
    function detectMultipleNotes() {
        if (!analyser || !isDetecting) return;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);
        
        const sampleRate = audioContext.sampleRate;
        const nyquist = sampleRate / 2;
        const detectedFrequencies = [];
        
        // Find peaks in frequency spectrum
        const threshold = 50; // Minimum amplitude threshold
        const minDistance = 10; // Minimum distance between peaks
        
        for (let i = minDistance; i < bufferLength - minDistance; i++) {
            if (dataArray[i] > threshold) {
                let isPeak = true;
                
                // Check if this is a local maximum
                for (let j = i - minDistance; j <= i + minDistance; j++) {
                    if (j !== i && dataArray[j] >= dataArray[i]) {
                        isPeak = false;
                        break;
                    }
                }
                
                if (isPeak) {
                    const frequency = (i * nyquist) / bufferLength;
                    if (frequency >= 80 && frequency <= 2000) {
                        detectedFrequencies.push({
                            frequency: frequency,
                            amplitude: dataArray[i]
                        });
                    }
                }
            }
        }
        
        // Sort by amplitude (strongest first)
        detectedFrequencies.sort((a, b) => b.amplitude - a.amplitude);
        
        // Take top 5 frequencies
        const topFrequencies = detectedFrequencies.slice(0, 5);
        
        // Convert frequencies to notes
        const detectedNotesList = [];
        topFrequencies.forEach(freq => {
            const note = findClosestNote(freq.frequency);
            if (note) {
                detectedNotesList.push({
                    note: note,
                    frequency: freq.frequency,
                    amplitude: freq.amplitude
                });
            }
        });
        
        return detectedNotesList;
    }

    // Update CRT display with note and chord information
    function updateCRTDisplay(noteData, chord) {
        if (noteData && noteData.length > 0) {
            const primaryNote = noteData[0];
            noteDisplay.textContent = primaryNote.note;
            noteDisplay.className = 'crt-note-display active';
            frequencyDisplay.textContent = primaryNote.frequency.toFixed(2) + " Hz";
            
            // Update chord display
            if (chord) {
                chordDisplay.textContent = chord;
                chordDisplay.style.color = '#ff66cc';
            } else if (noteData.length > 1) {
                chordDisplay.textContent = `${noteData.length} notes detected`;
                chordDisplay.style.color = '#ffff00';
            } else {
                chordDisplay.textContent = 'Single note';
                chordDisplay.style.color = '#00ffff';
            }
            
            // Light up keyboard keys
            noteData.forEach((data, index) => {
                const intensity = data.amplitude / 255; // Normalize amplitude
                lightUpKey(data.note, intensity);
            });
            
            // Add to melody history
            const noteString = noteData.length > 1 ? 
                (chord || `${noteData.length}-note`) : 
                primaryNote.note;
                
            if (noteString !== lastNote) {
                addToMelodyHistory(noteString, noteData.length > 1);
                lastNote = noteString;
            }
            
            // Update signal LED
            if (signalLed) {
                signalLed.classList.add('active');
            }
            
        } else {
            noteDisplay.textContent = '~';
            noteDisplay.className = 'crt-note-display searching';
            frequencyDisplay.textContent = "Listening...";
            chordDisplay.textContent = 'No signal';
            chordDisplay.style.color = '#666';
            
            // Remove signal LED
            if (signalLed) {
                signalLed.classList.remove('active');
            }
        }
    }

    // Add note or chord to melody history
    function addToMelodyHistory(noteOrChord, isChord = false) {
        const timestamp = Date.now();
        melodyHistory.push({ 
            note: noteOrChord, 
            timestamp, 
            isChord 
        });
        
        // Keep only last 20 entries
        if (melodyHistory.length > 20) {
            melodyHistory.shift();
        }
        
        updateMelodyDisplay();
    }

    // Update melody tracker display
    function updateMelodyDisplay() {
        if (!melodyTracker) return;
        
        melodyTracker.innerHTML = '';
        
        if (melodyHistory.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.textContent = 'No notes detected yet...';
            emptyMessage.style.color = '#666';
            emptyMessage.style.fontStyle = 'italic';
            melodyTracker.appendChild(emptyMessage);
            return;
        }
        
        melodyHistory.forEach((entry, index) => {
            const noteElement = document.createElement('div');
            noteElement.className = entry.isChord ? 'melody-note chord' : 'melody-note';
            noteElement.textContent = entry.note;
            
            // Add fade effect for older notes
            const age = melodyHistory.length - index;
            const opacity = Math.max(0.3, 1 - (age * 0.05));
            noteElement.style.opacity = opacity;
            
            // Add recent note highlight
            if (index === melodyHistory.length - 1) {
                noteElement.classList.add('recent');
            }
            
            melodyTracker.appendChild(noteElement);
        });
    }

    // Enhanced pitch detection with multi-note support
    function getPitch() {
        if (!analyser || !isDetecting) return;

        // Get multiple notes using FFT analysis
        const detectedNotes = detectMultipleNotes();
        
        // Detect chord if multiple notes
        let chord = null;
        if (detectedNotes.length >= 3) {
            const noteNames = detectedNotes.map(n => n.note);
            chord = detectChord(noteNames);
            currentChord = chord;
        } else {
            currentChord = null;
        }
        
        // Update displays
        updateCRTDisplay(detectedNotes, chord);
        
        // Update octave display
        if (detectedNotes.length > 0 && octaveDisplay) {
            const octaves = [...new Set(detectedNotes.map(n => n.note.slice(-1)))];
            octaveDisplay.textContent = `Octave: ${octaves.join(', ')}`;
        }
        
        // Continue detection
        if (isDetecting) {
            setTimeout(getPitch, 100); // Update every 100ms for better multi-note detection
        }
    }

    // Initialize keyboard and event listeners
    function initializeKeyboard() {
        generateKeyboard();
        
        // Clear melody button
        if (clearMelodyButton) {
            clearMelodyButton.addEventListener('click', () => {
                melodyHistory = [];
                updateMelodyDisplay();
                
                // Clear all active keys
                activeKeys.forEach(note => {
                    const key = visualKeyboard.querySelector(`[data-note="${note}"]`);
                    if (key) {
                        key.classList.remove('active');
                        key.style.filter = '';
                    }
                });
                activeKeys.clear();
                
                // Clear all timeouts
                keyLingerTimeouts.forEach(timeout => clearTimeout(timeout));
                keyLingerTimeouts.clear();
            });
        }
    }

    // Start Note Detection
    if (startButton) {
        startButton.addEventListener("click", async () => {
            if (isDetecting) return;

            try {
                statusMessage.textContent = "Requesting microphone access...";
                
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                
                if (audioContext.state === 'suspended') {
                    await audioContext.resume();
                }

                const selectedDeviceId = microphoneSelect.value;
                const constraints = {
                    audio: {
                        echoCancellation: false,
                        noiseSuppression: false,
                        autoGainControl: false
                    }
                };
                
                if (selectedDeviceId) {
                    constraints.audio.deviceId = { exact: selectedDeviceId };
                }
                
                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                
                microphone = audioContext.createMediaStreamSource(stream);
                analyser = audioContext.createAnalyser();
                analyser.fftSize = 4096;
                analyser.smoothingTimeConstant = 0.3; // Reduced for better multi-note detection
                microphone.connect(analyser);

                isDetecting = true;
                startButton.disabled = true;
                stopButton.disabled = false;
                statusMessage.textContent = "🎵 Advanced note detection active - play or sing notes!";
                noteDisplay.textContent = "READY";
                noteDisplay.className = 'crt-note-display ready';
                frequencyDisplay.textContent = "Initializing...";
                chordDisplay.textContent = "Listening for chords...";

                // Initialize keyboard and LEDs
                if (powerLed) {
                    powerLed.classList.add('active');
                }
                
                // Clear melody history
                melodyHistory = [];
                updateMelodyDisplay();

                drawWaveform();
                getPitch();

                console.log("AUDIATION STATION: Enhanced note detection with keyboard started successfully.");
            } catch (error) {
                statusMessage.textContent = "❌ Error: " + error.message;
                console.error("AUDIATION STATION: Error starting note detection:", error);
                
                startButton.disabled = false;
                stopButton.disabled = true;
            }
        });
    }

    // Stop Note Detection
    if (stopButton) {
        stopButton.addEventListener("click", () => {
            if (!isDetecting) return;

            isDetecting = false;
            startButton.disabled = false;
            stopButton.disabled = true;
            statusMessage.textContent = "Note detection stopped.";
            noteDisplay.textContent = "OFF";
            noteDisplay.className = 'crt-note-display off';
            frequencyDisplay.textContent = "0 Hz";
            chordDisplay.textContent = "Offline";

            // Turn off LEDs
            if (powerLed) {
                powerLed.classList.remove('active');
            }
            if (signalLed) {
                signalLed.classList.remove('active');
            }

            // Clear all timeouts
            if (noteLingerTimeout) {
                clearTimeout(noteLingerTimeout);
                noteLingerTimeout = null;
            }
            
            keyLingerTimeouts.forEach(timeout => clearTimeout(timeout));
            keyLingerTimeouts.clear();

            if (animationId) {
                cancelAnimationFrame(animationId);
            }

            // Clear all active keys
            activeKeys.forEach(note => {
                const key = visualKeyboard.querySelector(`[data-note="${note}"]`);
                if (key) {
                    key.classList.remove('active');
                    key.style.filter = '';
                }
            });
            activeKeys.clear();

            // Clean up audio resources
            if (microphone) {
                microphone.disconnect();
                if (microphone.mediaStream) {
                    microphone.mediaStream.getTracks().forEach(track => track.stop());
                }
            }
            if (analyser) {
                analyser.disconnect();
            }
            if (audioContext) {
                audioContext.close().then(() => {
                    console.log("AUDIATION STATION: AudioContext closed.");
                });
            }

            // Clear waveform canvas
            if (canvasCtx) {
                const gradient = canvasCtx.createLinearGradient(0, 0, 0, waveformCanvas.height);
                gradient.addColorStop(0, 'rgba(0, 20, 40, 0.8)');
                gradient.addColorStop(0.5, 'rgba(0, 10, 20, 0.9)');
                gradient.addColorStop(1, 'rgba(0, 20, 40, 0.8)');
                canvasCtx.fillStyle = gradient;
                canvasCtx.fillRect(0, 0, waveformCanvas.width, waveformCanvas.height);
            }

            console.log("AUDIATION STATION: Enhanced note detection stopped.");
        });
    }

    // Initialize everything when page loads
    initializeKeyboard();
    
    // Initialize canvas dimensions
    if (waveformCanvas) {
        const resizeCanvas = () => {
            const rect = waveformCanvas.getBoundingClientRect();
            waveformCanvas.width = rect.width;
            waveformCanvas.height = rect.height;
            
            if (waveformCanvas.width < 300) waveformCanvas.width = 300;
            if (waveformCanvas.height < 150) waveformCanvas.height = 150;
        };
        
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    }
});
