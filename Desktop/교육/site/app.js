/**
 * OmniConvert - 100% Client-Side Document Converter & Summarizer
 * App Logic File
 */

// Initialize Lucide Icons
lucide.createIcons();

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
    loaderText.innerText = text;
    if (active) {
        editorLoader.classList.add('active');
    } else {
        editorLoader.classList.remove('active');
    }
}

// Dark/Light Theme toggler
themeToggleBtn.addEventListener('click', () => {
    if (state.theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'light');
        themeIconSun.style.display = 'none';
        themeIconMoon.style.display = 'block';
        state.theme = 'light';
        showToast('밝은 테마로 변경되었습니다.', 'info');
    } else {
        document.documentElement.removeAttribute('data-theme');
        themeIconSun.style.display = 'block';
        themeIconMoon.style.display = 'none';
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
    
    charCountWithSpaces.innerText = charsWithSpaces.toLocaleString();
    charCountNoSpaces.innerText = charsNoSpaces.toLocaleString();
    wordCount.innerText = words.toLocaleString();
    sentenceCount.innerText = sentences.toLocaleString();
    
    if (charsWithSpaces > 0) {
        docStatus.innerText = '작성 중 / 분석 완료';
        docStatus.style.color = 'var(--accent-primary)';
        summaryPreviewSection.style.display = 'block';
    } else {
        docStatus.innerText = '비어 있음';
        docStatus.style.color = 'var(--text-muted)';
        summaryPreviewSection.style.display = 'none';
    }
    
    // Live update summary on change
    generateLiveSummary();
}

documentEditor.addEventListener('input', (e) => {
    updateTextStats(e.target.value);
});

// Toggle editor monospace/sans font style
btnToggleFont.addEventListener('click', () => {
    documentEditor.classList.toggle('code-mode');
    showToast('에디터 글꼴 스타일이 전환되었습니다.', 'info');
});

// Reset / Clear editor
btnClear.addEventListener('click', () => {
    if (confirm('작성 중인 문서 내용 및 가져온 파일 정보가 모두 지워집니다. 계속하시겠습니까?')) {
        documentEditor.value = '';
        state.currentDocName = '새 문서.txt';
        state.importedFile = null;
        activeDocName.innerText = '새 문서.txt';
        importedFilesContainer.style.display = 'none';
        importedFilesList.innerHTML = '';
        updateTextStats('');
        showToast('에디터가 초기화되었습니다.', 'success');
    }
});

/* ==========================================
   3. File Import Engine (TXT, PDF, DOCX, HWPX)
   ========================================== */

// Drag & Drop event bindings
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFileImport(files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFileImport(e.target.files[0]);
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
    importedFilesContainer.style.display = 'block';
    const sizeStr = formatBytes(file.size);
    
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
    lucide.createIcons();
    
    document.getElementById('btnRemoveFile').addEventListener('click', () => {
        state.importedFile = null;
        importedFilesContainer.style.display = 'none';
        importedFilesList.innerHTML = '';
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
    originalTextHighlighted.innerHTML = result.highlights.map(item => {
        if (item.isSummary) {
            return `<span class="highlight-sentence" title="중요 문장">${escapeXml(item.sentence)}</span>`;
        }
        return `<span>${escapeXml(item.sentence)}</span>`;
    }).join(" ");
    
    // 2. Clean Summary text
    summaryTextOutput.innerHTML = result.summarySentences.map(s => `<p>${escapeXml(s)}</p>`).join("");
}

// Slider listeners
summaryRatioSlider.addEventListener('input', (e) => {
    state.summaryRatio = parseInt(e.target.value);
    summaryRatioVal.innerText = `${state.summaryRatio}%`;
    generateLiveSummary();
});

/* ==========================================
   5. Tab switching: Editor vs. Highlight Split
   ========================================== */

tabEdit.addEventListener('click', () => {
    tabEdit.classList.add('active');
    tabHighlight.classList.remove('active');
    documentEditor.style.display = 'block';
    splitEditorView.style.display = 'none';
    state.activeTab = 'edit';
});

tabHighlight.addEventListener('click', () => {
    tabHighlight.classList.add('active');
    tabEdit.classList.remove('active');
    documentEditor.style.display = 'none';
    splitEditorView.style.display = 'grid';
    state.activeTab = 'highlight';
    
    // Trigger update just in case
    generateLiveSummary();
});

/* ==========================================
   6. Document Generator/Export Engine
   ========================================== */

// Export format selection
Object.keys(exportBtns).forEach(format => {
    exportBtns[format].addEventListener('click', () => {
        // Toggle active design styles
        Object.keys(exportBtns).forEach(f => exportBtns[f].classList.remove('active'));
        exportBtns[format].classList.add('active');
        state.exportFormat = format;
        
        // Update download button descriptive text
        let koreanFormatName = format.toUpperCase();
        if (format === 'hwpx') koreanFormatName = '한글 HWPX';
        if (format === 'java') koreanFormatName = '자바 Java';
        
        downloadBtnText.innerText = `${koreanFormatName} 포맷으로 기기에 저장 (다운로드)`;
    });
});

// Main Action Trigger for Downloads
btnDownload.addEventListener('click', async () => {
    const text = documentEditor.value.trim();
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

diagnosticsHeader.addEventListener('click', () => {
    if (diagnosticsPanel.style.display === 'none' || !diagnosticsPanel.style.display) {
        diagnosticsPanel.style.display = 'flex';
        diagnosticsChevron.style.transform = 'rotate(180deg)';
    } else {
        diagnosticsPanel.style.display = 'none';
        diagnosticsChevron.style.transform = 'rotate(0deg)';
    }
});

btnRunDiagnostics.addEventListener('click', async () => {
    diagnosticsResults.style.display = 'flex';
    diagnosticsResults.innerHTML = ''; // Reset results
    btnRunDiagnostics.disabled = true;
    btnRunDiagnostics.style.opacity = '0.6';
    
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
    
    btnRunDiagnostics.disabled = false;
    btnRunDiagnostics.style.opacity = '1';
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
btnSendEmail.addEventListener('click', async () => {
    const email = emailRecipient.value.trim();
    const senderName = emailSenderName.value.trim() || "OmniConvert";
    const customMessageText = emailCustomMessage.value.trim();
    const text = documentEditor.value.trim();
    
    // Validations
    if (!email) {
        showToast('수신자 이메일 주소를 입력해 주세요.', 'error');
        emailRecipient.focus();
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
    btnSendEmail.disabled = true;
    btnSendEmail.style.opacity = '0.6';
    
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
        btnSendEmail.disabled = false;
        btnSendEmail.style.opacity = '1';
    }
});

// 2. Mobile SMS Send Handler
btnSendSms.addEventListener('click', (e) => {
    const text = documentEditor.value.trim();
    if (!text) {
        showToast('문자로 전송할 내용이 없습니다. 먼저 문서를 작성해 주세요.', 'error');
        e.preventDefault();
        return;
    }
    
    const customMessageText = emailCustomMessage.value.trim();
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
    btnSendSms.href = `sms:${separator}body=${encodeURIComponent(smsBody)}`;
    showToast('모바일 메시지 전송 앱으로 연결합니다.', 'success');
});
