document.addEventListener("DOMContentLoaded", function() {
    const playButton = document.getElementById("play-seq");
    const stopButton = document.getElementById("stop-seq");
    const recordButton = document.getElementById("record-seq");
    const clearButton = document.getElementById("clear-seq");
    const tempoSlider = document.getElementById("tempo-slider");
    const tempoDisplay = document.getElementById("tempo-display");
    const sequencerGrid = document.getElementById("sequencer-grid");
    const drumPads = document.querySelectorAll(".drum-pad");

    let audioContext;
    let isPlaying = false;
    let isRecording = false;
    let currentStep = 0;
    let tempo = 120;
    let stepInterval;
    let sequence = {
        kick: new Array(16).fill(false),
        snare: new Array(16).fill(false),
        hihat: new Array(16).fill(false),
        cymbal: new Array(16).fill(false)
    };

    // Initialize audio context
    function initAudio() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
    }

    // Create drum sounds using Web Audio API
    function createDrumSound(type) {
        if (!audioContext) return;

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        const filterNode = audioContext.createBiquadFilter();

        oscillator.connect(filterNode);
        filterNode.connect(gainNode);
        gainNode.connect(audioContext.destination);

        const now = audioContext.currentTime;

        switch(type) {
            case 'kick':
                oscillator.frequency.setValueAtTime(60, now);
                oscillator.frequency.exponentialRampToValueAtTime(0.01, now + 0.5);
                gainNode.gain.setValueAtTime(1, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
                oscillator.type = 'sine';
                break;
            
            case 'snare':
                oscillator.frequency.setValueAtTime(200, now);
                oscillator.type = 'triangle';
                filterNode.frequency.setValueAtTime(1000, now);
                gainNode.gain.setValueAtTime(0.7, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                break;
            
            case 'hihat':
                oscillator.frequency.setValueAtTime(10000, now);
                oscillator.type = 'square';
                filterNode.type = 'highpass';
                filterNode.frequency.setValueAtTime(7000, now);
                gainNode.gain.setValueAtTime(0.3, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                break;
            
            case 'cymbal':
                oscillator.frequency.setValueAtTime(3000, now);
                oscillator.type = 'sawtooth';
                filterNode.type = 'bandpass';
                filterNode.frequency.setValueAtTime(8000, now);
                gainNode.gain.setValueAtTime(0.5, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
                break;
        }

        oscillator.start(now);
        oscillator.stop(now + 1);
    }

    // Create sequencer grid
    function createSequencerGrid() {
        sequencerGrid.innerHTML = '';
        
        const tracks = ['kick', 'snare', 'hihat', 'cymbal'];
        const trackLabels = ['KICK', 'SNARE', 'HI-HAT', 'CYMBAL'];
        
        tracks.forEach((track, trackIndex) => {
            // Track label
            const label = document.createElement('div');
            label.className = 'track-label';
            label.textContent = trackLabels[trackIndex];
            sequencerGrid.appendChild(label);
            
            // Step buttons
            for (let step = 0; step < 16; step++) {
                const button = document.createElement('button');
                button.className = 'step-button';
                button.dataset.track = track;
                button.dataset.step = step;
                
                if (sequence[track][step]) {
                    button.classList.add('active');
                }
                
                button.addEventListener('click', () => toggleStep(track, step));
                sequencerGrid.appendChild(button);
            }
        });
    }

    // Toggle step in sequence
    function toggleStep(track, step) {
        sequence[track][step] = !sequence[track][step];
        updateSequencerDisplay();
    }

    // Update sequencer display
    function updateSequencerDisplay() {
        const stepButtons = document.querySelectorAll('.step-button');
        stepButtons.forEach(button => {
            const track = button.dataset.track;
            const step = parseInt(button.dataset.step);
            
            button.classList.remove('active', 'playing');
            
            if (sequence[track][step]) {
                button.classList.add('active');
            }
            
            if (isPlaying && step === currentStep) {
                button.classList.add('playing');
            }
        });
    }

    // Play sequence step
    function playStep() {
        Object.keys(sequence).forEach(track => {
            if (sequence[track][currentStep]) {
                createDrumSound(track);
            }
        });
        
        updateSequencerDisplay();
        currentStep = (currentStep + 1) % 16;
    }

    // Start/stop sequencer
    function startSequencer() {
        if (isPlaying) return;
        
        initAudio();
        isPlaying = true;
        currentStep = 0;
        
        const stepTime = (60 / tempo / 4) * 1000; // 16th notes
        stepInterval = setInterval(playStep, stepTime);
        
        playButton.classList.add('active');
        playButton.textContent = '⏸️ PAUSE';
    }

    function stopSequencer() {
        isPlaying = false;
        clearInterval(stepInterval);
        currentStep = 0;
        
        playButton.classList.remove('active');
        playButton.textContent = '▶️ PLAY';
        updateSequencerDisplay();
    }

    // Clear sequence
    function clearSequence() {
        Object.keys(sequence).forEach(track => {
            sequence[track].fill(false);
        });
        updateSequencerDisplay();
    }

    // Update tempo
    function updateTempo() {
        tempo = parseInt(tempoSlider.value);
        tempoDisplay.textContent = tempo;
        
        if (isPlaying) {
            clearInterval(stepInterval);
            const stepTime = (60 / tempo / 4) * 1000;
            stepInterval = setInterval(playStep, stepTime);
        }
    }

    // Event listeners
    playButton.addEventListener('click', () => {
        if (isPlaying) {
            stopSequencer();
        } else {
            startSequencer();
        }
    });

    stopButton.addEventListener('click', stopSequencer);
    clearButton.addEventListener('click', clearSequence);
    tempoSlider.addEventListener('input', updateTempo);

    // Drum pad event listeners
    drumPads.forEach(pad => {
        pad.addEventListener('click', () => {
            initAudio();
            const sound = pad.dataset.sound;
            createDrumSound(sound);
            
            // Visual feedback
            pad.style.transform = 'scale(0.95)';
            setTimeout(() => {
                pad.style.transform = 'scale(1)';
            }, 100);
        });
    });

    // Record mode (real-time recording)
    recordButton.addEventListener('click', () => {
        isRecording = !isRecording;
        
        if (isRecording) {
            recordButton.classList.add('active');
            recordButton.textContent = '⏺️ STOP REC';
            
            if (!isPlaying) {
                startSequencer();
            }
            
            // Enable real-time recording
            drumPads.forEach(pad => {
                pad.addEventListener('click', recordDrumHit);
            });
        } else {
            recordButton.classList.remove('active');
            recordButton.textContent = '🔴 REC';
            
            // Disable real-time recording
            drumPads.forEach(pad => {
                pad.removeEventListener('click', recordDrumHit);
            });
        }
    });

    function recordDrumHit(event) {
        if (!isRecording || !isPlaying) return;
        
        const sound = event.target.dataset.sound;
        sequence[sound][currentStep] = true;
        updateSequencerDisplay();
    }

    // Initialize
    createSequencerGrid();
    updateTempo();
});
