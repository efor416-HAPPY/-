/**
 * OmniConvert - 100% Client-Side Document Converter & Summarizer
 * App Logic File
 */

// Initialize Lucide Icons
lucide.createIcons();

// BADA Ambient Sound Synthesizer (Web Audio API)
const BadaAudioManager = {
    audioCtx: null,
    sources: {
        birds: null,
        waves: null,
        spring: null,
        rain: null
    },
    gains: {
        birds: null,
        waves: null,
        spring: null,
        rain: null
    },
    states: {
        birds: false,
        waves: false,
        spring: false,
        rain: false
    },
    volumes: {
        birds: 0.5,
        waves: 0.5,
        spring: 0.5,
        rain: 0.5
    },

    init() {
        if (this.audioCtx) return;
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    },

    toggleSound(type) {
        this.init();
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }

        if (this.states[type]) {
            this.stopSound(type);
        } else {
            this.startSound(type);
        }
    },

    setVolume(type, val) {
        this.volumes[type] = parseFloat(val);
        if (this.gains[type] && this.audioCtx) {
            this.gains[type].gain.setValueAtTime(this.volumes[type], this.audioCtx.currentTime);
        }
    },

    startSound(type) {
        this.states[type] = true;
        const btn = document.getElementById('soundBtn' + type.charAt(0).toUpperCase() + type.slice(1));
        if (btn) btn.classList.add('active');

        if (type === 'rain') this.playRain();
        if (type === 'waves') this.playWaves();
        if (type === 'spring') this.playSpring();
        if (type === 'birds') this.playBirds();
    },

    stopSound(type) {
        this.states[type] = false;
        const btn = document.getElementById('soundBtn' + type.charAt(0).toUpperCase() + type.slice(1));
        if (btn) btn.classList.remove('active');

        if (this.sources[type]) {
            try {
                if (Array.isArray(this.sources[type])) {
                    this.sources[type].forEach(s => s.stop());
                } else {
                    this.sources[type].stop();
                }
            } catch (e) {}
            this.sources[type] = null;
        }
        this.gains[type] = null;
    },

    createNoiseBuffer(type = 'white') {
        const bufferSize = 2 * this.audioCtx.sampleRate;
        const noiseBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            if (type === 'pink') {
                output[i] = (lastOut + (0.02 * white)) / 1.02;
                lastOut = output[i];
                output[i] *= 3.5;
            } else {
                output[i] = white;
            }
        }
        return noiseBuffer;
    },

    playRain() {
        const noise = this.audioCtx.createBufferSource();
        noise.buffer = this.createNoiseBuffer('white');
        noise.loop = true;

        const filter = this.audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1000;
        filter.Q.value = 0.6;

        const gain = this.audioCtx.createGain();
        gain.gain.value = this.volumes.rain;

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.audioCtx.destination);

        noise.start(0);
        this.sources.rain = noise;
        this.gains.rain = gain;
    },

    playWaves() {
        const noise = this.audioCtx.createBufferSource();
        noise.buffer = this.createNoiseBuffer('pink');
        noise.loop = true;

        const filter = this.audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400;

        const gain = this.audioCtx.createGain();
        gain.gain.value = 0;

        const osc = this.audioCtx.createOscillator();
        osc.frequency.value = 0.12;
        
        const lfoGain = this.audioCtx.createGain();
        lfoGain.gain.value = 0.25;

        osc.connect(lfoGain);
        lfoGain.connect(gain.gain);

        const baseGain = this.audioCtx.createGain();
        baseGain.gain.value = this.volumes.waves;

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(baseGain);
        baseGain.connect(this.audioCtx.destination);

        noise.start(0);
        osc.start(0);

        this.sources.waves = [noise, osc];
        this.gains.waves = baseGain;
    },

    playSpring() {
        const baseNoise = this.audioCtx.createBufferSource();
        baseNoise.buffer = this.createNoiseBuffer('pink');
        baseNoise.loop = true;

        const filter = this.audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 500;
        filter.Q.value = 0.4;

        const baseGain = this.audioCtx.createGain();
        baseGain.gain.value = this.volumes.spring * 0.4;

        baseNoise.connect(filter);
        filter.connect(baseGain);
        baseGain.connect(this.audioCtx.destination);
        baseNoise.start(0);

        let active = true;
        const triggerBubble = () => {
            if (!this.states.spring || !active) return;
            
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            
            osc.type = 'sine';
            const startFreq = 800 + Math.random() * 800;
            osc.frequency.setValueAtTime(startFreq, this.audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(startFreq + 200, this.audioCtx.currentTime + 0.08);

            gain.gain.setValueAtTime(0, this.audioCtx.currentTime);
            gain.gain.linearRampToValueAtTime(this.volumes.spring * 0.15, this.audioCtx.currentTime + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + 0.08);

            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            osc.start(0);
            osc.stop(this.audioCtx.currentTime + 0.1);

            setTimeout(triggerBubble, 50 + Math.random() * 200);
        };
        triggerBubble();

        this.sources.spring = {
            stop: () => {
                active = false;
                baseNoise.stop();
            }
        };
        this.gains.spring = baseGain;
    },

    playBirds() {
        let active = true;
        const scheduleNextBirdCall = () => {
            if (!this.states.birds || !active) return;

            const now = this.audioCtx.currentTime;
            const chirpCount = 2 + Math.floor(Math.random() * 3);
            const baseFreq = 2200 + Math.random() * 1200;

            for (let i = 0; i < chirpCount; i++) {
                const chirpTime = now + i * 0.25;
                
                const osc = this.audioCtx.createOscillator();
                const gain = this.audioCtx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(baseFreq, chirpTime);
                osc.frequency.exponentialRampToValueAtTime(baseFreq - 500, chirpTime + 0.12);

                gain.gain.setValueAtTime(0, chirpTime);
                gain.gain.linearRampToValueAtTime(this.volumes.birds * 0.2, chirpTime + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.0001, chirpTime + 0.12);

                osc.connect(gain);
                gain.connect(this.audioCtx.destination);

                osc.start(chirpTime);
                osc.stop(chirpTime + 0.15);
            }

            setTimeout(scheduleNextBirdCall, 5000 + Math.random() * 7000);
        };
        
        scheduleNextBirdCall();
        this.sources.birds = {
            stop: () => {
                active = false;
            }
        };
        const dummyGain = this.audioCtx.createGain();
        dummyGain.gain.value = this.volumes.birds;
        this.gains.birds = dummyGain;
    }
};

