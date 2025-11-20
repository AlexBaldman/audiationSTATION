export function createAudioContext() {
    if (typeof window === 'undefined') {
        throw new Error('AudioContext is unavailable in this environment');
    }
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) {
        throw new Error('Web Audio API is not supported in this browser');
    }
    return new AudioContextCtor();
}

export function stopMediaStream(stream) {
    if (!stream) return;
    stream.getTracks().forEach(track => track.stop());
}

export async function closeAudioContext(audioContext) {
    if (!audioContext) return;
    try {
        await audioContext.close();
    } catch (error) {
        console.warn('Unable to close AudioContext cleanly:', error);
    }
}

export function cancelAnimationFrameSafe(id) {
    if (typeof window === 'undefined' || !window.cancelAnimationFrame || !id) return;
    window.cancelAnimationFrame(id);
}
