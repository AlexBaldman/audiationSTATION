document.addEventListener("DOMContentLoaded", function() {
    const startButton = document.getElementById("start-game");
    const stopButton = document.getElementById("stop-game");
    const newNoteButton = document.getElementById("new-note");
    const targetNoteDisplay = document.getElementById("target-note");
    const scoreDisplay = document.getElementById("score");
    const accuracyBar = document.getElementById("accuracy-bar");
    const feedbackMessage = document.getElementById("feedback-message");
    const microphoneSelect = document.getElementById("pitch-microphone-select");

    let audioContext;
    let analyser;
    let microphone;
    let isPlaying = false;
    let score = 0;
    let currentTargetNote = "C4";
    let availableDevices = [];

    // Note frequencies (A4 = 440Hz)
    const noteFrequencies = {
        "C4": 261.63, "C#4": 277.18, "D4": 293.66, "D#4": 311.13,
        "E4": 329.63, "F4": 349.23, "F#4": 369.99, "G4": 392.00,
        "G#4": 415.30, "A4": 440.00, "A#4": 466.16, "B4": 493.88,
        "C5": 523.25, "C#5": 554.37, "D5": 587.33, "D#5": 622.25,
        "E5": 659.25, "F5": 698.46, "F#5": 739.99, "G5": 783.99
    };

    const noteNames = Object.keys(noteFrequencies);

    // Load microphones
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
        } catch (error) {
            microphoneSelect.innerHTML = '<option value="">Error loading microphones</option>';
        }
    }

    loadMicrophones();

    // Autocorrelation for pitch detection
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
        const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
        const a = (x1 - 2 * x2 + x3) / 2;
        const b = (x3 - x1) / 2;
        
        if (a) T0 = T0 - b / (2 * a);
        return sampleRate / T0;
    }

    // Generate random target note
    function generateTargetNote() {
        const randomIndex = Math.floor(Math.random() * noteNames.length);
        currentTargetNote = noteNames[randomIndex];
        targetNoteDisplay.textContent = currentTargetNote;
        feedbackMessage.textContent = `Sing or play ${currentTargetNote}!`;
        feedbackMessage.className = "feedback-message";
    }

    // Check pitch accuracy
    function checkPitchAccuracy() {
        if (!analyser || !isPlaying) return;

        const bufferLength = analyser.fftSize;
        const buffer = new Float32Array(bufferLength);
        analyser.getFloatTimeDomainData(buffer);

        const pitch = autoCorrelate(buffer, audioContext.sampleRate);
        
        if (pitch > 0) {
            const targetFreq = noteFrequencies[currentTargetNote];
            const difference = Math.abs(pitch - targetFreq);
            const accuracy = Math.max(0, 100 - (difference / targetFreq) * 200);
            
            accuracyBar.style.width = accuracy + "%";
            
            if (accuracy > 85) {
                feedbackMessage.textContent = "🎉 Perfect! +10 points!";
                feedbackMessage.className = "feedback-message correct";
                score += 10;
                scoreDisplay.textContent = score;
                setTimeout(generateTargetNote, 1500);
            } else if (accuracy > 60) {
                feedbackMessage.textContent = "🎵 Close! Keep trying!";
                feedbackMessage.className = "feedback-message close";
            } else {
                feedbackMessage.textContent = "🎯 Try to match the note!";
                feedbackMessage.className = "feedback-message off";
            }
        } else {
            accuracyBar.style.width = "0%";
        }

        if (isPlaying) {
            setTimeout(checkPitchAccuracy, 100);
        }
    }

    // Start game
    startButton.addEventListener("click", async () => {
        if (isPlaying) return;

        try {
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
            analyser.smoothingTimeConstant = 0.8;
            microphone.connect(analyser);

            isPlaying = true;
            startButton.disabled = true;
            stopButton.disabled = false;
            newNoteButton.disabled = false;
            
            generateTargetNote();
            checkPitchAccuracy();

        } catch (error) {
            feedbackMessage.textContent = "❌ Microphone access denied!";
            feedbackMessage.className = "feedback-message off";
        }
    });

    // Stop game
    stopButton.addEventListener("click", () => {
        isPlaying = false;
        startButton.disabled = false;
        stopButton.disabled = true;
        newNoteButton.disabled = true;
        
        if (microphone) {
            microphone.disconnect();
        }
        
        accuracyBar.style.width = "0%";
        feedbackMessage.textContent = "Game stopped. Click 'Start Game' to play again!";
        feedbackMessage.className = "feedback-message";
    });

    // New note button
    newNoteButton.addEventListener("click", generateTargetNote);
});
