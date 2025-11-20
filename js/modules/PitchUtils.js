const A4_FREQUENCY = 440;
const A4_MIDI = 69;
const NOTE_NAMES = [
    'C', 'C#', 'D', 'D#', 'E', 'F',
    'F#', 'G', 'G#', 'A', 'A#', 'B',
];

export function midiToFrequency(midiNumber) {
    return A4_FREQUENCY * Math.pow(2, (midiNumber - A4_MIDI) / 12);
}

export function frequencyToMidi(frequency) {
    return A4_MIDI + 12 * Math.log2(frequency / A4_FREQUENCY);
}

export function midiToNoteName(midiNumber) {
    const octave = Math.floor(midiNumber / 12) - 1;
    const noteIndex = ((midiNumber % 12) + 12) % 12;
    return `${NOTE_NAMES[noteIndex]}${octave}`;
}

export function frequencyToNote(frequency, options = {}) {
    const {
        minFrequency = 50,
        maxFrequency = 5000,
        maxCentError = 60,
    } = options;

    if (!frequency || frequency < minFrequency || frequency > maxFrequency) {
        return null;
    }

    const midi = Math.round(frequencyToMidi(frequency));
    const snappedFrequency = midiToFrequency(midi);
    const centsOff = 1200 * Math.log2(frequency / snappedFrequency);

    if (Math.abs(centsOff) > maxCentError) {
        return null;
    }

    return {
        note: midiToNoteName(midi),
        cents: centsOff,
        snappedFrequency,
    };
}