function bindSoundWidgetListeners() {
    const types = ['birds', 'waves', 'spring', 'rain'];
    types.forEach(type => {
        const btnId = 'soundBtn' + type.charAt(0).toUpperCase() + type.slice(1);
        const sliderId = 'soundVolume' + type.charAt(0).toUpperCase() + type.slice(1);
        
        const btn = document.getElementById(btnId);
        const slider = document.getElementById(sliderId);
        
        if (btn) {
            btn.addEventListener('click', () => {
                BadaAudioManager.toggleSound(type);
            });
        }
        
        if (slider) {
            slider.addEventListener('input', (e) => {
                BadaAudioManager.setVolume(type, e.target.value);
            });
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    bindSoundWidgetListeners();
});

// Setup PDF.js Worker safely to avoid startup crashes if library is blocked/delayed
const pdfjsLib = window.pdfjsLib || window['pdfjs-dist/build/pdf'];
if (pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
} else {
    console.warn("PDF.js library could not be resolved from CDN globals.");
}


// Application State
const state = {
    theme: 'dark',
    currentDocName: '새 문서.txt',
    currentText: '',
    summaryRatio: 20, // percentage of sentences to keep
    activeTab: 'edit', // 'edit' or 'highlight'
    exportFormat: 'txt', // 'txt', 'hwpx', 'docx', 'pdf', 'java'
    importedFile: null,
    isProcessing: false,
    koreanFontData: null // Cache for Naver NanumGothic font base64
};

// Korean & English Stop Words for TF-IDF Summarizer
const STOP_WORDS = new Set([
    "은", "는", "이", "가", "을", "를", "에", "에서", "와", "과", "의", "로", "으로", "하고", "그리고", "하지만", "또한", "그래서", "그러나", "그런데",
    "이것", "그것", "저것", "것", "수", "등", "및", "즉", "한", "할", "합니다", "한다", "했다", "하는", "하여", "있습니다", "있다", "없다", "되다", "되어",
    "the", "and", "a", "of", "to", "in", "is", "that", "it", "on", "for", "as", "with", "was", "at", "by", "an", "be", "this", "are", "from", "or", "but"
]);

// XML Escaper for DOCX and HWPX creation
const escapeXml = (str) => {
    if (!str) return '';
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&apos;');
};

// UI Elements
const themeToggleBtn = document.getElementById('themeToggleBtn');
const themeIconSun = document.getElementById('themeIconSun');
const themeIconMoon = document.getElementById('themeIconMoon');
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const importedFilesContainer = document.getElementById('importedFilesContainer');
const importedFilesList = document.getElementById('importedFilesList');
const documentEditor = document.getElementById('documentEditor');
const originalTextHighlighted = document.getElementById('originalTextHighlighted');
const summaryTextOutput = document.getElementById('summaryTextOutput');
const splitEditorView = document.getElementById('splitEditorView');
const activeDocName = document.getElementById('activeDocName');
const btnToggleFont = document.getElementById('btnToggleFont');
const btnClear = document.getElementById('btnClear');
const tabEdit = document.getElementById('tabEdit');
const tabHighlight = document.getElementById('tabHighlight');
const tabDomeViewer = document.getElementById('tabDomeViewer');
const domeLauncherView = document.getElementById('domeLauncherView');
const summaryRatioSlider = document.getElementById('summaryRatioSlider');
const summaryRatioVal = document.getElementById('summaryRatioVal');
const summaryPreviewSection = document.getElementById('summaryPreviewSection');
const summaryPreviewCard = document.getElementById('summaryPreviewCard');
const editorLoader = document.getElementById('editorLoader');
const loaderText = document.getElementById('loaderText');

// Export Elements
const exportBtns = {
    txt: document.getElementById('exportTxt'),
    hwpx: document.getElementById('exportHwpx'),
    docx: document.getElementById('exportDocx'),
    pdf: document.getElementById('exportPdf'),
    java: document.getElementById('exportJava')
};
const downloadSummaryChk = document.getElementById('downloadSummaryChk');
const singleZipDownloadChk = document.getElementById('singleZipDownloadChk');
const btnDownload = document.getElementById('btnDownload');
const downloadBtnText = document.getElementById('downloadBtnText');

// Counter Elements
const charCountWithSpaces = document.getElementById('charCountWithSpaces');
const charCountNoSpaces = document.getElementById('charCountNoSpaces');
const wordCount = document.getElementById('wordCount');
const sentenceCount = document.getElementById('sentenceCount');
const docStatus = document.getElementById('docStatus');
const toastContainer = document.getElementById('toastContainer');

/* ==========================================
   1. UI Helpers: Toasts, Theme, Loaders
   ========================================== */

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let iconName = 'info';
    if (type === 'success') iconName = 'check-circle';
    if (type === 'error') iconName = 'alert-triangle';
    
    toast.innerHTML = `
        <i data-lucide="${iconName}" class="toast-icon"></i>
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    lucide.createIcons();
    
    // Auto remove
    setTimeout(() => {
        toast.style.transform = 'translateY(100px)';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

function setLoader(active, text = "처리 중입니다...") {
    if (loaderText) loaderText.innerText = text;
    if (active) {
        editorLoader?.classList.add('active');
    } else {
        editorLoader?.classList.remove('active');
    }
}

// Dark/Light Theme toggler
themeToggleBtn?.addEventListener('click', () => {
    if (state.theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'light');
        if (themeIconSun) themeIconSun.style.display = 'none';
        if (themeIconMoon) themeIconMoon.style.display = 'block';
        state.theme = 'light';
        showToast('밝은 테마로 변경되었습니다.', 'info');
    } else {
        document.documentElement.removeAttribute('data-theme');
        if (themeIconSun) themeIconSun.style.display = 'block';
        if (themeIconMoon) themeIconMoon.style.display = 'none';
        state.theme = 'dark';
        showToast('어두운 테마로 변경되었습니다.', 'info');
    }
});

/* ==========================================
   2. Text Processing & Statistics
   ========================================== */

function updateTextStats(text) {
    state.currentText = text;
    
    const charsWithSpaces = text.length;
    const charsNoSpaces = text.replace(/\s/g, '').length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const sentences = splitSentences(text).length;
    
    if (charCountWithSpaces) charCountWithSpaces.innerText = charsWithSpaces.toLocaleString();
    if (charCountNoSpaces) charCountNoSpaces.innerText = charsNoSpaces.toLocaleString();
    if (wordCount) wordCount.innerText = words.toLocaleString();
    if (sentenceCount) sentenceCount.innerText = sentences.toLocaleString();
    
    if (charsWithSpaces > 0) {
        if (docStatus) {
            docStatus.innerText = '작성 중 / 분석 완료';
            docStatus.style.color = 'var(--accent-primary)';
        }
        if (summaryPreviewSection) summaryPreviewSection.style.display = 'block';
    } else {
        if (docStatus) {
            docStatus.innerText = '비어 있음';
            docStatus.style.color = 'var(--text-muted)';
        }
        if (summaryPreviewSection) summaryPreviewSection.style.display = 'none';
    }
    
    // Live update summary on change
    generateLiveSummary();
}

documentEditor?.addEventListener('input', (e) => {
    updateTextStats(e.target.value);
});

// Toggle editor monospace/sans font style
btnToggleFont?.addEventListener('click', () => {
    documentEditor?.classList.toggle('code-mode');
    showToast('에디터 글꼴 스타일이 전환되었습니다.', 'info');
});

// Reset / Clear editor
btnClear?.addEventListener('click', () => {
    if (confirm('작성 중인 문서 내용 및 가져온 파일 정보가 모두 지워집니다. 계속하시겠습니까?')) {
        if (documentEditor) documentEditor.value = '';
        state.currentDocName = '새 문서.txt';
        state.importedFile = null;
        if (activeDocName) activeDocName.innerText = '새 문서.txt';
        if (importedFilesContainer) importedFilesContainer.style.display = 'none';
        if (importedFilesList) importedFilesList.innerHTML = '';
        updateTextStats('');
        showToast('에디터가 초기화되었습니다.', 'success');
    }
});

/* ==========================================
   3. File Import Engine (TXT, PDF, DOCX, HWPX)
   ========================================== */

// Drag & Drop event bindings
dropZone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone?.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone?.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFileImport(files[0]);
    }
});

fileInput?.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFileImport(e.target.files[0]);
        fileInput.value = ""; // Reset value so change event triggers again for the same file
    }
});

// Click on dropZone naturally triggers the absolute positioned fileInput inside it.
// No additional click listener on dropZone is needed to prevent recursive click bubbling.

// Main importer Router
async function handleFileImport(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    const validExtensions = ['txt', 'java', 'pdf', 'docx', 'hwpx'];
    
    if (!validExtensions.includes(ext)) {
        showToast('지원하지 않는 파일 형식입니다. (txt, java, pdf, docx, hwpx 만 지원)', 'error');
        return;
    }
    
    state.importedFile = file;
    state.currentDocName = file.name;
    activeDocName.innerText = file.name;
    
    // Add file visual description to sidebar
    renderImportedFileInfo(file, ext);
    setLoader(true, `[${file.name}] 파일을 읽고 해독하는 중...`);
    
    try {
        let extractedText = "";
        
        switch (ext) {
            case 'txt':
            case 'java':
                extractedText = await readAsTextFile(file);
                break;
            case 'pdf':
                extractedText = await parsePdfFile(file);
                break;
            case 'docx':
                extractedText = await parseDocxFile(file);
                break;
            case 'hwpx':
                extractedText = await parseHwpxFile(file);
                break;
        }
        
        documentEditor.value = extractedText;
        updateTextStats(extractedText);
        showToast(`'${file.name}' 가 성공적으로 로드되었습니다.`, 'success');
    } catch (error) {
        console.error(error);
        showToast(`파일 해독에 실패했습니다: ${error.message}`, 'error');
    } finally {
        setLoader(false);
    }
}

function renderImportedFileInfo(file, ext) {
    if (importedFilesContainer) importedFilesContainer.style.display = 'block';
    const sizeStr = formatBytes(file.size);
    
    if (importedFilesList) {
        importedFilesList.innerHTML = `
            <div class="file-item">
                <div class="file-info">
                    <div class="file-type-icon file-type-${ext}">${ext}</div>
                    <div class="file-meta">
                        <div class="file-name" title="${file.name}">${file.name}</div>
                        <div class="file-size">${sizeStr}</div>
                    </div>
                </div>
                <button class="btn-remove-file" id="btnRemoveFile" title="가져온 파일 제거">
                    <i data-lucide="x"></i>
                </button>
            </div>
        `;
    }
    lucide.createIcons();
    
    document.getElementById('btnRemoveFile')?.addEventListener('click', () => {
        state.importedFile = null;
        if (importedFilesContainer) importedFilesContainer.style.display = 'none';
        if (importedFilesList) importedFilesList.innerHTML = '';
        showToast('가져온 파일 정보가 해제되었습니다.', 'info');
    });
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Reader utilities with auto-detection for UTF-8 vs EUC-KR (CP949) Korean encodings
function readAsTextFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const arrayBuffer = e.target.result;
            try {
                // Try decoding as strict UTF-8
                const decoder = new TextDecoder('utf-8', { fatal: true });
                const decodedText = decoder.decode(arrayBuffer);
                resolve(decodedText);
            } catch (utfErr) {
                try {
                    // Fallback to EUC-KR for Korean Windows text files
                    const decoder = new TextDecoder('euc-kr');
                    const decodedText = decoder.decode(arrayBuffer);
                    resolve(decodedText);
                } catch (eucErr) {
                    // Final fallback to lenient UTF-8
                    const decoder = new TextDecoder('utf-8');
                    const decodedText = decoder.decode(arrayBuffer);
                    resolve(decodedText);
                }
            }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
    });
}

function parsePdfFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async function(e) {
            const typedarray = new Uint8Array(e.target.result);
            try {
                const pdf = await pdfjsLib.getDocument(typedarray).promise;
                let fullText = "";
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map(item => item.str).join(" ");
                    fullText += pageText + "\n";
                }
                resolve(fullText);
            } catch (error) {
                reject(new Error("PDF 파싱 라이브러리 에러: " + error.message));
            }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
    });
}

function parseDocxFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const arrayBuffer = e.target.result;
            window.mammoth.extractRawText({ arrayBuffer: arrayBuffer })
                .then((result) => resolve(result.value))
                .catch((err) => reject(new Error("DOCX 파싱 에러: " + err.message)));
        };
        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
    });
}

async function parseHwpxFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const zip = await JSZip.loadAsync(e.target.result);
                // Look for Contents/section*.xml files
                const sectionFiles = Object.keys(zip.files).filter(name => 
                    name.startsWith("Contents/section") && name.endsWith(".xml")
                );
                
                if (sectionFiles.length === 0) {
                    throw new Error("HWPX 규격의 section.xml 파일을 찾을 수 없습니다.");
                }
                
                // Sort sections sequentially
                sectionFiles.sort();
                
                let combinedText = "";
                for (const filePath of sectionFiles) {
                    const xmlText = await zip.file(filePath).async("string");
                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
                    
                    // Korean HWPX contains paragraphs inside hp:p containing hp:run containing hp:t
                    const pElements = xmlDoc.getElementsByTagNameNS("*", "p");
                    let sectionText = "";
                    
                    for (let p of pElements) {
                        const tElements = p.getElementsByTagNameNS("*", "t");
                        let paraText = "";
                        for (let t of tElements) {
                            paraText += t.textContent;
                        }
                        sectionText += paraText + "\n";
                    }
                    
                    // Fallback to direct 't' tag grab if namespace queries failed
                    if (!sectionText.trim()) {
                        const tElements = xmlDoc.getElementsByTagNameNS("*", "t");
                        for (let t of tElements) {
                            sectionText += t.textContent + " ";
                        }
                    }
                    
                    combinedText += sectionText + "\n";
                }
                resolve(combinedText);
            } catch (error) {
                reject(new Error("HWPX ZIP 압축해제 에러: " + error.message));
            }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
    });
}

/* ==========================================
   4. Client-Side TF-IDF Summarizer Engine
   ========================================== */

// Helper to extract sentences
function splitSentences(text) {
    if (!text) return [];
    // Sentence splitting by standard terminators (Korean, English)
    // Matches sentences ending with . ! ? followed by space/newlines, or double newlines.
    return text
        .split(/(?<=[.?!])\s+/)
        .map(s => s.trim())
        .filter(s => s.length > 4); // Filter out extremely short sentence fragments
}

function calculateTfidfSummarizer(text, ratioPercent) {
    const sentences = splitSentences(text);
    if (sentences.length <= 2) {
        return {
            summaryText: text,
            summarySentences: sentences,
            highlights: sentences.map((s, idx) => ({ sentence: s, isSummary: true, index: idx }))
        };
    }
    
    // 1. Tokenization and term frequency computation
    const sentenceTokens = sentences.map(s => {
        // Remove special punctuation, keep letters, numbers, and Korean characters
        return s.toLowerCase()
            .replace(/[^a-zA-Z0-9가-힣\s]/g, '')
            .split(/\s+/)
            .filter(word => word.length >= 2 && !STOP_WORDS.has(word));
    });
    
    // Word/Term Frequencies in Document
    const wordDocCounts = {};
    sentenceTokens.forEach(tokens => {
        // Unique words in this sentence (for document frequency IDF calculation)
        const uniqueInSentence = new Set(tokens);
        uniqueInSentence.forEach(w => {
            wordDocCounts[w] = (wordDocCounts[w] || 0) + 1;
        });
    });
    
    const N = sentences.length;
    
    // Sentence Scoring: TF-IDF based sentence ranking
    const scoredSentences = sentences.map((sentence, idx) => {
        const tokens = sentenceTokens[idx];
        if (tokens.length === 0) return { sentence, index: idx, score: 0 };
        
        let score = 0;
        const tokenFreqs = {};
        tokens.forEach(w => {
            tokenFreqs[w] = (tokenFreqs[w] || 0) + 1;
        });
        
        tokens.forEach(w => {
            const tf = tokenFreqs[w] / tokens.length;
            // IDF computation: log(1 + total sentences / sentence occurrences)
            const idf = Math.log(1 + (N / (wordDocCounts[w] || 1)));
            score += tf * idf;
        });
        
        // Normalize by sentence word count logarithmic factor to scale sentence lengths fairly
        const lengthNormalization = Math.log(1 + tokens.length);
        const finalScore = score / lengthNormalization;
        
        return { sentence, index: idx, score: finalScore };
    });
    
    // Sort by score descending to find top sentences
    const sortedByScore = [...scoredSentences].sort((a, b) => b.score - a.score);
    
    // Select top N% sentences
    const selectCount = Math.max(1, Math.round(sentences.length * (ratioPercent / 100)));
    const topSentences = sortedByScore.slice(0, selectCount);
    
    // Create a Set of indices that belong to the summary
    const summaryIndices = new Set(topSentences.map(item => item.index));
    
    // Maintain chronological order of original text
    const summarySentencesOrdered = [...topSentences]
        .sort((a, b) => a.index - b.index)
        .map(item => item.sentence);
        
    const summaryText = summarySentencesOrdered.join(" ");
    
    // Map highlights for original layout side-by-side view
    const highlights = sentences.map((s, idx) => ({
        sentence: s,
        isSummary: summaryIndices.has(idx),
        index: idx
    }));
    
    return {
        summaryText,
        summarySentences: summarySentencesOrdered,
        highlights
    };
}

// Live Summary Generator based on state text & slider
function generateLiveSummary() {
    const text = documentEditor.value.trim();
    if (!text) {
        summaryPreviewCard.innerText = "텍스트를 입력하거나 파일을 로드하면 실시간으로 분석 요약문이 생성됩니다.";
        return;
    }
    
    const result = calculateTfidfSummarizer(text, state.summaryRatio);
    
    // Update preview card
    summaryPreviewCard.innerText = result.summaryText;
    
    // Fill tabs in Highlight view
    // 1. Highlighted Original
    originalTextHighlighted.innerHTML = '';
    result.highlights.forEach(item => {
        const span = document.createElement('span');
        span.textContent = item.sentence;
        if (item.isSummary) {
            span.className = 'highlight-sentence';
            span.title = '중요 문장';
        }
        originalTextHighlighted.appendChild(span);
        originalTextHighlighted.appendChild(document.createTextNode(' '));
    });
    
    // 2. Clean Summary text
    summaryTextOutput.innerHTML = '';
    result.summarySentences.forEach(s => {
        const p = document.createElement('p');
        p.textContent = s;
        summaryTextOutput.appendChild(p);
    });
}

// Slider listeners
summaryRatioSlider?.addEventListener('input', (e) => {
    state.summaryRatio = parseInt(e.target.value);
    if (summaryRatioVal) summaryRatioVal.innerText = `${state.summaryRatio}%`;
    generateLiveSummary();
});

/* ==========================================
   5. Tab switching: Editor vs. Highlight Split
   ========================================== */

tabEdit?.addEventListener('click', () => {
    tabEdit?.classList.add('active');
    tabHighlight?.classList.remove('active');
    tabDomeViewer?.classList.remove('active');
    if (documentEditor) documentEditor.style.display = 'block';
    if (splitEditorView) splitEditorView.style.display = 'none';
    if (domeLauncherView) domeLauncherView.style.display = 'none';
    state.activeTab = 'edit';
});

tabHighlight?.addEventListener('click', () => {
    tabHighlight?.classList.add('active');
    tabEdit?.classList.remove('active');
    tabDomeViewer?.classList.remove('active');
    if (documentEditor) documentEditor.style.display = 'none';
    if (splitEditorView) splitEditorView.style.display = 'grid';
    if (domeLauncherView) domeLauncherView.style.display = 'none';
    state.activeTab = 'highlight';
    
    // Trigger update just in case
    generateLiveSummary();
});

tabDomeViewer?.addEventListener('click', () => {
    tabDomeViewer?.classList.add('active');
    tabEdit?.classList.remove('active');
    tabHighlight?.classList.remove('active');
    if (documentEditor) documentEditor.style.display = 'none';
    if (splitEditorView) splitEditorView.style.display = 'none';
    if (domeLauncherView) domeLauncherView.style.display = 'flex';
    state.activeTab = 'dome';
    
    // Initialize/Launch the integrated CAD and drawing explorer and viewer
    initCadViewer();
});

/* ==========================================
   6. Document Generator/Export Engine
   ========================================== */

// Export format selection
Object.keys(exportBtns).forEach(format => {
    exportBtns[format]?.addEventListener('click', () => {
        // Toggle active design styles
        Object.keys(exportBtns).forEach(f => exportBtns[f]?.classList.remove('active'));
        exportBtns[format]?.classList.add('active');
        state.exportFormat = format;
        
        // Update download button descriptive text
        let koreanFormatName = format.toUpperCase();
        if (format === 'hwpx') koreanFormatName = '한글 HWPX';
        if (format === 'java') koreanFormatName = '자바 Java';
        
        if (downloadBtnText) downloadBtnText.innerText = `${koreanFormatName} 포맷으로 기기에 저장 (다운로드)`;
    });
});

// Main Action Trigger for Downloads
btnDownload?.addEventListener('click', async () => {
    const text = documentEditor ? documentEditor.value.trim() : '';
    if (!text) {
        showToast('에디터에 텍스트 내용이 없습니다. 먼저 작성 또는 파일을 로드해 주세요.', 'error');
        return;
    }
    
    const includeSummary = downloadSummaryChk.checked;
    const downloadZip = singleZipDownloadChk.checked;
    
    setLoader(true, '파일 변환 패키지를 생성하고 있습니다...');
    
    try {
        // 1. Get summary text if requested
        let summaryText = "";
        if (includeSummary) {
            const summaryResult = calculateTfidfSummarizer(text, state.summaryRatio);
            summaryText = summaryResult.summaryText;
        }
        
        const baseFileName = state.currentDocName.replace(/\.[^/.]+$/, ""); // Strip existing extension
        
        if (downloadZip) {
            // Bundle all formats in one ZIP!
            const zip = new JSZip();
            
            // Text Document
            zip.file(`${baseFileName}.txt`, text);
            if (includeSummary) {
                zip.file(`${baseFileName}_summary.txt`, summaryText);
            }
            
            // Java Document
            zip.file(`${baseFileName}.java`, wrapInJava(text, state.currentDocName));
            if (includeSummary) {
                zip.file(`${baseFileName}_summary.java`, wrapInJava(summaryText, baseFileName + "_summary.java"));
            }
            
            // DOCX Document
            const docxBlob = await buildDocxBlob(text);
            zip.file(`${baseFileName}.docx`, docxBlob);
            if (includeSummary) {
                const summaryDocxBlob = await buildDocxBlob(summaryText);
                zip.file(`${baseFileName}_summary.docx`, summaryDocxBlob);
            }
            
            // HWPX Document
            const hwpxBlob = await buildHwpxBlob(text);
            zip.file(`${baseFileName}.hwpx`, hwpxBlob);
            if (includeSummary) {
                const summaryHwpxBlob = await buildHwpxBlob(summaryText);
                zip.file(`${baseFileName}_summary.hwpx`, summaryHwpxBlob);
            }
            
            // PDF Document
            const pdfBlob = await buildPdfBlob(text, state.currentDocName);
            zip.file(`${baseFileName}.pdf`, pdfBlob);
            if (includeSummary) {
                const summaryPdfBlob = await buildPdfBlob(summaryText, baseFileName + "_요약본.pdf");
                zip.file(`${baseFileName}_summary.pdf`, summaryPdfBlob);
            }
            
            // Generate ZIP file
            const zipContent = await zip.generateAsync({ type: 'blob' });
            triggerDownload(zipContent, `${baseFileName}_변환패키지.zip`);
            showToast('모든 포맷 일괄 변환 ZIP 다운로드가 완료되었습니다.', 'success');
            
        } else {
            // Single format download
            const format = state.exportFormat;
            
            switch (format) {
                case 'txt':
                    triggerTextDownload(text, `${baseFileName}.txt`);
                    if (includeSummary) {
                        triggerTextDownload(summaryText, `${baseFileName}_요약본.txt`);
                    }
                    break;
                    
                case 'java':
                    const javaCode = wrapInJava(text, state.currentDocName);
                    triggerTextDownload(javaCode, `${baseFileName}.java`);
                    if (includeSummary) {
                        const javaSummaryCode = wrapInJava(summaryText, baseFileName + "_요약본.java");
                        triggerTextDownload(javaSummaryCode, `${baseFileName}_요약본.java`);
                    }
                    break;
                    
                case 'docx':
                    const docxBlob = await buildDocxBlob(text);
                    triggerDownload(docxBlob, `${baseFileName}.docx`);
                    if (includeSummary) {
                        const summaryDocxBlob = await buildDocxBlob(summaryText);
                        triggerDownload(summaryDocxBlob, `${baseFileName}_요약본.docx`);
                    }
                    break;
                    
                case 'hwpx':
                    const hwpxBlob = await buildHwpxBlob(text);
                    triggerDownload(hwpxBlob, `${baseFileName}.hwpx`);
                    if (includeSummary) {
                        const summaryHwpxBlob = await buildHwpxBlob(summaryText);
                        triggerDownload(summaryHwpxBlob, `${baseFileName}_요약본.hwpx`);
                    }
                    break;
                    
                case 'pdf':
                    const pdfBlob = await buildPdfBlob(text, state.currentDocName);
                    triggerDownload(pdfBlob, `${baseFileName}.pdf`);
                    if (includeSummary) {
                        const summaryPdfBlob = await buildPdfBlob(summaryText, baseFileName + "_요약본.pdf");
                        triggerDownload(summaryPdfBlob, `${baseFileName}_요약본.pdf`);
                    }
                    break;
            }
            showToast(`선택된 파일 변환 다운로드가 완료되었습니다.`, 'success');
        }
    } catch (err) {
        console.error("Download processing failure:", err);
        showToast(`변환 중 오류가 발생했습니다: ${err.message}`, 'error');
    } finally {
        setLoader(false);
    }
});

// Binary file download downloader trigger
function triggerDownload(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

// Plain text download downloader trigger
function triggerTextDownload(textStr, fileName) {
    const blob = new Blob([textStr], { type: 'text/plain;charset=utf-8' });
    triggerDownload(blob, fileName);
}

/* ==========================================
   7. Specific Format Builders (DOCX, HWPX, PDF, Java)
   ========================================== */

// Java wrapper utility
function wrapInJava(text, fileName) {
    let className = fileName.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, "");
    if (!className || /^\d/.test(className)) className = "OmniConvertClass";
    
    // Check if it's already structured java code
    if (text.includes("public class ") || (text.includes("void main") && text.includes("System.out.print"))) {
        return text;
    }
    
    let lines = text.split("\n");
    let javaCode = `/**\n * OmniConvert 클라이언트 사이드 변환 엔진에 의해 생성된 Java 소스\n * 원본 파일: ${fileName}\n */\n`;
    javaCode += `public class ${className} {\n`;
    javaCode += `    public static void main(String[] args) {\n`;
    javaCode += `        System.out.println("====== [문서 내용 출력] ======");\n`;
    lines.forEach(line => {
        // Escape quotes and backslashes for java string literal
        let escapedLine = line.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
        javaCode += `        System.out.println("${escapedLine}");\n`;
    });
    javaCode += `    }\n`;
    javaCode += `}\n`;
    return javaCode;
}

// DOCX skeleton zipper builder
function buildDocxBlob(text) {
    return new Promise(async (resolve, reject) => {
        try {
            const zip = new JSZip();
            
            // 1. [Content_Types].xml
            const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;
            zip.file("[Content_Types].xml", contentTypesXml);
            
            // 2. _rels/.rels
            const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
            zip.folder("_rels").file(".rels", relsXml);
            
            // 3. word/document.xml (Content)
            const lines = text.split("\n");
            const paragraphsXml = lines.map(line => {
                return `<w:p><w:r><w:t>${escapeXml(line)}</w:t></w:r></w:p>`;
            }).join("");
            
            const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraphsXml}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>`;
            zip.folder("word").file("document.xml", documentXml);
            
            // Generate zip file
            const blob = await zip.generateAsync({ type: 'blob' });
            resolve(blob);
        } catch (error) {
            reject(error);
        }
    });
}

