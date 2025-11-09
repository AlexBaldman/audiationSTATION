document.addEventListener("DOMContentLoaded", function() {
    const startButton = document.getElementById("start-recording");
    const stopButton = document.getElementById("stop-recording");
    const playButton = document.getElementById("play-recording");
    const saveButton = document.getElementById("save-recording");
    const timerDisplay = document.getElementById("recording-timer");
    const statusDisplay = document.getElementById("recorder-status");
    const microphoneSelect = document.getElementById("recorder-microphone-select");
    const leftReel = document.getElementById("left-reel");
    const rightReel = document.getElementById("right-reel");
    const recLight = document.getElementById("rec-light");
    const playLight = document.getElementById("play-light");
    const pauseLight = document.getElementById("pause-light");
    const volumeMeters = document.getElementById("volume-meters");

    let mediaRecorder;
    let audioChunks = [];
    let recordedBlob;
    let isRecording = false;
    let isPlaying = false;
    let startTime;
    let timerInterval;
    let audioContext;
    let analyser;
    let microphone;
    let availableDevices = [];

    // Create volume meters
    function createVolumeMeters() {
        volumeMeters.innerHTML = '';
        for (let i = 0; i < 10; i++) {
            const bar = document.createElement('div');
            bar.className = 'volume-bar';
            const fill = document.createElement('div');
            fill.className = 'volume-fill';
            bar.appendChild(fill);
            volumeMeters.appendChild(bar);
        }
    }

    // Update volume meters
    function updateVolumeMeters() {
        if (!analyser || !isRecording) return;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
        const normalizedLevel = average / 255;

        const volumeBars = document.querySelectorAll('.volume-fill');
        volumeBars.forEach((bar, index) => {
            const threshold = (index + 1) / volumeBars.length;
            if (normalizedLevel > threshold) {
                bar.style.height = '100%';
            } else {
                bar.style.height = '0%';
            }
        });

        if (isRecording) {
            requestAnimationFrame(updateVolumeMeters);
        }
    }

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
        } catch (error) {
            microphoneSelect.innerHTML = '<option value="">Error loading microphones</option>';
        }
    }

    // Format time display
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const centisecs = Math.floor((seconds % 1) * 100);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${centisecs.toString().padStart(2, '0')}`;
    }

    // Update timer
    function updateTimer() {
        if (isRecording || isPlaying) {
            const elapsed = (Date.now() - startTime) / 1000;
            timerDisplay.textContent = formatTime(elapsed);
        }
    }

    // Start recording
    async function startRecording() {
        try {
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
            
            // Set up audio analysis for volume meters
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            microphone = audioContext.createMediaStreamSource(stream);
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            microphone.connect(analyser);
            
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];
            
            mediaRecorder.ondataavailable = event => {
                audioChunks.push(event.data);
            };
            
            mediaRecorder.onstop = () => {
                recordedBlob = new Blob(audioChunks, { type: 'audio/wav' });
                playButton.disabled = false;
                saveButton.disabled = false;
            };
            
            mediaRecorder.start();
            isRecording = true;
            startTime = Date.now();
            
            // UI updates
            startButton.disabled = true;
            stopButton.disabled = false;
            recLight.classList.add('rec');
            leftReel.classList.add('spinning');
            rightReel.classList.add('spinning');
            statusDisplay.textContent = "🔴 Recording in progress...";
            
            // Start timer and volume meters
            timerInterval = setInterval(updateTimer, 10);
            updateVolumeMeters();
            
        } catch (error) {
            statusDisplay.textContent = "❌ Error: " + error.message;
        }
    }

    // Stop recording
    function stopRecording() {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
            isRecording = false;
            
            // Stop all tracks
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
            
            // UI updates
            startButton.disabled = false;
            stopButton.disabled = true;
            recLight.classList.remove('rec');
            leftReel.classList.remove('spinning');
            rightReel.classList.remove('spinning');
            statusDisplay.textContent = "⏹️ Recording stopped. Ready to play or save.";
            
            clearInterval(timerInterval);
            
            // Clear volume meters
            const volumeBars = document.querySelectorAll('.volume-fill');
            volumeBars.forEach(bar => {
                bar.style.height = '0%';
            });
        }
    }

    // Play recording
    function playRecording() {
        if (recordedBlob) {
            const audio = new Audio(URL.createObjectURL(recordedBlob));
            
            audio.onplay = () => {
                isPlaying = true;
                startTime = Date.now();
                playButton.disabled = true;
                playLight.classList.add('play');
                leftReel.classList.add('spinning');
                rightReel.classList.add('spinning');
                statusDisplay.textContent = "▶️ Playing recording...";
                timerInterval = setInterval(updateTimer, 10);
            };
            
            audio.onended = () => {
                isPlaying = false;
                playButton.disabled = false;
                playLight.classList.remove('play');
                leftReel.classList.remove('spinning');
                rightReel.classList.remove('spinning');
                statusDisplay.textContent = "⏹️ Playback finished.";
                clearInterval(timerInterval);
                timerDisplay.textContent = "00:00.00";
            };
            
            audio.play();
        }
    }

    // Save recording
    function saveRecording() {
        if (recordedBlob) {
            const url = URL.createObjectURL(recordedBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `audiation-recording-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.wav`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            statusDisplay.textContent = "💾 Recording saved successfully!";
            
            // Brief visual feedback
            saveButton.style.transform = 'scale(0.95)';
            setTimeout(() => {
                saveButton.style.transform = 'scale(1)';
            }, 150);
        }
    }

    // Event listeners
    startButton.addEventListener('click', startRecording);
    stopButton.addEventListener('click', stopRecording);
    playButton.addEventListener('click', playRecording);
    saveButton.addEventListener('click', saveRecording);

    // Initialize
    loadMicrophones();
    createVolumeMeters();
});
