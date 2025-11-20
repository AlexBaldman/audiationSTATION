// Inter-Section Connectivity System for AUDIATION STATION
// Allows data sharing and export/import between different sections

export class AudiationStationConnector {
    constructor() {
        this.sharedData = {
            recordings: [],
            detectedNotes: [],
            beatPatterns: [],
            audioSettings: {
                sampleRate: 44100,
                bufferSize: 4096,
                inputDevice: null
            }
        };

        this.init();
    }

    init() {
        // Load saved data from localStorage
        this.loadSharedData();

        // Set up event listeners for cross-section communication
        this.setupEventListeners();

        // Initialize export/import functionality
        this.setupExportImport();

        console.log('AUDIATION STATION: Inter-section connectivity initialized');
    }

    // Save data to localStorage
    saveSharedData() {
        try {
            localStorage.setItem('audiationStationData', JSON.stringify(this.sharedData));
        } catch (error) {
            console.warn('Could not save data to localStorage:', error);
        }
    }

    // Load data from localStorage
    loadSharedData() {
        try {
            const saved = localStorage.getItem('audiationStationData');
            if (saved) {
                this.sharedData = { ...this.sharedData, ...JSON.parse(saved) };
            }
        } catch (error) {
            console.warn('Could not load data from localStorage:', error);
        }
    }

    // Add a recording to shared data
    addRecording(recordingData) {
        const recording = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            data: recordingData,
            type: 'audio',
            source: 'recorder'
        };

        this.sharedData.recordings.push(recording);
        this.saveSharedData();
        this.notifyDataUpdate('recording-added', recording);

        return recording.id;
    }

    // Add detected notes to shared data
    addDetectedNotes(notes) {
        const noteData = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            notes: notes,
            source: 'note-detection'
        };

        this.sharedData.detectedNotes.push(noteData);
        this.saveSharedData();
        this.notifyDataUpdate('notes-detected', noteData);

        return noteData.id;
    }

    // Add beat pattern to shared data
    addBeatPattern(pattern) {
        const beatData = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            pattern: pattern,
            source: 'beatbox'
        };

        this.sharedData.beatPatterns.push(beatData);
        this.saveSharedData();
        this.notifyDataUpdate('beat-pattern-added', beatData);

        return beatData.id;
    }

    // Get all recordings
    getRecordings() {
        return this.sharedData.recordings;
    }

    // Get all detected notes
    getDetectedNotes() {
        return this.sharedData.detectedNotes;
    }

    // Get all beat patterns
    getBeatPatterns() {
        return this.sharedData.beatPatterns;
    }

    // Export data to file
    exportData(type = 'all') {
        let dataToExport = {};

        switch (type) {
            case 'recordings':
                dataToExport = { recordings: this.sharedData.recordings };
                break;
            case 'notes':
                dataToExport = { detectedNotes: this.sharedData.detectedNotes };
                break;
            case 'beats':
                dataToExport = { beatPatterns: this.sharedData.beatPatterns };
                break;
            default:
                dataToExport = this.sharedData;
        }

        const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
            type: 'application/json'
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audiation-station-${type}-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log(`AUDIATION STATION: Exported ${type} data`);
    }

    // Import data from file
    importData(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const importedData = JSON.parse(e.target.result);

                    // Merge imported data with existing data
                    if (importedData.recordings) {
                        this.sharedData.recordings = [...this.sharedData.recordings, ...importedData.recordings];
                    }
                    if (importedData.detectedNotes) {
                        this.sharedData.detectedNotes = [...this.sharedData.detectedNotes, ...importedData.detectedNotes];
                    }
                    if (importedData.beatPatterns) {
                        this.sharedData.beatPatterns = [...this.sharedData.beatPatterns, ...importedData.beatPatterns];
                    }

                    this.saveSharedData();
                    this.notifyDataUpdate('data-imported', importedData);

                    console.log('AUDIATION STATION: Data imported successfully');
                    resolve(importedData);
                } catch (error) {
                    console.error('AUDIATION STATION: Error importing data:', error);
                    reject(error);
                }
            };

            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    // Set up event listeners for cross-section communication
    setupEventListeners() {
        // Listen for custom events from different sections
        document.addEventListener('audiation-recording-complete', (e) => {
            this.addRecording(e.detail);
        });

        document.addEventListener('audiation-note-detected', (e) => {
            this.addDetectedNotes(e.detail);
        });

        document.addEventListener('audiation-beat-created', (e) => {
            this.addBeatPattern(e.detail);
        });
    }

    // Notify other sections of data updates
    notifyDataUpdate(type, data) {
        const event = new CustomEvent('audiation-data-update', {
            detail: { type, data }
        });
        document.dispatchEvent(event);
    }

    // Set up export/import UI elements
    setupExportImport() {
        // Add export/import buttons to each section if they don't exist
        this.addExportImportButtons();
    }

    // Add export/import buttons to sections
    addExportImportButtons() {
        const sections = ['note-detection', 'recorder', 'beatbox'];

        sections.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section && !section.querySelector('.export-import-controls')) {
                const controls = this.createExportImportControls(sectionId);
                section.appendChild(controls);
            }
        });
    }

    // Create export/import control elements
    createExportImportControls(sectionId) {
        const container = document.createElement('div');
        container.className = 'export-import-controls';
        container.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            display: flex;
            gap: 10px;
            z-index: 100;
        `;

        // Export button
        const exportBtn = document.createElement('button');
        exportBtn.textContent = '📤 Export';
        exportBtn.className = 'export-btn';
        exportBtn.style.cssText = `
            background: linear-gradient(45deg, #00ff00, #00ffff);
            color: #000;
            border: none;
            padding: 10px 15px;
            border-radius: 20px;
            cursor: pointer;
            font-weight: bold;
            transition: all 0.3s ease;
        `;

        exportBtn.addEventListener('click', () => {
            const dataType = this.getSectionDataType(sectionId);
            this.exportData(dataType);
        });

        // Import button
        const importBtn = document.createElement('button');
        importBtn.textContent = '📥 Import';
        importBtn.className = 'import-btn';
        importBtn.style.cssText = exportBtn.style.cssText;
        importBtn.style.background = 'linear-gradient(45deg, #ff00ff, #ffff00)';

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        fileInput.style.display = 'none';

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.importData(file).then(() => {
                    alert('Data imported successfully!');
                }).catch((error) => {
                    alert('Error importing data: ' + error.message);
                });
            }
        });

        importBtn.addEventListener('click', () => {
            fileInput.click();
        });

        container.appendChild(exportBtn);
        container.appendChild(importBtn);
        container.appendChild(fileInput);

        return container;
    }

    // Get data type for section
    getSectionDataType(sectionId) {
        switch (sectionId) {
            case 'note-detection': return 'notes';
            case 'recorder': return 'recordings';
            case 'beatbox': return 'beats';
            default: return 'all';
        }
    }

    // Clear all data
    clearAllData() {
        this.sharedData = {
            recordings: [],
            detectedNotes: [],
            beatPatterns: [],
            audioSettings: {
                sampleRate: 44100,
                bufferSize: 4096,
                inputDevice: null
            }
        };
        this.saveSharedData();
        this.notifyDataUpdate('data-cleared', {});
    }
}