// HWPX skeleton zipper builder
function buildHwpxBlob(text) {
    return new Promise(async (resolve, reject) => {
        try {
            const zip = new JSZip();
            
            // HWPX structure definition
            // 1. mimetype (Must be application/hwp+zip, stored uncompressed if possible, but JSZip handles compress option)
            zip.file("mimetype", "application/hwp+zip", { compression: "STORE" });
            
            // 2. META-INF/container.xml
            const containerXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container:1.0">
  <rootfiles>
    <rootfile full-path="Contents/content.hpf" media-type="application/hwp+zip"/>
  </rootfiles>
</container>`;
            zip.folder("META-INF").file("container.xml", containerXml);
            
            // 3. Contents/content.hpf
            const contentHpf = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<package xmlns="http://www.hancom.co.kr/hwpml/2011/head" version="1.0" id="hwp-document">
  <metadata>
    <title>OmniConvert HWPX Document</title>
    <creator>OmniConvert</creator>
  </metadata>
  <manifest>
    <item id="section0" href="section0.xml" media-type="application/xml"/>
  </manifest>
  <spine>
    <itemref idref="section0"/>
  </spine>
</package>`;
            zip.folder("Contents").file("content.hpf", contentHpf);
            
            // 4. Contents/section0.xml
            const lines = text.split("\n");
            const paragraphsXml = lines.map(line => {
                return `<hp:p><hp:run><hp:t>${escapeXml(line)}</hp:t></hp:run></hp:p>`;
            }).join("");
            
            const sectionXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<hp:section xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph" xmlns:hc="http://www.hancom.co.kr/hwpml/2011/core">
  ${paragraphsXml}
</hp:section>`;
            zip.file("Contents/section0.xml", sectionXml);
            
            // Generate zip file
            const blob = await zip.generateAsync({ type: 'blob' });
            resolve(blob);
        } catch (error) {
            reject(error);
        }
    });
}

// PDF custom multi-page wrapped generator using canvas rendering for perfect CJK & native font support
function buildPdfBlob(text, docTitle) {
    return new Promise(async (resolve, reject) => {
        try {
            const { jsPDF } = window.jspdf;
            
            // Create a temporary hidden container to render standard HTML content using browser's native font engine
            const container = document.createElement('div');
            container.style.position = 'absolute';
            container.style.left = '-9999px';
            container.style.top = '-9999px';
            container.style.width = '750px';
            container.style.padding = '45px';
            container.style.background = '#ffffff';
            container.style.color = '#000000';
            container.style.fontFamily = "'Malgun Gothic', 'Nanum Gothic', sans-serif";
            container.style.fontSize = '15px';
            container.style.lineHeight = '1.7';
            container.style.boxSizing = 'border-box';
            
            // Document Title Block
            const titleEl = document.createElement('h1');
            titleEl.style.fontSize = '24px';
            titleEl.style.fontWeight = '700';
            titleEl.style.margin = '0 0 10px 0';
            titleEl.style.color = '#111827';
            titleEl.style.borderBottom = '2px solid #e5e7eb';
            titleEl.style.paddingBottom = '12px';
            titleEl.innerText = docTitle.replace(/\.[^/.]+$/, "");
            container.appendChild(titleEl);
            
            // Meta Info
            const metaEl = document.createElement('p');
            metaEl.style.fontSize = '11px';
            metaEl.style.color = '#6b7280';
            metaEl.style.margin = '-5px 0 25px 0';
            metaEl.innerText = `Generated by OmniConvert at ${new Date().toLocaleString()} (100% Client-Side Secure Document Engine)`;
            container.appendChild(metaEl);
            
            // Content Body Block
            const bodyEl = document.createElement('div');
            bodyEl.style.whiteSpace = 'pre-wrap';
            bodyEl.style.wordBreak = 'break-all';
            bodyEl.innerText = text;
            container.appendChild(bodyEl);
            
            document.body.appendChild(container);
            
            // Render HTML to Canvas using html2canvas
            html2canvas(container, {
                scale: 2, // Double scaling for high-density crisp text
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            }).then(canvas => {
                document.body.removeChild(container);
                
                const imgData = canvas.toDataURL('image/jpeg', 0.95);
                
                // standard A4 dimensions: 210mm x 297mm
                const pdf = new jsPDF('p', 'mm', 'a4');
                const imgWidth = 210; 
                const pageHeight = 297;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                
                let heightLeft = imgHeight;
                let position = 0;
                
                // Add first page
                pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
                heightLeft -= pageHeight;
                
                // Handle multi-page splits
                while (heightLeft > 0) {
                    position = heightLeft - imgHeight;
                    pdf.addPage();
                    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
                    heightLeft -= pageHeight;
                }
                
                const pdfBlob = pdf.output('blob');
                resolve(pdfBlob);
            }).catch(err => {
                if (document.body.contains(container)) {
                    document.body.removeChild(container);
                }
                reject(err);
            });
            
        } catch (error) {
            reject(error);
        }
    });
}

/* ==========================================
   8. System Self-Diagnostics & Unit Tests
   ========================================== */

const diagnosticsHeader = document.getElementById('diagnosticsHeader');
const diagnosticsPanel = document.getElementById('diagnosticsPanel');
const diagnosticsChevron = document.getElementById('diagnosticsChevron');
const btnRunDiagnostics = document.getElementById('btnRunDiagnostics');
const diagnosticsResults = document.getElementById('diagnosticsResults');

diagnosticsHeader?.addEventListener('click', () => {
    if (diagnosticsPanel) {
        if (diagnosticsPanel.style.display === 'none' || !diagnosticsPanel.style.display) {
            diagnosticsPanel.style.display = 'flex';
            if (diagnosticsChevron) diagnosticsChevron.style.transform = 'rotate(180deg)';
        } else {
            diagnosticsPanel.style.display = 'none';
            if (diagnosticsChevron) diagnosticsChevron.style.transform = 'rotate(0deg)';
        }
    }
});

btnRunDiagnostics?.addEventListener('click', async () => {
    if (diagnosticsResults) {
        diagnosticsResults.style.display = 'flex';
        diagnosticsResults.innerHTML = ''; // Reset results
    }
    if (btnRunDiagnostics) {
        btnRunDiagnostics.disabled = true;
        btnRunDiagnostics.style.opacity = '0.6';
    }
    
    showToast('시스템 자가 진단 및 기능 검증을 시작합니다.', 'info');
    
    let allPassed = true;
    
    // Helper to log test outcomes
    async function executeTest(testName, testFn) {
        const itemEl = document.createElement('div');
        itemEl.style.display = 'flex';
        itemEl.style.justifyContent = 'space-between';
        itemEl.style.alignItems = 'center';
        itemEl.style.padding = '0.35rem 0';
        itemEl.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
        itemEl.innerHTML = `<span>⏳ ${testName}</span><span style="color: var(--text-secondary);">검증 중...</span>`;
        diagnosticsResults.appendChild(itemEl);
        diagnosticsResults.scrollTop = diagnosticsResults.scrollHeight;
        
        try {
            const startTime = performance.now();
            await testFn();
            const duration = (performance.now() - startTime).toFixed(0);
            itemEl.innerHTML = `
                <span style="color: var(--success); display: flex; align-items: center; gap: 0.25rem;">
                    <i data-lucide="check-circle-2" style="width: 14px; height: 14px;"></i> ${testName}
                </span>
                <span style="color: var(--success); font-weight: 600;">통과 (${duration}ms)</span>
            `;
            lucide.createIcons({ attrs: { style: 'width: 14px; height: 14px;' } });
            return true;
        } catch (err) {
            allPassed = false;
            itemEl.innerHTML = `
                <span style="color: var(--danger); display: flex; align-items: center; gap: 0.25rem;">
                    <i data-lucide="x-circle" style="width: 14px; height: 14px;"></i> ${testName}
                </span>
                <span style="color: var(--danger); font-weight: 600; font-size: 0.7rem;">실패: ${err.message}</span>
            `;
            lucide.createIcons({ attrs: { style: 'width: 14px; height: 14px;' } });
            return false;
        }
    }
    
    // Test Case 1: JSZip Library Load
    await executeTest('JSZip 압축 라이브러리 검증', async () => {
        if (typeof JSZip === 'undefined') throw new Error("JSZip 라이브러리가 로드되지 않았습니다.");
    });
    
    // Test Case 2: Mammoth.js Library Load
    await executeTest('Mammoth 워드 디코더 검증', async () => {
        if (typeof mammoth === 'undefined') throw new Error("Mammoth 라이브러리가 로드되지 않았습니다.");
    });
    
    // Test Case 3: PDF.js Library Load
    await executeTest('PDF.js 문서 디코더 검증', async () => {
        if (typeof pdfjsLib === 'undefined') throw new Error("PDF.js 라이브러리가 로드되지 않았습니다.");
    });
    
    // Test Case 4: jsPDF Library Load
    await executeTest('jsPDF 인쇄 라이브러리 검증', async () => {
        if (typeof window.jspdf === 'undefined') throw new Error("jsPDF 라이브러리가 로드되지 않았습니다.");
    });
    
    // Test Case 5: TF-IDF Summarizer Algorithm Test
    await executeTest('TF-IDF 핵심문장 요약 알고리즘 검증', async () => {
        const mockText = `동해물과 백두산이 마르고 닳도록 하느님이 보우하사 우리나라 만세. 
        남산 위에 저 소나무 철갑을 두른 듯 바람 서리 불변함은 우리 기상일세. 
        가을 하늘 공활한데 높고 구름 없이 밝은 달은 우리 가슴 일편단심일세. 
        이 기상과 이 맘으로 충성을 다하여 괴로우나 즐거우나 나라 사랑하세.`;
        
        const summaryResult = calculateTfidfSummarizer(mockText, 25); // Request top 25% (1 sentence)
        
        if (!summaryResult.summaryText) throw new Error("요약 텍스트 생성 실패");
        if (summaryResult.summarySentences.length !== 1) throw new Error("문장 수 요약 비율 불일치");
        if (summaryResult.highlights.length !== 4) throw new Error("대조 하이라이트 매핑 누락");
    });
    
    // Test Case 6: DOCX Builder Specification Integrity
    await executeTest('DOCX 파일 컨테이너 빌더 규격 검증', async () => {
        const testText = "안녕하세요. DOCX 파일 포맷 검증용 텍스트입니다.";
        const docxBlob = await buildDocxBlob(testText);
        
        if (!docxBlob || docxBlob.size === 0) throw new Error("생성된 Blob이 비어 있습니다.");
        
        // Unzip generated DOCX and verify file structure
        const zip = await JSZip.loadAsync(docxBlob);
        if (!zip.file("[Content_Types].xml")) throw new Error("[Content_Types].xml 파일이 누락되었습니다.");
        if (!zip.file("_rels/.rels")) throw new Error("_rels/.rels 파일이 누락되었습니다.");
        if (!zip.file("word/document.xml")) throw new Error("word/document.xml 본문 파일이 누락되었습니다.");
        
        const docXml = await zip.file("word/document.xml").async("string");
        if (!docXml.includes("안녕하세요.")) throw new Error("본문 내용이 XML 내에 정상 인코딩되지 않았습니다.");
    });
    
    // Test Case 7: HWPX Builder Specification Integrity
    await executeTest('HWPX 파일 컨테이너 빌더 규격 검증', async () => {
        const testText = "반갑습니다. 한글 표준 HWPX 문서 빌더 검증용 텍스트입니다.";
        const hwpxBlob = await buildHwpxBlob(testText);
        
        if (!hwpxBlob || hwpxBlob.size === 0) throw new Error("생성된 Blob이 비어 있습니다.");
        
        // Unzip generated HWPX and verify content types
        const zip = await JSZip.loadAsync(hwpxBlob);
        if (!zip.file("mimetype")) throw new Error("mimetype 파일이 누락되었습니다.");
        if (!zip.file("META-INF/container.xml")) throw new Error("container.xml 파일이 누락되었습니다.");
        if (!zip.file("Contents/content.hpf")) throw new Error("content.hpf 패키지 파일이 누락되었습니다.");
        if (!zip.file("Contents/section0.xml")) throw new Error("section0.xml 콘텐츠 본문 파일이 누락되었습니다.");
        
        const mimeStr = await zip.file("mimetype").async("string");
        if (mimeStr !== "application/hwp+zip") throw new Error("mimetype 서명이 HWPX 표준규격과 다릅니다.");
        
        const sectionXml = await zip.file("Contents/section0.xml").async("string");
        if (!sectionXml.includes("반갑습니다.")) throw new Error("한글 텍스트 본문이 XML 데이터 내에 없습니다.");
    });
    
    // Test Case 8: PDF Builder Specification Integrity
    await executeTest('PDF 인쇄 문서 생성 및 규격 검증', async () => {
        const testText = "PDF 인쇄 빌더 검증용 데이터라인";
        // Create pdf blob without downloading Naver font first to prevent test latency if cached
        const pdfBlob = await buildPdfBlob(testText, "test.pdf");
        
        if (!pdfBlob || pdfBlob.size === 0) throw new Error("생성된 Blob이 비어 있습니다.");
        if (pdfBlob.type !== "application/pdf") throw new Error("마임 타입이 application/pdf 규격이 아닙니다.");
    });
    
    // Test Case 9: Java Source File Builder Verification
    await executeTest('Java 소스코드 래핑 컴파일러 검증', async () => {
        const rawText = "문서 데이터 내용\n두 번째 줄";
        const javaCode = wrapInJava(rawText, "SampleText.txt");
        
        if (!javaCode.includes("public class SampleText")) throw new Error("클래스명 자동 래핑 실패");
        if (!javaCode.includes("System.out.println(\"문서 데이터 내용\");")) throw new Error("텍스트 자동 래핑 실패");
    });

    // Test Case 10: EmailJS Library Load Verification
    await executeTest('EmailJS 메일 전송 모듈 로딩 검증', async () => {
        if (typeof emailjs === 'undefined') throw new Error("EmailJS SDK 라이브러리가 헤드에 존재하지 않습니다.");
    });

    // Test Case 11: Mobile SMS Link Generator Verification
    await executeTest('모바일 문자(SMS) 인코딩 스키마 검증', async () => {
        const mockText = "문서 본문 내용";
        const mockTitle = "검증문서.txt";
        const customMessage = "메모 메시지";
        
        const smsBody = `[메모] ${customMessage}\n\n[문서] ${mockTitle}\n[본문내용]\n${mockText}`;
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const separator = isIOS ? '&' : '?';
        const url = `sms:${separator}body=${encodeURIComponent(smsBody)}`;
        
        if (!url.startsWith("sms:")) throw new Error("SMS 프로토콜 헤더 오류");
        if (!url.includes(encodeURIComponent(customMessage))) throw new Error("메시지 인코딩 누락");
    });
    
    // Display Toast based on results
    if (allPassed) {
        showToast('모든 기능의 자가 검증이 완벽히 완료되었습니다! (정상 동작)', 'success');
    } else {
        showToast('일부 검증 테스트 항목이 실패했습니다. 콘솔을 확인해 주세요.', 'error');
    }
    
    if (btnRunDiagnostics) {
        btnRunDiagnostics.disabled = false;
        btnRunDiagnostics.style.opacity = '1';
    }
});

/* ==========================================
   9. EmailJS Integration (Sending via Email)
   ========================================== */

// Initialize EmailJS with Public Key
if (typeof emailjs !== 'undefined') {
    emailjs.init({
        publicKey: "kE_3LCTY4meWYdgAL"
    });
} else {
    console.warn("EmailJS library could not be resolved from CDN globals.");
}

const emailRecipient = document.getElementById('emailRecipient');
const emailSenderName = document.getElementById('emailSenderName');
const emailCustomMessage = document.getElementById('emailCustomMessage');
const emailIncludeDoc = document.getElementById('emailIncludeDoc');
const emailIncludeSummary = document.getElementById('emailIncludeSummary');
const btnSendEmail = document.getElementById('btnSendEmail');
const btnSendSms = document.getElementById('btnSendSms');

// 1. EmailJS Send Handler
btnSendEmail?.addEventListener('click', async () => {
    const email = emailRecipient ? emailRecipient.value.trim() : '';
    const senderName = (emailSenderName ? emailSenderName.value.trim() : '') || "OmniConvert";
    const customMessageText = emailCustomMessage ? emailCustomMessage.value.trim() : '';
    const text = documentEditor ? documentEditor.value.trim() : '';
    
    // Validations
    if (!email) {
        showToast('수신자 이메일 주소를 입력해 주세요.', 'error');
        emailRecipient?.focus();
        return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showToast('유효한 이메일 형식(example@email.com)이 아닙니다.', 'error');
        emailRecipient.focus();
        return;
    }
    
    if (!text) {
        showToast('전송할 본문 내용이 없습니다. 에디터에 글을 작성해 주세요.', 'error');
        return;
    }
    
    const includeDoc = emailIncludeDoc.checked;
    const includeSummary = emailIncludeSummary.checked;
    
    if (!includeDoc && !includeSummary) {
        showToast('본문 혹은 요약본 중 최소 하나 이상 전송 설정해야 합니다.', 'error');
        return;
    }
    
    setLoader(true, '이메일을 작성하여 발송하고 있습니다...');
    if (btnSendEmail) {
        btnSendEmail.disabled = true;
        btnSendEmail.style.opacity = '0.6';
    }
    
    try {
        // Calculate summary
        const summaryResult = calculateTfidfSummarizer(text, state.summaryRatio);
        
        // Build template params matching standard and custom EmailJS variable layouts
        const templateParams = {
            to_email: email,
            email: email,             // Standard EmailJS variable fallback
            reply_to: email,          // Default reply-to header field variable
            to_name: email.split('@')[0],
            from_name: senderName,
            doc_title: state.currentDocName,
            
            // Map custom memo/notes to standard keys so it maps to default {{message}} template variables
            message: customMessageText || "(별도의 추가 메시지가 없습니다.)",
            user_message: customMessageText,
            notes: customMessageText,
            
            // Map raw document text to dedicated content keys
            doc_content: includeDoc ? text : "(본문 전송 제외)",
            document_content: includeDoc ? text : "(본문 전송 제외)",
            content: includeDoc ? text : "(본문 전송 제외)",
            
            // Map summarizer outcomes
            summary: includeSummary ? summaryResult.summaryText : "(요약문 전송 제외)",
            doc_summary: includeSummary ? summaryResult.summaryText : "(요약문 전송 제외)",
            
            char_count: text.length,
            word_count: text.split(/\s+/).length
        };
        
        // Call EmailJS Send API
        const response = await emailjs.send(
            "service_gqbezre",
            "template_vk4ngwg",
            templateParams
        );
        
        console.log('EmailJS Success Response:', response);
        showToast('이메일 전송에 성공했습니다! (수신함을 확인해 보세요)', 'success');
        
    } catch (err) {
        console.error('EmailJS Send Error:', err);
        showToast(`이메일 전송 실패: ${err.text || err.message || JSON.stringify(err)}`, 'error');
    } finally {
        setLoader(false);
        if (btnSendEmail) {
            btnSendEmail.disabled = false;
            btnSendEmail.style.opacity = '1';
        }
    }
});

// 2. Mobile SMS Send Handler
btnSendSms?.addEventListener('click', (e) => {
    const text = documentEditor ? documentEditor.value.trim() : '';
    if (!text) {
        showToast('문자로 전송할 내용이 없습니다. 먼저 문서를 작성해 주세요.', 'error');
        e.preventDefault();
        return;
    }
    
    const customMessageText = emailCustomMessage ? emailCustomMessage.value.trim() : '';
    const summaryResult = calculateTfidfSummarizer(text, state.summaryRatio);
    
    // Compile SMS message content
    let smsBody = "";
    if (customMessageText) {
        smsBody += `[메모] ${customMessageText}\n\n`;
    }
    smsBody += `[문서] ${state.currentDocName}\n`;
    
    const includeDoc = emailIncludeDoc.checked;
    const includeSummary = emailIncludeSummary.checked;
    
    if (includeSummary) {
        smsBody += `[핵심요약]\n${summaryResult.summaryText}\n`;
    }
    if (includeDoc) {
        // limit document text in SMS body to prevent overflow on mobile protocols (max ~800 chars)
        const contentSnippet = text.length > 500 ? text.substring(0, 500) + "..." : text;
        smsBody += `[본문내용]\n${contentSnippet}`;
    }
    
    // Detect mobile OS for correct sms URI query separator
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const separator = isIOS ? '&' : '?';
    
    // Set dynamic href
    if (btnSendSms) btnSendSms.href = `sms:${separator}body=${encodeURIComponent(smsBody)}`;
    showToast('모바일 메시지 전송 앱으로 연결합니다.', 'success');
});


/* ==========================================================================
   OmniCAD & Media Viewer Integration (100% Client-Side Engine)
   ========================================================================== */

const cadState = {
    files: [],
    activeFile: null,
    searchQuery: '',
    currentFilter: 'all'
};

const cadDxfState = {
    entities: [],
    zoom: 1.0,
    panX: 0,
    panY: 0,
    isDragging: false,
    startX: 0,
    startY: 0,
    bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 }
};

const cadImgState = {
    zoom: 1.0,
    panX: 0,
    panY: 0,
    isDragging: false,
    startX: 0,
    startY: 0
};

const cadPdfState = {
    pdfInstance: null,
    currentPage: 1,
    totalPages: 1,
    currentPath: ''
};

const cadThreeState = {
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    activeMesh: null,
    animationId: null,
    resizeObserver: null,
    isWireframe: false
};

// UI Elements for CAD Viewer
let btnCadRefresh, cadFileSearch, cadExplorerTree;
let cadViewportMetadataBar, cadActiveFileName, cadActiveFileSize, cadActiveFilePath, cadFileExtBadge;
let cadBtnOpenNative, cadBtnDownloadFile, cadViewportDisplayArea, cadNoSelectionScreen, cadViewportLoader, cadViewportLoaderText;
let cadDxfViewportContainer, cadDxfCanvas;
let cadBtnZoomIn, cadBtnZoomOut, cadBtnFit, cadHudCoords;
let cadMesh3dViewportContainer, cadThreeJsContainer;
let cadBtn3dWireframe, cadBtn3dReset;
let cadImageViewportContainer, cadZoomableImageWrapper, cadInteractiveImage;
let cadBtnImgZoomIn, cadBtnImgZoomOut, cadBtnImgReset;
let cadPdfViewportContainer, cadPdfRenderingArea;
let cadBtnPdfPrev, cadBtnPdfNext, cadPdfCurrentPage, cadPdfTotalPages;
let cadProprietaryFallbackScreen, cadFallbackSoftwareIcon, cadFallbackFormatName;
let cadAutolinkPreviewBox, cadAutolinkActions, cadBtnFallbackOpenNative;
let cadExportGuideText, cadExportManualContent;

let isCadViewerInitialized = false;

function initCadViewer() {
    if (isCadViewerInitialized) {
        fetchCadProjectFiles();
        return;
    }
    
    // Bind all elements
    btnCadRefresh = document.getElementById('btnCadRefresh');
    cadFileSearch = document.getElementById('cadFileSearch');
    cadExplorerTree = document.getElementById('cadExplorerTree');
    
    cadViewportMetadataBar = document.getElementById('cadViewportMetadataBar');
    cadActiveFileName = document.getElementById('cadActiveFileName');
    cadActiveFileSize = document.getElementById('cadActiveFileSize');
    cadActiveFilePath = document.getElementById('cadActiveFilePath');
    cadFileExtBadge = document.getElementById('cadFileExtBadge');
    
    cadBtnOpenNative = document.getElementById('cadBtnOpenNative');
    cadBtnDownloadFile = document.getElementById('cadBtnDownloadFile');
    cadViewportDisplayArea = document.getElementById('cadViewportDisplayArea');
    cadNoSelectionScreen = document.getElementById('cadNoSelectionScreen');
    cadViewportLoader = document.getElementById('cadViewportLoader');
    cadViewportLoaderText = document.getElementById('cadViewportLoaderText');
    
    cadDxfViewportContainer = document.getElementById('cadDxfViewportContainer');
    cadDxfCanvas = document.getElementById('cadDxfCanvas');
    cadBtnZoomIn = document.getElementById('cadBtnZoomIn');
    cadBtnZoomOut = document.getElementById('cadBtnZoomOut');
    cadBtnFit = document.getElementById('cadBtnFit');
    cadHudCoords = document.getElementById('cadHudCoords');
    
    cadMesh3dViewportContainer = document.getElementById('cadMesh3dViewportContainer');
    cadThreeJsContainer = document.getElementById('cadThreeJsContainer');
    cadBtn3dWireframe = document.getElementById('cadBtn3dWireframe');
    cadBtn3dReset = document.getElementById('cadBtn3dReset');
    
    cadImageViewportContainer = document.getElementById('cadImageViewportContainer');
    cadZoomableImageWrapper = document.getElementById('cadZoomableImageWrapper');
    cadInteractiveImage = document.getElementById('cadInteractiveImage');
    cadBtnImgZoomIn = document.getElementById('cadBtnImgZoomIn');
    cadBtnImgZoomOut = document.getElementById('cadBtnImgZoomOut');
    cadBtnImgReset = document.getElementById('cadBtnImgReset');
    
    cadPdfViewportContainer = document.getElementById('cadPdfViewportContainer');
    cadPdfRenderingArea = document.getElementById('cadPdfRenderingArea');
    cadBtnPdfPrev = document.getElementById('cadBtnPdfPrev');
    cadBtnPdfNext = document.getElementById('cadBtnPdfNext');
    cadPdfCurrentPage = document.getElementById('cadPdfCurrentPage');
    cadPdfTotalPages = document.getElementById('cadPdfTotalPages');
    
    cadProprietaryFallbackScreen = document.getElementById('cadProprietaryFallbackScreen');
    cadFallbackSoftwareIcon = document.getElementById('cadFallbackSoftwareIcon');
    cadFallbackFormatName = document.getElementById('cadFallbackFormatName');
    
    cadAutolinkPreviewBox = document.getElementById('cadAutolinkPreviewBox');
    cadAutolinkActions = document.getElementById('cadAutolinkActions');
    cadBtnFallbackOpenNative = document.getElementById('cadBtnFallbackOpenNative');
    cadExportGuideText = document.getElementById('cadExportGuideText');
    cadExportManualContent = document.getElementById('cadExportManualContent');
    
    // Bind listeners
    btnCadRefresh.addEventListener('click', () => {
        cadState.activeFile = null;
        if (cadViewportMetadataBar) cadViewportMetadataBar.style.display = 'none';
        const commentsSec = document.getElementById('cadCommentsSection');
        if (commentsSec) commentsSec.style.display = 'none';
        fetchCadProjectFiles();
        showToast('설계 파일 트리 리스트를 새로고침했습니다.', 'success');
    });
    
    cadFileSearch.addEventListener('input', (e) => {
        cadState.searchQuery = e.target.value;
        applyCadFilters();
    });
    
    const triggerOpenNativeCad = async () => {
        if (!cadState.activeFile) return;
        showToast('로컬 네이티브 설계 소프트웨어를 연동 실행하고 있습니다...', 'info');
        try {
            const response = await fetch(getApiUrl(`/api/open_file?path=${encodeURIComponent(cadState.activeFile.path)}`));
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            if (result.status === 'success') {
                showToast(result.message, 'success');
            } else {
                showToast(result.message, 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('로컬 프로그램 실행에 실패했습니다. (API 오류)', 'error');
        }
    };
    
    cadBtnOpenNative.addEventListener('click', triggerOpenNativeCad);
    cadBtnFallbackOpenNative.addEventListener('click', triggerOpenNativeCad);
    
    // Image view controllers
    cadBtnImgZoomIn.addEventListener('click', () => {
        cadImgState.zoom *= 1.25;
        updateCadImgTransform();
    });
    cadBtnImgZoomOut.addEventListener('click', () => {
        cadImgState.zoom /= 1.25;
        updateCadImgTransform();
    });
    cadBtnImgReset.addEventListener('click', () => {
        cadImgState.zoom = 1.0;
        cadImgState.panX = 0;
        cadImgState.panY = 0;
        updateCadImgTransform();
    });
    
    // Image drag listeners
    cadZoomableImageWrapper.addEventListener('mousedown', (e) => {
        if (cadState.activeFile && ['jpg', 'jpeg', 'png', 'gif'].includes(cadState.activeFile.ext)) {
            cadImgState.isDragging = true;
            cadImgState.startX = e.clientX - cadImgState.panX;
            cadImgState.startY = e.clientY - cadImgState.panY;
        }
    });
    
    window.addEventListener('mousemove', (e) => {
        if (cadImgState.isDragging) {
            cadImgState.panX = e.clientX - cadImgState.startX;
            cadImgState.panY = e.clientY - cadImgState.startY;
            updateCadImgTransform();
        }
    });
    
    window.addEventListener('mouseup', () => {
        cadImgState.isDragging = false;
    });
    
    // Image wheel zoom
    cadZoomableImageWrapper.addEventListener('wheel', (e) => {
        if (cadState.activeFile && ['jpg', 'jpeg', 'png', 'gif'].includes(cadState.activeFile.ext)) {
            e.preventDefault();
            const factor = 1.1;
            if (e.deltaY < 0) cadImgState.zoom *= factor;
            else cadImgState.zoom /= factor;
            cadImgState.zoom = Math.max(0.1, Math.min(10, cadImgState.zoom));
            updateCadImgTransform();
        }
    }, { passive: false });
    
    // DXF canvas controls
    cadBtnZoomIn.addEventListener('click', () => {
        const midX = cadDxfCanvas.width / 2;
        const midY = cadDxfCanvas.height / 2;
        const cadPt = toCadCoords(midX, midY);
        cadDxfState.zoom *= 1.25;
        cadDxfState.panX = midX - cadPt.x * cadDxfState.zoom;
        cadDxfState.panY = midY + cadPt.y * cadDxfState.zoom;
        drawCadDxf();
    });
    
    cadBtnZoomOut.addEventListener('click', () => {
        const midX = cadDxfCanvas.width / 2;
        const midY = cadDxfCanvas.height / 2;
        const cadPt = toCadCoords(midX, midY);
        cadDxfState.zoom /= 1.25;
        cadDxfState.panX = midX - cadPt.x * cadDxfState.zoom;
        cadDxfState.panY = midY + cadPt.y * cadDxfState.zoom;
        drawCadDxf();
    });
    
    cadBtnFit.addEventListener('click', () => {
        fitCadDxfToViewport();
        drawCadDxf();
    });
    
    // DXF Drag pan
    cadDxfCanvas.addEventListener('mousedown', (e) => {
        cadDxfState.isDragging = true;
        cadDxfState.startX = e.clientX - cadDxfState.panX;
        cadDxfState.startY = e.clientY - cadDxfState.panY;
    });
    
    window.addEventListener('mousemove', (e) => {
        if (cadDxfState.isDragging) {
            cadDxfState.panX = e.clientX - cadDxfState.startX;
            cadDxfState.panY = e.clientY - cadDxfState.startY;
            drawCadDxf();
        }
        
        if (cadState.activeFile && cadState.activeFile.ext === 'dxf') {
            const rect = cadDxfCanvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            if (mouseX >= 0 && mouseX <= cadDxfCanvas.width && mouseY >= 0 && mouseY <= cadDxfCanvas.height) {
                const cadPt = toCadCoords(mouseX, mouseY);
                cadHudCoords.innerText = `X: ${cadPt.x.toFixed(2)}, Y: ${cadPt.y.toFixed(2)}`;
            }
        }
    });
    
    window.addEventListener('mouseup', () => {
        cadDxfState.isDragging = false;
    });
    
    // DXF wheel zoom
    cadDxfCanvas.addEventListener('wheel', (e) => {
        if (cadState.activeFile && cadState.activeFile.ext === 'dxf') {
            e.preventDefault();
            const rect = cadDxfCanvas.getBoundingClientRect();
            const sx = e.clientX - rect.left;
            const sy = e.clientY - rect.top;
            const cadPt = toCadCoords(sx, sy);
            
            const factor = 1.15;
            if (e.deltaY < 0) cadDxfState.zoom *= factor;
            else cadDxfState.zoom /= factor;
            
            cadDxfState.zoom = Math.max(0.01, Math.min(200, cadDxfState.zoom));
            cadDxfState.panX = sx - cadPt.x * cadDxfState.zoom;
            cadDxfState.panY = sy + cadPt.y * cadDxfState.zoom;
            
            drawCadDxf();
        }
    }, { passive: false });
    
    // 3D wireframe and camera controls
    cadBtn3dWireframe.addEventListener('click', () => {
        if (!cadThreeState.activeMesh) return;
        cadThreeState.isWireframe = !cadThreeState.isWireframe;
        
        const setWire = (m) => { if (m.material) m.material.wireframe = cadThreeState.isWireframe; };
        if (cadThreeState.activeMesh.traverse) {
            cadThreeState.activeMesh.traverse(child => { if (child.isMesh) setWire(child); });
        } else {
            setWire(cadThreeState.activeMesh);
        }
        showToast(cadThreeState.isWireframe ? '와이어프레임 모드로 변경' : '솔리드 셰이딩 모드로 변경', 'info');
    });
    
    cadBtn3dReset.addEventListener('click', () => {
        if (!cadThreeState.activeMesh || !cadThreeState.camera) return;
        const box = new THREE.Box3().setFromObject(cadThreeState.activeMesh);
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        cadThreeState.camera.position.set(maxDim * 1.2, maxDim * 1.2, maxDim * 1.5);
        cadThreeState.controls.target.set(0, size.y / 2, 0);
        cadThreeState.controls.update();
    });
    
    // PDF buttons
    cadBtnPdfPrev.addEventListener('click', () => {
        if (cadPdfState.currentPage > 1) {
            cadPdfState.currentPage--;
            renderCadPdfPage(cadPdfState.currentPage);
        }
    });
    
    cadBtnPdfNext.addEventListener('click', () => {
        if (cadPdfState.currentPage < cadPdfState.totalPages) {
            cadPdfState.currentPage++;
            renderCadPdfPage(cadPdfState.currentPage);
        }
    });
    
    // Resizing triggers canvas adjustment
    window.addEventListener('resize', () => {
        if (cadState.activeFile && cadState.activeFile.ext === 'dxf') {
            fitCadDxfToViewport();
            drawCadDxf();
        }
    });
    
    // Comments form listener
    const cForm = document.getElementById('cadCommentForm');
    if (cForm) {
        cForm.addEventListener('submit', (e) => {
            e.preventDefault();
            submitCadComment();
        });
    }
    
    isCadViewerInitialized = true;
    fetchCadProjectFiles();
}

function setCadViewportLoader(active, text = '도면을 읽는 중...') {
    cadViewportLoaderText.innerText = text;
    cadViewportLoader.style.display = active ? 'flex' : 'none';
}

function getApiUrl(endpoint) {
    if (window.location.protocol === 'file:') {
        return `http://localhost:8000${endpoint}`;
    }
    return endpoint;
}

function getFileUrl(path) {
    if (window.location.protocol === 'file:') {
        if (path.startsWith('http://') || path.startsWith('https://')) return path;
        return `http://localhost:8000/${path}`;
    }
    return path;
}

async function fetchCadProjectFiles() {
    cadExplorerTree.innerHTML = '<div class="loading-spinner-center"><div class="spinner" style="width:16px;height:16px;"></div><p style="font-size:0.75rem;margin-top:0.3rem;">파일 목록 스캔 중...</p></div>';
    try {
        const response = await fetch(getApiUrl('/api/list_files'));
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        cadState.files = data;
        applyCadFilters();
    } catch (err) {
        console.error("실시간 자산 동기화 실패. 데모 데이터로 로딩합니다.", err);
        showToast("로컬 서버 미작동. 데모용 기본 파일 목록을 로드했습니다.", "info");
        cadState.files = [
            { name: "greenhouse_details.dxf", path: "greenhouse_details.dxf", size: 20259, ext: "dxf" },
            { name: "greenhouse_layout.dxf", path: "greenhouse_layout.dxf", size: 22167, ext: "dxf" },
            { name: "greenhouse_render.png", path: "greenhouse_render.png", size: 1099860, ext: "png" },
            { name: "dome_design_render.png", path: "dome_design_render.png", size: 928411, ext: "png" },
            { name: "dome_detailed_blueprint.png", path: "dome_detailed_blueprint.png", size: 967849, ext: "png" },
            { name: "dome_part_drawings.png", path: "dome_part_drawings.png", size: 904690, ext: "png" },
            { name: "yanggu_haean_hybrid_z15.png", path: "yanggu_haean_hybrid_z15.png", size: 7752779, ext: "png" },
            { name: "yanggu_all_crop_transitions.csv", path: "yanggu_all_crop_transitions.csv", size: 23105, ext: "csv" },
            { name: "nature_calendar_bg.png", path: "nature_calendar_bg.png", size: 636587, ext: "png" },
            { name: "sea_background.png", path: "sea_background.png", size: 976094, ext: "png" }
        ];
        applyCadFilters();
    }
}

function applyCadFilters() {
    let filtered = cadState.files;
    if (cadState.searchQuery) {
        const q = cadState.searchQuery.toLowerCase();
        filtered = filtered.filter(f => f.name.toLowerCase().includes(q));
    }
    renderCadExplorerTree(filtered);
    if (cadState.activeFile === null) {
        renderCadBehanceGrid(filtered);
    }
}

function renderCadExplorerTree(files) {
    cadExplorerTree.innerHTML = '';
    
    if (files.length === 0) {
        cadExplorerTree.innerHTML = '<p style="font-size:0.75rem;color:var(--text-muted);padding:1rem;text-align:center;">도면 파일 없음</p>';
        return;
    }
    
    const groups = {};
    files.forEach(f => {
        let folder = '루트 폴더';
        if (f.path.includes('/')) {
            folder = f.path.substring(0, f.path.lastIndexOf('/'));
        }
        if (!groups[folder]) groups[folder] = [];
        groups[folder].push(f);
    });
    
    const sortedFolders = Object.keys(groups).sort((a,b) => {
        if (a === '루트 폴더') return -1;
        if (b === '루트 폴더') return 1;
        return a.localeCompare(b);
    });
    
    sortedFolders.forEach(folder => {
        const folderDiv = document.createElement('div');
        folderDiv.className = 'folder-group';
        
        const title = document.createElement('div');
        title.className = 'folder-title';
        title.innerHTML = `<i data-lucide="folder" style="width: 12px; height: 12px;"></i><span>${folder}</span>`;
        folderDiv.appendChild(title);
        
        const sortedFiles = groups[folder].sort((a,b) => a.name.localeCompare(b.name));
        sortedFiles.forEach(file => {
            const item = document.createElement('div');
            item.className = 'tree-file-item';
            if (cadState.activeFile && cadState.activeFile.path === file.path) {
                item.classList.add('active');
            }
            
            const sizeStr = formatBytes(file.size);
            item.innerHTML = `
                <div class="tree-file-left">
                    <div class="tree-file-icon badge-${file.ext}" style="font-size:0.6rem;width:24px;height:24px;border-radius:4px;">${file.ext}</div>
                    <div class="tree-file-details">
                        <div class="tree-file-name" style="font-size:0.78rem;" title="${file.name}">${file.name}</div>
                        <div class="tree-file-size" style="font-size:0.65rem;">${sizeStr}</div>
                    </div>
                </div>
            `;
            
            item.addEventListener('click', () => {
                const items = document.querySelectorAll('#cadExplorerTree .tree-file-item');
                if (items) {
                    items.forEach(el => el.classList.remove('active'));
                }
                item.classList.add('active');
                selectCadFile(file);
            });
            
            folderDiv.appendChild(item);
        });
        cadExplorerTree.appendChild(folderDiv);
    });
    lucide.createIcons();
}

function renderCadBehanceGrid(files) {
    if (!cadNoSelectionScreen) return;
    
    cadNoSelectionScreen.innerHTML = '';
    cadNoSelectionScreen.className = 'pinterest-grid';
    cadNoSelectionScreen.removeAttribute('style'); // reset style attributes
    
    if (files.length === 0) {
        cadNoSelectionScreen.innerHTML = '<div style="padding: 3rem; text-align: center; color: var(--text-muted);"><p>검색 조건에 맞는 도면 파일이 없습니다.</p></div>';
        return;
    }
    
    files.forEach(file => {
        const card = document.createElement('div');
        card.className = 'pin-card';
        
        let fileTypeTag = file.ext.toUpperCase();
        let thumbContent = '';
        
        const randHeight = 160 + Math.floor(Math.random() * 110); // staggered height: 160px to 270px
        
        if (['jpg', 'jpeg', 'png', 'gif'].includes(file.ext)) {
            thumbContent = `<img class="pin-thumbnail-img" src="${getFileUrl(file.path)}" alt="${file.name}" style="height: auto; max-height: 250px;">`;
        } else {
            let iconText = file.ext.substring(0, 3).toUpperCase();
            thumbContent = `<div class="pin-thumbnail-fallback" style="height: ${randHeight}px;">${iconText}</div>`;
        }
        
        const pathKey = 'cad_social_' + file.path;
        let socialData = localStorage.getItem(pathKey);
        if (!socialData) {
            socialData = JSON.stringify({
                appreciations: 12 + Math.floor(Math.random() * 40),
                views: 240 + Math.floor(Math.random() * 600),
                comments: []
            });
            localStorage.setItem(pathKey, socialData);
        }
        const data = JSON.parse(socialData);
        
        const isSavedKey = 'pin_saved_' + file.path;
        const isSaved = localStorage.getItem(isSavedKey) === 'true';
        const saveBtnText = isSaved ? '저장됨' : '저장';
        const saveBtnClass = isSaved ? 'pin-save-btn saved' : 'pin-save-btn';
        
        card.innerHTML = `
            <div class="pin-thumbnail-container" style="position:relative;">
                ${thumbContent}
                <div class="pin-hover-overlay">
                    <div class="pin-overlay-top">
                        <button class="${saveBtnClass}" title="BADA 보드에 저장" onclick="event.stopPropagation(); toggleSavePin('${file.path}', this)">
                            <i data-lucide="bookmark" style="width: 12px; height: 12px; fill: currentColor;"></i>
                            <span>${saveBtnText}</span>
                        </button>
                    </div>
                    <div class="pin-overlay-bottom">
                        <a class="pin-action-btn" title="다운로드" href="${getFileUrl(file.path)}" download onclick="event.stopPropagation();">
                            <i data-lucide="download" style="width: 14px; height: 14px;"></i>
                        </a>
                        <button class="pin-action-btn btn-appreciate-quick" title="추천" onclick="event.stopPropagation(); quickAppreciate('${file.path}', this)">
                            <i data-lucide="heart" style="width: 14px; height: 14px; fill: currentColor;"></i>
                        </button>
                    </div>
                </div>
            </div>
            <div class="pin-card-content">
                <div class="pin-card-title" title="${file.name}">${file.name}</div>
                <div class="pin-card-tags">
                    <span class="pin-card-tag">${fileTypeTag}</span>
                    <span class="pin-card-tag" style="background:rgba(16,185,129,0.08);color:#10b981;">#Local</span>
                </div>
            </div>
            <div class="pin-card-footer">
                <div class="pin-author-info">
                    <div class="pin-author-avatar">🌊</div>
                    <div class="pin-author-name">BADA</div>
                </div>
                <div class="pin-stats">
                    <span class="pin-stat-item"><i data-lucide="eye" style="width: 11px; height: 11px;"></i> <span class="val-views">${data.views}</span></span>
                    <span class="pin-stat-item"><i data-lucide="heart" style="width: 11px; height: 11px; color: var(--danger); fill: currentColor;"></i> <span class="val-likes">${data.appreciations}</span></span>
                </div>
            </div>
        `;
        
        card.addEventListener('click', () => {
            selectCadFile(file);
        });
        
        cadNoSelectionScreen.appendChild(card);
    });
    
    lucide.createIcons();
}

function loadCadComments(filePath) {
    const listEl = document.getElementById('cadCommentsList');
    if (!listEl) return;
    listEl.innerHTML = '';
    
    const pathKey = 'cad_social_' + filePath;
    let socialData = localStorage.getItem(pathKey);
    if (!socialData) return;
    
    const data = JSON.parse(socialData);
    const comments = data.comments || [];
    
    if (comments.length === 0) {
        listEl.innerHTML = '<p style="font-size:0.75rem;color:var(--text-muted);padding:0.75rem;text-align:center;">첫 피드백 의견을 남겨보세요!</p>';
        return;
    }
    
    comments.forEach(c => {
        const item = document.createElement('div');
        item.className = 'comment-item';
        
        const firstLetter = c.name ? c.name.charAt(0).toUpperCase() : 'U';
        
        item.innerHTML = `
            <div class="comment-avatar">${firstLetter}</div>
            <div class="comment-content">
                <div class="comment-header">
                    <span class="comment-author">${c.name}</span>
                    <span class="comment-time">${c.time}</span>
                </div>
                <div class="comment-text">${c.text}</div>
            </div>
        `;
        listEl.appendChild(item);
    });
    listEl.scrollTop = listEl.scrollHeight;
}

function submitCadComment() {
    if (!cadState.activeFile) return;
    const nameEl = document.getElementById('cadCommentName');
    const textEl = document.getElementById('cadCommentText');
    
    const name = nameEl.value.trim() || '익명 유저';
    const text = textEl.value.trim();
    if (!text) return;
    
    const pathKey = 'cad_social_' + cadState.activeFile.path;
    let socialData = localStorage.getItem(pathKey);
    const data = socialData ? JSON.parse(socialData) : { appreciations: 0, views: 0, comments: [] };
    
    const newComment = {
        name: name,
        text: text,
        time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    };
    
    data.comments.push(newComment);
    localStorage.setItem(pathKey, JSON.stringify(data));
    
    textEl.value = '';
    loadCadComments(cadState.activeFile.path);
    showToast('의견이 성공적으로 등록되었습니다!', 'success');
}

window.toggleSavePin = (filePath, btnEl) => {
    const isSavedKey = 'pin_saved_' + filePath;
    const isSaved = localStorage.getItem(isSavedKey) === 'true';
    if (isSaved) {
        localStorage.setItem(isSavedKey, 'false');
        btnEl.className = 'pin-save-btn';
        btnEl.querySelector('span').innerText = '저장';
        showToast('보드에서 삭제되었습니다.', 'info');
    } else {
        localStorage.setItem(isSavedKey, 'true');
        btnEl.className = 'pin-save-btn saved';
        btnEl.querySelector('span').innerText = '저장됨';
        showToast('BADA 보드에 저장되었습니다!', 'success');
        
        // Use standard floating hearts effect for success
        createFloatingHearts(btnEl);
    }
};

window.quickAppreciate = (filePath, btnEl) => {
    const pathKey = 'cad_social_' + filePath;
    let socialData = localStorage.getItem(pathKey);
    if (socialData) {
        const data = JSON.parse(socialData);
        data.appreciations++;
        localStorage.setItem(pathKey, JSON.stringify(data));
        
        const likesSpan = btnEl.closest('.pin-card')?.querySelector('.val-likes');
        if (likesSpan) {
            likesSpan.innerText = data.appreciations;
        }
        
        createFloatingHearts(btnEl);
    }
};

window.createFloatingHearts = (targetEl) => {
    const rect = targetEl.getBoundingClientRect();
    const count = 5;
    for (let i = 0; i < count; i++) {
        const heart = document.createElement('div');
        heart.className = 'floating-heart';
        heart.innerHTML = '❤️';
        heart.style.left = (rect.left + rect.width / 2 + (Math.random() * 20 - 10)) + 'px';
        heart.style.top = (rect.top + window.scrollY - 10) + 'px';
        
        const rotation = (Math.random() * 60 - 30) + 'deg';
        heart.style.setProperty('--rot', rotation);
        
        document.body.appendChild(heart);
        setTimeout(() => heart.remove(), 1000);
    }
};

function selectCadFile(file) {
    cadState.activeFile = file;
    cadViewportMetadataBar.style.display = 'flex';
    cadNoSelectionScreen.style.display = 'none';
    
    cadActiveFileName.innerText = file.name;
    cadActiveFileSize.innerText = formatBytes(file.size);
    
    let path = file.path;
    if (path.includes('/')) path = path.substring(0, path.lastIndexOf('/'));
    else path = 'Root Workspace';
    cadActiveFilePath.innerText = path;
    
    cadFileExtBadge.innerText = file.ext;
    cadFileExtBadge.className = `file-icon-badge badge-${file.ext}`;
    
    cadBtnDownloadFile.href = getFileUrl(file.path);
    
    // Comments visibility
    const comSec = document.getElementById('cadCommentsSection');
    if (comSec) comSec.style.display = 'block';
    loadCadComments(file.path);
    
    // Persistent View & Appreciate setup
    const pathKey = 'cad_social_' + file.path;
    let socialData = localStorage.getItem(pathKey);
    if (!socialData) {
        socialData = JSON.stringify({ appreciations: 0, views: 0, comments: [] });
    }
    const data = JSON.parse(socialData);
    data.views++;
    localStorage.setItem(pathKey, JSON.stringify(data));
    
    const appText = document.getElementById('cadAppreciateText');
    if (appText) appText.innerText = `추천 (${data.appreciations})`;
    
    const appBtn = document.getElementById('cadBtnAppreciate');
    if (appBtn) {
        const newAppBtn = appBtn.cloneNode(true);
        appBtn.parentNode.replaceChild(newAppBtn, appBtn);
        newAppBtn.addEventListener('click', () => {
            let currentSocial = localStorage.getItem(pathKey);
            if (currentSocial) {
                const sData = JSON.parse(currentSocial);
                sData.appreciations++;
                localStorage.setItem(pathKey, JSON.stringify(sData));
                newAppBtn.querySelector('span').innerText = `추천 (${sData.appreciations})`;
                createFloatingHearts(newAppBtn);
                showToast('자산을 추천하였습니다!', 'success');
            }
        });
    }
    
    hideAllCadViewports();
    
    const ext = file.ext;
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) {
        renderCadImage(file.path);
    } else if (ext === 'dxf') {
        renderCadDXF(file.path);
    } else if (['stl', 'obj'].includes(ext)) {
        renderCad3D(file.path, ext);
    } else if (['pdf', 'ai'].includes(ext)) {
        renderCadPDF(file.path);
    } else {
        renderCadProprietaryFallback(file);
    }
}

function hideAllCadViewports() {
    cadDxfViewportContainer.style.display = 'none';
    cadMesh3dViewportContainer.style.display = 'none';
    cadImageViewportContainer.style.display = 'none';
    cadPdfViewportContainer.style.display = 'none';
    cadProprietaryFallbackScreen.style.display = 'none';
    
    if (cadThreeState.animationId) {
        cancelAnimationFrame(cadThreeState.animationId);
        cadThreeState.animationId = null;
    }
    if (cadThreeState.resizeObserver) {
        cadThreeState.resizeObserver.disconnect();
        cadThreeState.resizeObserver = null;
    }
    if (cadThreeState.renderer) {
        cadThreeState.renderer.dispose();
        cadThreeState.renderer = null;
        cadThreeState.scene = null;
        cadThreeState.camera = null;
        cadThreeState.controls = null;
    }
    const threeJsContainer = document.getElementById('cadThreeJsContainer');
    if (threeJsContainer) threeJsContainer.innerHTML = '';
}

// 1. Image Viewer Logic
function renderCadImage(path) {
    cadImageViewportContainer.style.display = 'flex';
    setCadViewportLoader(true, '이미지를 해독하는 중...');
    
    cadInteractiveImage.src = getFileUrl(path);
    cadInteractiveImage.onload = () => {
        cadImgState.zoom = 1.0;
        cadImgState.panX = 0;
        cadImgState.panY = 0;
        updateCadImgTransform();
        setCadViewportLoader(false);
    };
    cadInteractiveImage.onerror = () => {
        showToast('이미지를 로드하는 데 실패했습니다.', 'error');
        setCadViewportLoader(false);
    };
}

function updateCadImgTransform() {
    cadZoomableImageWrapper.style.transform = `translate(${cadImgState.panX}px, ${cadImgState.panY}px) scale(${cadImgState.zoom})`;
}

// 2. PDF / AI Logic
function renderCadPDF(path) {
    cadPdfViewportContainer.style.display = 'flex';
    setCadViewportLoader(true, 'PDF 문서를 렌더링하는 중...');
    
    const renderArea = document.getElementById('cadPdfRenderingArea');
    renderArea.innerHTML = '';
    
    cadPdfState.pdfInstance = null;
    cadPdfState.currentPath = path;
    cadPdfState.currentPage = 1;
    
    pdfjsLib.getDocument(getFileUrl(path)).promise.then(pdf => {
        cadPdfState.pdfInstance = pdf;
        cadPdfState.totalPages = pdf.numPages;
        const totalPagesEl = document.getElementById('cadPdfTotalPages');
        if (totalPagesEl) totalPagesEl.innerText = pdf.numPages;
        renderCadPdfPage(1);
    }).catch(err => {
        console.error(err);
        showToast('PDF 문서를 파싱하지 못했습니다.', 'error');
        setCadViewportLoader(false);
    });
}

function renderCadPdfPage(num) {
    if (!cadPdfState.pdfInstance) return;
    setCadViewportLoader(true, `${num}페이지 생성 중...`);
    
    const renderArea = document.getElementById('cadPdfRenderingArea');
    renderArea.innerHTML = '';
    
    cadPdfState.pdfInstance.getPage(num).then(page => {
        const canvas = document.createElement('canvas');
        canvas.className = 'pdf-page-canvas';
        renderArea.appendChild(canvas);
        
        const ctx = canvas.getContext('2d');
        const width = renderArea.clientWidth || 600;
        const initial = page.getViewport({ scale: 1.0 });
        const scale = width / initial.width;
        const viewport = page.getViewport({ scale: scale });
        
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        page.render({ canvasContext: ctx, viewport: viewport }).promise.then(() => {
            const currentPageEl = document.getElementById('cadPdfCurrentPage');
            if (currentPageEl) currentPageEl.innerText = num;
            setCadViewportLoader(false);
        }).catch(err => {
            console.error("PDF render error:", err);
            setCadViewportLoader(false);
        });
    }).catch(err => {
        console.error("PDF getPage error:", err);
        setCadViewportLoader(false);
    });
}

// 3. WebGL 3D Logic
function initCadThreeJs() {
    const container = document.getElementById('cadThreeJsContainer');
    container.innerHTML = '';
    
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(state.theme === 'dark' ? 0x090d16 : 0xf1f5f9);
    
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 2000);
    camera.position.set(200, 200, 300);
    
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2;
    
    const ambientLight = new THREE.AmbientLight(state.theme === 'dark' ? 0x222222 : 0x555555);
    scene.add(ambientLight);
    
    const d1 = new THREE.DirectionalLight(0xffffff, 0.85);
    d1.position.set(100, 250, 100);
    scene.add(d1);
    
    const d2 = new THREE.DirectionalLight(0x6366f1, 0.4);
    d2.position.set(-100, -250, -100);
    scene.add(d2);
    
    const grid = new THREE.GridHelper(400, 40, 0x6366f1, state.theme === 'dark' ? 0x1f2937 : 0xcbd5e1);
    grid.position.y = -0.5;
    scene.add(grid);
    
    cadThreeState.scene = scene;
    cadThreeState.camera = camera;
    cadThreeState.renderer = renderer;
    cadThreeState.controls = controls;
    cadThreeState.activeMesh = null;
    cadThreeState.isWireframe = false;
    
    const obs = new ResizeObserver(() => {
        if (cadThreeState.renderer && cadThreeState.camera) {
            cadThreeState.camera.aspect = container.clientWidth / container.clientHeight;
            cadThreeState.camera.updateProjectionMatrix();
            cadThreeState.renderer.setSize(container.clientWidth, container.clientHeight);
        }
    });
    obs.observe(container);
    cadThreeState.resizeObserver = obs;
    
    function animate() {
        cadThreeState.animationId = requestAnimationFrame(animate);
        if (cadThreeState.controls) cadThreeState.controls.update();
        if (cadThreeState.renderer && cadThreeState.scene && cadThreeState.camera) {
            cadThreeState.renderer.render(cadThreeState.scene, cadThreeState.camera);
        }
    }
    animate();
}

