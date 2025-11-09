document.addEventListener("DOMContentLoaded", () => {
    console.log("AUDIATION STATION: Enhanced Pitch Training initializing...");

    // DOM Elements
    const startButton = document.getElementById("start-game");
    const stopButton = document.getElementById("stop-game");
    const statusMessage = document.getElementById("status-message");
    const microphoneSelect = document.getElementById("microphone-select");
    const canvas = document.getElementById("pitch-game-canvas");
    const ctx = canvas ? canvas.getContext("2d") : null;
    
    // Display Elements
    const targetNoteDisplay = document.getElementById("target-note");
    const targetFrequencyDisplay = document.getElementById("target-frequency");
    const currentNoteDisplay = document.getElementById("current-note");
    const currentFrequencyDisplay = document.getElementById("current-frequency");
    const scoreDisplay = document.getElementById("score");
    const levelDisplay = document.getElementById("level");
    const accuracyDisplay = document.getElementById("accuracy");
    const timeDisplay = document.getElementById("time-elapsed");

    // Game State
    let audioContext;
    let analyser;
    let microphone;
    let isPlaying = false;
    let animationId;
    let gameStartTime;
    let currentLevel = 1;
    let score = 0;
    let totalAttempts = 0;
    let successfulHits = 0;

    // Game Objects
    let orb = {
        x: 100,
        y: 200,
        targetY: 200,
        size: 20,
        color: '#00ffff',
        trail: []
    };

    let gate = {
        x: 600,
        y: 200,
        width: 60,
        height: 40,
        targetY: 200,
        color: '#ff66cc'
    };

    // Target Notes for each level
    const levelTargets = [
        { note: 'C4', frequency: 261.63 },
        { note: 'D4', frequency: 293.66 },
        { note: 'E4', frequency: 329.63 },
        { note: 'F4', frequency: 349.23 },
        { note: 'G4', frequency: 392.00 },
        { note: 'A4', frequency: 440.00 },
        { note: 'B4', frequency: 493.88 },
        { note: 'C5', frequency: 523.25 }
    ];

    let currentTarget = levelTargets[0];
    let currentPitch = 0;
    let pitchHistory = [];

    // Note frequencies for detection
    const noteFrequencies = {
        "C": 261.63, "C#": 277.18, "D": 293.66, "D#": 311.13,
        "E": 329.63, "F": 349.23, "F#": 369.99, "G": 392.00,
        "G#": 415.30, "A": 440.00, "A#": 466.16, "B": 493.88
    };

    // Initialize canvas
    function initCanvas() {
        if (!canvas || !ctx) return;
        
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        
        // Set initial positions
        orb.y = canvas.height / 2;
        orb.targetY = canvas.height / 2;
        gate.x = canvas.width - 100;
        gate.y = canvas.height / 2 - gate.height / 2;
        gate.targetY = canvas.height / 2;
    }

    // Load available microphones
    async function loadMicrophones() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioInputs = devices.filter(device => device.kind === 'audioinput');
            
            microphoneSelect.innerHTML = '';
            
            if (audioInputs.length === 0) {
                microphoneSelect.innerHTML = '<option value="">No microphones found</option>';
                return;
            }
            
            audioInputs.forEach((device, index) => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.textContent = device.label || `Microphone ${index + 1}`;
                microphoneSelect.appendChild(option);
            });
            
            console.log(`Found ${audioInputs.length} microphone(s)`);
        } catch (error) {
            console.error("Error loading microphones:", error);
            microphoneSelect.innerHTML = '<option value="">Error loading microphones</option>';
        }
    }

    // Find closest note from frequency
    function findClosestNote(frequency) {
        if (frequency < 80 || frequency > 2000) return null;
        
        let closestNote = null;
        let minDifference = Infinity;
        
        // Check multiple octaves
        for (let octave = 2; octave <= 6; octave++) {
            for (const [noteName, baseFreq] of Object.entries(noteFrequencies)) {
                const noteFreq = baseFreq * Math.pow(2, octave - 4);
                const difference = Math.abs(frequency - noteFreq);
                
                if (difference < minDifference) {
                    minDifference = difference;
                    closestNote = noteName + octave;
                }
            }
        }
        
        return closestNote;
    }

    // Auto-correlation pitch detection
    function autoCorrelate(buffer, sampleRate) {
        const SIZE = buffer.length;
        const MAX_SAMPLES = Math.floor(SIZE / 2);
        let bestOffset = -1;
        let bestCorrelation = 0;
        let rms = 0;
        let foundGoodCorrelation = false;
        const correlations = new Array(MAX_SAMPLES);

        for (let i = 0; i < SIZE; i++) {
            const val = buffer[i];
            rms += val * val;
        }
        rms = Math.sqrt(rms / SIZE);
        if (rms < 0.01) return -1;

        let lastCorrelation = 1;
        for (let offset = 1; offset < MAX_SAMPLES; offset++) {
            let correlation = 0;
            for (let i = 0; i < MAX_SAMPLES; i++) {
                correlation += Math.abs((buffer[i]) - (buffer[i + offset]));
            }
            correlation = 1 - (correlation / MAX_SAMPLES);
            correlations[offset] = correlation;
            if ((correlation > 0.9) && (correlation > lastCorrelation)) {
                foundGoodCorrelation = true;
                if (correlation > bestCorrelation) {
                    bestCorrelation = correlation;
                    bestOffset = offset;
                }
            } else if (foundGoodCorrelation) {
                const shift = (correlations[bestOffset + 1] - correlations[bestOffset - 1]) / correlations[bestOffset];
                return sampleRate / (bestOffset + (8 * shift));
            }
            lastCorrelation = correlation;
        }
        if (bestCorrelation > 0.01) {
            return sampleRate / bestOffset;
        }
        return -1;
    }

    // Get current pitch
    function getCurrentPitch() {
        if (!analyser || !isPlaying) return;

        const bufferLength = analyser.fftSize;
        const buffer = new Float32Array(bufferLength);
        analyser.getFloatTimeDomainData(buffer);

        const pitch = autoCorrelate(buffer, audioContext.sampleRate);
        
        if (pitch > 0) {
            currentPitch = pitch;
            const note = findClosestNote(pitch);
            
            // Update displays
            currentNoteDisplay.textContent = note || '~';
            currentFrequencyDisplay.textContent = pitch.toFixed(2) + ' Hz';
            
            // Add to pitch history for smoothing
            pitchHistory.push(pitch);
            if (pitchHistory.length > 10) {
                pitchHistory.shift();
            }
        } else {
            currentNoteDisplay.textContent = '~';
            currentFrequencyDisplay.textContent = 'Listening...';
        }
    }

    // Update orb position based on pitch
    function updateOrbPosition() {
        if (pitchHistory.length === 0) return;
        
        // Get average pitch for smoothing
        const avgPitch = pitchHistory.reduce((sum, p) => sum + p, 0) / pitchHistory.length;
        
        // Map pitch to canvas height (inverted - higher pitch = higher position)
        const minPitch = 150; // Hz
        const maxPitch = 600; // Hz
        const pitchRange = maxPitch - minPitch;
        const canvasRange = canvas.height - 100; // Leave margins
        
        let normalizedPitch = (avgPitch - minPitch) / pitchRange;
        normalizedPitch = Math.max(0, Math.min(1, normalizedPitch));
        
        // Invert so higher pitch = higher position
        orb.targetY = canvas.height - 50 - (normalizedPitch * canvasRange);
        
        // Smooth movement
        const smoothing = 0.1;
        orb.y += (orb.targetY - orb.y) * smoothing;
        
        // Update trail
        orb.trail.push({ x: orb.x, y: orb.y });
        if (orb.trail.length > 20) {
            orb.trail.shift();
        }
    }

    // Update gate position based on target note
    function updateGatePosition() {
        const targetPitch = currentTarget.frequency;
        
        // Map target pitch to canvas height
        const minPitch = 150;
        const maxPitch = 600;
        const pitchRange = maxPitch - minPitch;
        const canvasRange = canvas.height - 100;
        
        let normalizedPitch = (targetPitch - minPitch) / pitchRange;
        normalizedPitch = Math.max(0, Math.min(1, normalizedPitch));
        
        gate.targetY = canvas.height - 50 - (normalizedPitch * canvasRange) - gate.height / 2;
        
        // Smooth movement
        const smoothing = 0.05;
        gate.y += (gate.targetY - gate.y) * smoothing;
    }

    // Check if orb passes through gate
    function checkGateCollision() {
        const orbCenterY = orb.y;
        const gateCenterY = gate.y + gate.height / 2;
        const gateTop = gate.y;
        const gateBottom = gate.y + gate.height;
        
        // Check if orb is at gate X position and within gate Y bounds
        if (orb.x >= gate.x - 20 && orb.x <= gate.x + gate.width + 20) {
            if (orbCenterY >= gateTop && orbCenterY <= gateBottom) {
                return true;
            }
        }
        return false;
    }

    // Handle successful gate passage
    function handleSuccess() {
        const currentTime = (Date.now() - gameStartTime) / 1000;
        const timeBonus = Math.max(100 - Math.floor(currentTime * 10), 10);
        const levelBonus = currentLevel * 50;
        const totalPoints = timeBonus + levelBonus;
        
        score += totalPoints;
        successfulHits++;
        
        // Update displays
        scoreDisplay.textContent = score;
        
        // Advance to next level
        currentLevel++;
        if (currentLevel <= levelTargets.length) {
            currentTarget = levelTargets[currentLevel - 1];
            targetNoteDisplay.textContent = currentTarget.note;
            targetFrequencyDisplay.textContent = currentTarget.frequency.toFixed(2) + ' Hz';
            levelDisplay.textContent = currentLevel;
            
            // Reset orb position
            orb.x = 100;
            gameStartTime = Date.now();
            
            statusMessage.textContent = `🎉 Perfect! Level ${currentLevel} - Target: ${currentTarget.note}`;
            statusMessage.className = 'status-message success';
        } else {
            // Game completed
            statusMessage.textContent = `🏆 Congratulations! You've mastered all levels! Final Score: ${score}`;
            statusMessage.className = 'status-message success';
            stopGame();
        }
    }

    // Draw game elements
    function drawGame() {
        if (!ctx || !canvas) return;
        
        // Clear canvas with gradient background
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, 'rgba(26, 26, 46, 0.9)');
        gradient.addColorStop(0.5, 'rgba(16, 16, 32, 0.9)');
        gradient.addColorStop(1, 'rgba(26, 26, 46, 0.9)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw grid lines for reference
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        for (let i = 0; i < canvas.height; i += 40) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(canvas.width, i);
            ctx.stroke();
        }
        
        // Draw orb trail
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i = 1; i < orb.trail.length; i++) {
            const alpha = i / orb.trail.length;
            ctx.globalAlpha = alpha * 0.5;
            ctx.moveTo(orb.trail[i - 1].x, orb.trail[i - 1].y);
            ctx.lineTo(orb.trail[i].x, orb.trail[i].y);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
        
        // Draw gate
        const gateGradient = ctx.createLinearGradient(gate.x, gate.y, gate.x, gate.y + gate.height);
        gateGradient.addColorStop(0, 'rgba(255, 102, 204, 0.8)');
        gateGradient.addColorStop(0.5, 'rgba(255, 102, 204, 0.4)');
        gateGradient.addColorStop(1, 'rgba(255, 102, 204, 0.8)');
        
        // Gate frame
        ctx.fillStyle = gateGradient;
        ctx.fillRect(gate.x, gate.y - 10, gate.width, 10); // Top
        ctx.fillRect(gate.x, gate.y + gate.height, gate.width, 10); // Bottom
        ctx.fillRect(gate.x - 5, gate.y - 10, 5, gate.height + 20); // Left
        ctx.fillRect(gate.x + gate.width, gate.y - 10, 5, gate.height + 20); // Right
        
        // Gate opening glow
        ctx.shadowColor = '#ff66cc';
        ctx.shadowBlur = 20;
        ctx.strokeStyle = '#ff66cc';
        ctx.lineWidth = 2;
        ctx.strokeRect(gate.x, gate.y, gate.width, gate.height);
        ctx.shadowBlur = 0;
        
        // Draw orb
        const orbGradient = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.size);
        orbGradient.addColorStop(0, '#ffffff');
        orbGradient.addColorStop(0.3, '#00ffff');
        orbGradient.addColorStop(1, 'rgba(0, 255, 255, 0.2)');
        
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 15;
        ctx.fillStyle = orbGradient;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Draw target line
        ctx.strokeStyle = 'rgba(255, 102, 204, 0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 5]);
        ctx.beginPath();
        ctx.moveTo(0, gate.y + gate.height / 2);
        ctx.lineTo(canvas.width, gate.y + gate.height / 2);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Move orb forward
        if (isPlaying) {
            orb.x += 1;
            
            // Check for gate collision
            if (checkGateCollision()) {
                handleSuccess();
            }
            
            // Reset if orb goes off screen
            if (orb.x > canvas.width + 50) {
                orb.x = 100;
                totalAttempts++;
            }
        }
        
        // Update accuracy
        if (totalAttempts > 0) {
            const accuracy = Math.round((successfulHits / totalAttempts) * 100);
            accuracyDisplay.textContent = accuracy + '%';
        }
        
        // Update time
        if (isPlaying && gameStartTime) {
            const elapsed = (Date.now() - gameStartTime) / 1000;
            timeDisplay.textContent = elapsed.toFixed(1) + 's';
        }
    }

    // Game loop
    function gameLoop() {
        if (!isPlaying) return;
        
        getCurrentPitch();
        updateOrbPosition();
        updateGatePosition();
        drawGame();
        
        animationId = requestAnimationFrame(gameLoop);
    }

    // Start game
    async function startGame() {
        try {
            statusMessage.textContent = "Requesting microphone access...";
            statusMessage.className = 'status-message info';
            
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

            // Reset game state
            isPlaying = true;
            gameStartTime = Date.now();
            currentLevel = 1;
            score = 0;
            totalAttempts = 0;
            successfulHits = 0;
            currentTarget = levelTargets[0];
            
            // Reset orb
            orb.x = 100;
            orb.y = canvas.height / 2;
            orb.trail = [];
            pitchHistory = [];
            
            // Update displays
            targetNoteDisplay.textContent = currentTarget.note;
            targetFrequencyDisplay.textContent = currentTarget.frequency.toFixed(2) + ' Hz';
            scoreDisplay.textContent = score;
            levelDisplay.textContent = currentLevel;
            accuracyDisplay.textContent = '0%';
            timeDisplay.textContent = '0.0s';
            
            startButton.disabled = true;
            stopButton.disabled = false;
            
            statusMessage.textContent = `🎮 Game Started! Hit the target note: ${currentTarget.note}`;
            statusMessage.className = 'status-message success';
            
            gameLoop();
            
            console.log("AUDIATION STATION: Enhanced pitch training game started");
        } catch (error) {
            statusMessage.textContent = "❌ Error: " + error.message;
            statusMessage.className = 'status-message error';
            console.error("Error starting pitch training:", error);
            
            startButton.disabled = false;
            stopButton.disabled = true;
        }
    }

    // Stop game
    function stopGame() {
        isPlaying = false;
        startButton.disabled = false;
        stopButton.disabled = true;
        
        if (animationId) {
            cancelAnimationFrame(animationId);
        }
        
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
                console.log("AudioContext closed");
            });
        }
        
        statusMessage.textContent = "Game stopped. Click 'Start Game' to play again!";
        statusMessage.className = 'status-message info';
        
        console.log("AUDIATION STATION: Enhanced pitch training game stopped");
    }

    // Event listeners
    if (startButton) {
        startButton.addEventListener("click", startGame);
    }
    
    if (stopButton) {
        stopButton.addEventListener("click", stopGame);
    }

    // Initialize
    loadMicrophones();
    initCanvas();
    
    // Handle window resize
    window.addEventListener('resize', () => {
        initCanvas();
    });

    console.log("AUDIATION STATION: Enhanced Pitch Training initialized successfully");
});
