/**
 * Audio Recorder - Voice recording functionality
 */

class AudioRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.recordedAudio = null;
        
        this.recordBtn = document.getElementById('record-btn');
        this.stopBtn = document.getElementById('stop-btn');
        this.playBtn = document.getElementById('play-btn');
        this.saveBtn = document.getElementById('save-btn');
        this.statusDisplay = document.getElementById('recorder-status');
        this.timerDisplay = document.getElementById('recorder-timer');
        
        this.startTime = 0;
        this.timerInterval = null;
        
        this.init();
    }

    init() {
        if (this.recordBtn) {
            this.recordBtn.addEventListener('click', () => this.startRecording());
        }
        if (this.stopBtn) {
            this.stopBtn.addEventListener('click', () => this.stopRecording());
        }
        if (this.playBtn) {
            this.playBtn.addEventListener('click', () => this.playRecording());
        }
        if (this.saveBtn) {
            this.saveBtn.addEventListener('click', () => this.saveRecording());
        }
        
        this.updateStatus('Ready to record');
    }

    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];
            
            this.mediaRecorder.ondataavailable = (event) => {
                this.audioChunks.push(event.data);
            };
            
            this.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
                this.recordedAudio = URL.createObjectURL(audioBlob);
                this.updateStatus('Recording complete');
                this.stopTimer();
            };
            
            this.mediaRecorder.start();
            this.isRecording = true;
            this.updateStatus('Recording...');
            this.startTimer();
            
        } catch (error) {
            console.error('Error starting recording:', error);
            this.updateStatus('Error: Microphone access denied');
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            
            // Stop all tracks
            this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
    }

    playRecording() {
        if (this.recordedAudio) {
            const audio = new Audio(this.recordedAudio);
            audio.play();
            this.updateStatus('Playing...');
            
            audio.onended = () => {
                this.updateStatus('Playback complete');
            };
        } else {
            this.updateStatus('No recording to play');
        }
    }

    saveRecording() {
        if (this.recordedAudio) {
            const a = document.createElement('a');
            a.href = this.recordedAudio;
            a.download = `recording_${new Date().getTime()}.wav`;
            a.click();
            this.updateStatus('Recording saved');
        } else {
            this.updateStatus('No recording to save');
        }
    }

    startTimer() {
        this.startTime = Date.now();
        this.timerInterval = setInterval(() => {
            const elapsed = Date.now() - this.startTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            const centiseconds = Math.floor((elapsed % 1000) / 10);
            
            const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
            
            if (this.timerDisplay) {
                this.timerDisplay.textContent = timeString;
            }
        }, 10);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    updateStatus(message) {
        if (this.statusDisplay) {
            this.statusDisplay.textContent = message;
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.audioRecorder = new AudioRecorder();
});