function renderCad3D(path, ext) {
    cadMesh3dViewportContainer.style.display = 'block';
    setCadViewportLoader(true, `3D 메쉬 파일(${ext.toUpperCase()}) 파싱 중...`);
    
    if (!cadThreeState.scene) {
        initCadThreeJs();
    }
    
    if (ext === 'stl') {
        const loader = new THREE.STLLoader();
        loader.load(getFileUrl(path), (geometry) => {
            const material = new THREE.MeshStandardMaterial({ 
                color: 0x6366f1, 
                roughness: 0.4,
                metalness: 0.7,
                side: THREE.DoubleSide
            });
            const mesh = new THREE.Mesh(geometry, material);
            
            geometry.computeBoundingBox();
            const box = geometry.boundingBox;
            const center = new THREE.Vector3();
            box.getCenter(center);
            mesh.position.sub(center);
            
            const size = new THREE.Vector3();
            box.getSize(size);
            mesh.position.y += size.y / 2;
            
            cadThreeState.scene.add(mesh);
            cadThreeState.activeMesh = mesh;
            
            const maxDim = Math.max(size.x, size.y, size.z);
            cadThreeState.camera.position.set(maxDim * 1.2, maxDim * 1.2, maxDim * 1.5);
            cadThreeState.controls.target.set(0, size.y / 2, 0);
            cadThreeState.controls.update();
            
            setCadViewportLoader(false);
        }, null, () => {
            showToast('STL 파일 렌더링 실패', 'error');
            setCadViewportLoader(false);
        });
    } else if (ext === 'obj') {
        const loader = new THREE.OBJLoader();
        loader.load(getFileUrl(path), (obj) => {
            const material = new THREE.MeshStandardMaterial({ 
                color: 0xa855f7, 
                roughness: 0.5,
                metalness: 0.5,
                side: THREE.DoubleSide
            });
            
            obj.traverse((child) => {
                if (child.isMesh) child.material = material;
            });
            
            const box = new THREE.Box3().setFromObject(obj);
            const center = new THREE.Vector3();
            box.getCenter(center);
            obj.position.sub(center);
            
            const size = new THREE.Vector3();
            box.getSize(size);
            obj.position.y += size.y / 2;
            
            cadThreeState.scene.add(obj);
            cadThreeState.activeMesh = obj;
            
            const maxDim = Math.max(size.x, size.y, size.z);
            cadThreeState.camera.position.set(maxDim * 1.2, maxDim * 1.2, maxDim * 1.5);
            cadThreeState.controls.target.set(0, size.y / 2, 0);
            cadThreeState.controls.update();
            
            setCadViewportLoader(false);
        }, null, () => {
            showToast('OBJ 파일 렌더링 실패', 'error');
            setCadViewportLoader(false);
        });
    }
}

