document.addEventListener("DOMContentLoaded", function() {
    const startButton = document.getElementById("start-game");
    const stopButton = document.getElementById("stop-game");
    const playNoteButton = document.getElementById("play-note");
    const nextNoteButton = document.getElementById("next-note");
    const replayButton = document.getElementById("replay-note");
    const pianoKeyboard = document.getElementById("piano-keyboard");
    const feedbackMessage = document.getElementById("feedback-message");
    const correctAnswer = document.getElementById("correct-answer");
    const scoreDisplay = document.getElementById("score");
    const streakDisplay = document.getElementById("streak");
    const accuracyDisplay = document.getElementById("accuracy");
    const difficultySelect = document.getElementById("difficulty");

    let audioContext;
    let isPlaying = false;
    let currentNote = null;
    let score = 0;
    let streak = 0;
    let totalAttempts = 0;
    let correctAttempts = 0;
    let hasAnswered = false;

    // Note frequencies and ranges for different difficulties
    const noteFrequencies = {
        "C3": 130.81, "C#3": 138.59, "D3": 146.83, "D#3": 155.56, "E3": 164.81, "F3": 174.61,
        "F#3": 185.00, "G3": 196.00, "G#3": 207.65, "A3": 220.00, "A#3": 233.08, "B3": 246.94,
        "C4": 261.63, "C#4": 277.18, "D4": 293.66, "D#4": 311.13, "E4": 329.63, "F4": 349.23,
        "F#4": 369.99, "G4": 392.00, "G#4": 415.30, "A4": 440.00, "A#4": 466.16, "B4": 493.88,
        "C5": 523.25, "C#5": 554.37, "D5": 587.33, "D#5": 622.25, "E5": 659.25, "F5": 698.46,
        "F#5": 739.99, "G5": 783.99, "G#5": 830.61, "A5": 880.00, "A#5": 932.33, "B5": 987.77,
        "C6": 1046.50
    };

    const difficultyRanges = {
        easy: ["C4", "C#4", "D4", "D#4", "E4", "F4", "F#4", "G4", "G#4", "A4", "A#4", "B4"],
        medium: ["C4", "C#4", "D4", "D#4", "E4", "F4", "F#4", "G4", "G#4", "A4", "A#4", "B4", "C5"],
        hard: Object.keys(noteFrequencies)
    };

    // Create piano keyboard
    function createPianoKeyboard() {
        pianoKeyboard.innerHTML = '';
        const currentRange = difficultyRanges[difficultySelect.value];
        
        currentRange.forEach((note, index) => {
            const button = document.createElement('button');
            button.className = note.includes('#') ? 'piano-key black-key' : 'piano-key white-key';
            button.textContent = note;
            button.dataset.note = note;
            
            if (note.includes('#')) {
                const prevWhiteKey = pianoKeyboard.lastElementChild;
                if (prevWhiteKey) {
                    button.style.left = (prevWhiteKey.offsetLeft + 28) + 'px';
                }
            }
            
            button.addEventListener('click', () => selectNote(note));
            pianoKeyboard.appendChild(button);
        });
    }

    // Play a note using Web Audio API
    function playNote(frequency, duration = 1.0) {
        if (!audioContext) return;
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
    }

    // Generate random note
    function generateRandomNote() {
        const currentRange = difficultyRanges[difficultySelect.value];
        const randomIndex = Math.floor(Math.random() * currentRange.length);
        currentNote = currentRange[randomIndex];
        hasAnswered = false;
        
        feedbackMessage.textContent = "🎵 Listen to the note, then click it on the piano!";
        feedbackMessage.className = "feedback-message waiting";
        correctAnswer.textContent = "";
        
        // Reset piano key colors
        document.querySelectorAll('.piano-key').forEach(key => {
            key.style.background = key.classList.contains('black-key') ? 
                'linear-gradient(180deg, #333, #000)' : 
                'linear-gradient(180deg, #ffffff, #f0f0f0)';
        });
    }

    // Select note from piano
    function selectNote(selectedNote) {
        if (!isPlaying || hasAnswered) return;
        
        hasAnswered = true;
        totalAttempts++;
        
        const selectedKey = document.querySelector(`[data-note="${selectedNote}"]`);
        const correctKey = document.querySelector(`[data-note="${currentNote}"]`);
        
        if (selectedNote === currentNote) {
            // Correct answer
            correctAttempts++;
            streak++;
            score += (streak > 5 ? 15 : 10);
            
            selectedKey.style.background = 'linear-gradient(180deg, #00ff00, #00cc00)';
            feedbackMessage.textContent = "🎉 Correct! +" + (streak > 5 ? 15 : 10) + " points!";
            feedbackMessage.className = "feedback-message correct";
            
            if (streak > 5) {
                feedbackMessage.textContent += " 🔥 Streak bonus!";
            }
        } else {
            // Wrong answer
            streak = 0;
            selectedKey.style.background = 'linear-gradient(180deg, #ff3366, #cc1144)';
            correctKey.style.background = 'linear-gradient(180deg, #00ff00, #00cc00)';
            
            feedbackMessage.textContent = "❌ Wrong! Try again!";
            feedbackMessage.className = "feedback-message incorrect";
            correctAnswer.textContent = `The correct answer was ${currentNote}`;
        }
        
        updateStats();
        
        // Auto-advance after 2 seconds
        setTimeout(() => {
            if (isPlaying) {
                generateRandomNote();
            }
        }, 2000);
    }

    // Update game statistics
    function updateStats() {
        scoreDisplay.textContent = score;
        streakDisplay.textContent = streak;
        const accuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;
        accuracyDisplay.textContent = accuracy + "%";
    }

    // Start game
    startButton.addEventListener("click", async () => {
        if (isPlaying) return;
        
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }
            
            isPlaying = true;
            startButton.disabled = true;
            stopButton.disabled = false;
            playNoteButton.disabled = false;
            nextNoteButton.disabled = false;
            replayButton.disabled = false;
            
            createPianoKeyboard();
            generateRandomNote();
            
        } catch (error) {
            feedbackMessage.textContent = "❌ Audio initialization failed!";
            feedbackMessage.className = "feedback-message incorrect";
        }
    });

    // Stop game
    stopButton.addEventListener("click", () => {
        isPlaying = false;
        startButton.disabled = false;
        stopButton.disabled = true;
        playNoteButton.disabled = true;
        nextNoteButton.disabled = true;
        replayButton.disabled = true;
        
        feedbackMessage.textContent = "Game stopped. Click 'Start Game' to play again!";
        feedbackMessage.className = "feedback-message waiting";
        correctAnswer.textContent = "";
    });

    // Play current note
    playNoteButton.addEventListener("click", () => {
        if (currentNote && audioContext) {
            playNote(noteFrequencies[currentNote]);
        }
    });

    // Replay current note
    replayButton.addEventListener("click", () => {
        if (currentNote && audioContext) {
            playNote(noteFrequencies[currentNote]);
        }
    });

    // Next note
    nextNoteButton.addEventListener("click", () => {
        if (isPlaying) {
            generateRandomNote();
        }
    });

    // Difficulty change
    difficultySelect.addEventListener("change", () => {
        if (isPlaying) {
            createPianoKeyboard();
            generateRandomNote();
        }
    });

    // Initialize keyboard
    createPianoKeyboard();
});