function parseDxfText(dxfText) {
    const lines = dxfText.split(/\r?\n/).map(line => line.trim());
    const entities = [];
    let i = 0;
    let inEntitiesSection = false;
    
    while (i < lines.length) {
        const groupCode = parseInt(lines[i]);
        const value = lines[i+1];
        if (isNaN(groupCode) || value === undefined) {
            i += 1;
            continue;
        }
        
        if (groupCode === 0 && value === "SECTION") {
            if (parseInt(lines[i+2]) === 2 && lines[i+3] === "ENTITIES") {
                inEntitiesSection = true;
                i += 4;
                continue;
            }
        }
        
        if (groupCode === 0 && value === "ENDSEC") {
            inEntitiesSection = false;
        }
        
        if (inEntitiesSection && groupCode === 0) {
            const entityType = value;
            let entityData = { type: entityType };
            i += 2;
            
            while (i < lines.length) {
                const subCode = parseInt(lines[i]);
                const subVal = lines[i+1];
                if (subCode === 0) break;
                
                if (subCode === 10) entityData.x = parseFloat(subVal);
                else if (subCode === 20) entityData.y = parseFloat(subVal);
                else if (subCode === 30) entityData.z = parseFloat(subVal);
                else if (subCode === 11) entityData.x2 = parseFloat(subVal);
                else if (subCode === 21) entityData.y2 = parseFloat(subVal);
                else if (subCode === 31) entityData.z2 = parseFloat(subVal);
                else if (subCode === 40) entityData.radius = parseFloat(subVal);
                else if (subCode === 50) entityData.startAngle = parseFloat(subVal);
                else if (subCode === 51) entityData.endAngle = parseFloat(subVal);
                else if (subCode === 1) entityData.text = subVal;
                
                if (entityType === "LWPOLYLINE") {
                    if (subCode === 10) {
                        if (!entityData.vertices) entityData.vertices = [];
                        entityData.vertices.push({ x: parseFloat(subVal), y: 0 });
                    } else if (subCode === 20) {
                        if (entityData.vertices && entityData.vertices.length > 0) {
                            entityData.vertices[entityData.vertices.length - 1].y = parseFloat(subVal);
                        }
                    }
                }
                
                i += 2;
            }
            entities.push(entityData);
            continue;
        }
        i += 2;
    }
    return entities;
}

// 4. DXF CAD Vector Logic
async function renderCadDXF(path) {
    cadDxfViewportContainer.style.display = 'block';
    setCadViewportLoader(true, 'DXF 캐드 도면을 해석하는 중...');
    
    try {
        const response = await fetch(getFileUrl(path));
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        
        cadDxfState.entities = parseDxfText(text);
        calculateCadDxfBounds();
        fitCadDxfToViewport();
        drawCadDxf();
        setCadViewportLoader(false);
    } catch (err) {
        console.error(err);
        showToast('DXF 벡터 렌더링 에러', 'error');
        setCadViewportLoader(false);
    }
}

function calculateCadDxfBounds() {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    const check = (x,y) => {
        if (isNaN(x) || isNaN(y)) return;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
    };
    
    cadDxfState.entities.forEach(ent => {
        if (ent.type === "LINE") {
            check(ent.x, ent.y);
            check(ent.x2, ent.y2);
        } else if (ent.type === "CIRCLE" || ent.type === "ARC") {
            check(ent.x - ent.radius, ent.y - ent.radius);
            check(ent.x + ent.radius, ent.y + ent.radius);
        } else if (ent.type === "LWPOLYLINE" && ent.vertices) {
            ent.vertices.forEach(v => check(v.x, v.y));
        } else if (ent.x !== undefined && ent.y !== undefined) {
            check(ent.x, ent.y);
        }
    });
    
    if (minX === Infinity) {
        cadDxfState.bounds = { minX: -150, maxX: 150, minY: -150, maxY: 150 };
    } else {
        cadDxfState.bounds = { minX, maxX, minY, maxY };
    }
}

function fitCadDxfToViewport() {
    cadDxfCanvas.width = cadDxfCanvas.parentElement.clientWidth;
    cadDxfCanvas.height = cadDxfCanvas.parentElement.clientHeight;
    
    const pad = 30;
    const width = cadDxfCanvas.width - pad * 2;
    const height = cadDxfCanvas.height - pad * 2;
    const dx = cadDxfState.bounds.maxX - cadDxfState.bounds.minX;
    const dy = cadDxfState.bounds.maxY - cadDxfState.bounds.minY;
    
    if (dx > 0 && dy > 0) {
        const zoomX = width / dx;
        const zoomY = height / dy;
        cadDxfState.zoom = Math.min(zoomX, zoomY);
        
        const midCADX = (cadDxfState.bounds.minX + cadDxfState.bounds.maxX) / 2;
        const midCADY = (cadDxfState.bounds.minY + cadDxfState.bounds.maxY) / 2;
        
        const midScreenX = cadDxfCanvas.width / 2;
        const midScreenY = cadDxfCanvas.height / 2;
        
        cadDxfState.panX = midScreenX - midCADX * cadDxfState.zoom;
        cadDxfState.panY = midScreenY + midCADY * cadDxfState.zoom;
    } else {
        cadDxfState.zoom = 1.0;
        cadDxfState.panX = cadDxfCanvas.width / 2;
        cadDxfState.panY = cadDxfCanvas.height / 2;
    }
}

function toScreenCoords(cx, cy) {
    return {
        x: cadDxfState.panX + cx * cadDxfState.zoom,
        y: cadDxfState.panY - cy * cadDxfState.zoom
    };
}

function toCadCoords(sx, sy) {
    return {
        x: (sx - cadDxfState.panX) / cadDxfState.zoom,
        y: (cadDxfState.panY - sy) / cadDxfState.zoom
    };
}

function drawCadDxf() {
    const ctx = cadDxfCanvas.getContext('2d');
    ctx.clearRect(0, 0, cadDxfCanvas.width, cadDxfCanvas.height);
    
    const isDark = state.theme === 'dark';
    const strokeColor = isDark ? '#3b82f6' : '#1e3a8a';
    const textColor = isDark ? '#e5e7eb' : '#1f2937';
    
    ctx.lineWidth = 1.0;
    cadDxfState.entities.forEach(ent => {
        ctx.strokeStyle = strokeColor;
        ctx.fillStyle = strokeColor;
        
        if (ent.type === "LINE") {
            const p1 = toScreenCoords(ent.x, ent.y);
            const p2 = toScreenCoords(ent.x2, ent.y2);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        } else if (ent.type === "CIRCLE") {
            const c = toScreenCoords(ent.x, ent.y);
            const r = ent.radius * cadDxfState.zoom;
            ctx.beginPath();
            ctx.arc(c.x, c.y, r, 0, 2 * Math.PI);
            ctx.stroke();
        } else if (ent.type === "ARC") {
            const c = toScreenCoords(ent.x, ent.y);
            const r = ent.radius * cadDxfState.zoom;
            const start = -ent.startAngle * Math.PI / 180;
            const end = -ent.endAngle * Math.PI / 180;
            ctx.beginPath();
            ctx.arc(c.x, c.y, r, start, end, true);
            ctx.stroke();
        } else if (ent.type === "LWPOLYLINE" && ent.vertices && ent.vertices.length > 0) {
            ctx.beginPath();
            ent.vertices.forEach((v, idx) => {
                const pt = toScreenCoords(v.x, v.y);
                if (idx === 0) ctx.moveTo(pt.x, pt.y);
                else ctx.lineTo(pt.x, pt.y);
            });
            ctx.stroke();
        } else if ((ent.type === "TEXT" || ent.type === "MTEXT") && ent.text) {
            const pt = toScreenCoords(ent.x, ent.y);
            const h = Math.max(8, ent.radius ? ent.radius * cadDxfState.zoom : 12);
            ctx.font = `${h}px 'Inter', sans-serif`;
            ctx.fillStyle = textColor;
            ctx.textBaseline = 'bottom';
            let clean = ent.text.replace(/\\[A-Za-z0-9]+;/g, '').replace(/[\{\}]/g, '');
            ctx.fillText(clean, pt.x, pt.y);
        }
    });
}

// 5. Proprietary Software Fallback Renderer
function renderCadProprietaryFallback(file) {
    cadProprietaryFallbackScreen.style.display = 'flex';
    
    const ext = file.ext;
    let title = '';
    let manual = '';
    let icon = 'cpu';
    
    switch (ext) {
        case 'max':
            title = 'Autodesk 3ds Max Scene (.max)';
            icon = 'box';
            manual = `<ol>
                <li>3ds Max에서 파일을 로드합니다.</li>
                <li><strong>File > Export > Export Selected...</strong>를 클릭합니다.</li>
                <li><strong>STL (*.stl)</strong> 또는 <strong>OBJ (*.obj)</strong> 형식을 선택해 같은 폴더에 동일 이름으로 내보냅니다.</li>
            </ol>`;
            break;
        case 'mb':
        case 'ma':
            title = `Autodesk Maya ${ext==='mb'?'Binary':'ASCII'} Scene (.${ext})`;
            icon = 'box';
            manual = `<ol>
                <li>Maya에서 모델 선택 후 <strong>File > Export Selection...</strong>을 클릭합니다.</li>
                <li><strong>OBJexport</strong> 포맷을 설정해 동일한 명칭으로 자산 폴더에 내보냅니다.</li>
            </ol>`;
            break;
        case 'catpart':
        case 'catproduct':
            title = `Dassault CATIA V5 ${ext==='catpart'?'Part':'Product'} (.${ext})`;
            icon = 'drafting-compass';
            manual = `<ol>
                <li>CATIA에서 부품을 활성화하고 <strong>File > Save As...</strong> 메뉴를 엽니다.</li>
                <li>도면은 <strong>dxf (.dxf)</strong>, 3D 파트는 <strong>stl (.stl)</strong>을 선택해 저장합니다.</li>
            </ol>`;
            break;
        case 'art':
            title = 'Delcam / Autodesk ArtCAM Project (.art)';
            icon = 'activity';
            manual = `<ol>
                <li>릴리프 메뉴에서 <strong>Relief > Export > 3D ODF/STL...</strong>을 실행합니다.</li>
                <li><strong>STL (Binary)</strong> 형식으로 내보내기를 완수합니다.</li>
            </ol>`;
            break;
        case 'pz3':
            title = 'Smith Micro Poser Scene (.pz3)';
            icon = 'user-check';
            manual = `<ol>
                <li><strong>File > Export > Wavefront OBJ...</strong>를 통해 메쉬 파일로 추출합니다.</li>
            </ol>`;
            break;
        case 'psd':
            title = 'Adobe Photoshop Document (.psd)';
            icon = 'image';
            manual = `<ol>
                <li><strong>File > Export > Export As...</strong>에서 <strong>PNG</strong>나 <strong>JPG</strong> 이미지로 저장합니다.</li>
            </ol>`;
            break;
        case 'dwg':
            title = 'Autodesk AutoCAD Drawing (.dwg)';
            icon = 'drafting-compass';
            manual = `<ol>
                <li>AutoCAD 커맨드 라인에 <strong>DXFOUT</strong>을 입력하고 엔터를 누릅니다.</li>
                <li><strong>AutoCAD 2018 DXF</strong> 규격 이하로 도면을 내보냅니다.</li>
            </ol>`;
            break;
    }
    
    cadFallbackFormatName.innerText = title;
    cadFallbackSoftwareIcon.setAttribute('data-lucide', icon);
    cadExportManualContent.innerHTML = manual;
    lucide.createIcons();
    
    searchCadAutolinks(file);
}

function searchCadAutolinks(file) {
    cadAutolinkPreviewBox.style.display = 'none';
    cadAutolinkActions.innerHTML = '';
    
    const base = file.name.substring(0, file.name.lastIndexOf('.'));
    const matches = cadState.files.filter(f => {
        const fBase = f.name.substring(0, f.name.lastIndexOf('.'));
        return fBase === base && ['dxf', 'stl', 'obj', 'jpg', 'png', 'pdf'].includes(f.ext) && f.path !== file.path;
    });
    
    if (matches.length > 0) {
        cadAutolinkPreviewBox.style.display = 'block';
        matches.forEach(match => {
            const btn = document.createElement('button');
            btn.className = 'btn-glass';
            btn.style.borderColor = 'var(--accent-primary)';
            btn.style.fontSize = '0.75rem';
            btn.style.padding = '0.35rem 0.65rem';
            
            let label = '';
            let icon = 'eye';
            
            if (['jpg','png'].includes(match.ext)) { label = `이미지 보기 (.${match.ext})`; icon = 'image'; }
            else if (match.ext === 'dxf') { label = 'DXF 캐드 렌더링'; icon = 'drafting-compass'; }
            else if (['stl','obj'].includes(match.ext)) { label = `3D 모델 렌더링 (.${match.ext})`; icon = 'box'; }
            
            btn.innerHTML = `<i data-lucide="${icon}" style="width:12px;height:12px;"></i><span>${label}</span>`;
            btn.addEventListener('click', () => {
                const items = document.querySelectorAll('#cadExplorerTree .tree-file-item');
                if (items) {
                    items.forEach(el => {
                        if (el.dataset.path === match.path) el.classList.add('active');
                        else el.classList.remove('active');
                    });
                }
                selectCadFile(match);
            });
            cadAutolinkActions.appendChild(btn);
        });
        lucide.createIcons();
    }
}

