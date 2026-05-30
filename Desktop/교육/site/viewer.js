/**
 * OmniCAD & Media Viewer Client Logic
 */

// Initialize Lucide Icons on launch
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

// Global Application State
const viewerState = {
    theme: 'dark',
    files: [],
    activeFile: null,
    searchQuery: '',
    currentFilter: 'all', // 'all', 'cad', 'media'
};

// State caches for drawing views
const dxfState = {
    entities: [],
    zoom: 1.0,
    panX: 0,
    panY: 0,
    isDragging: false,
    startX: 0,
    startY: 0,
    bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 }
};

const imgState = {
    zoom: 1.0,
    panX: 0,
    panY: 0,
    isDragging: false,
    startX: 0,
    startY: 0
};

const pdfState = {
    pdfInstance: null,
    currentPage: 1,
    totalPages: 1,
    currentPath: ''
};

const threeState = {
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    activeMesh: null,
    animationId: null,
    resizeObserver: null,
    isWireframe: false
};

// UI Elements
const themeToggleBtn = document.getElementById('themeToggleBtn');
const themeIconSun = document.getElementById('themeIconSun');
const themeIconMoon = document.getElementById('themeIconMoon');
const btnRefresh = document.getElementById('btnRefresh');
const fileSearch = document.getElementById('fileSearch');
const filterAll = document.getElementById('filterAll');
const filterCAD = document.getElementById('filterCAD');
const filterMedia = document.getElementById('filterMedia');
const explorerTree = document.getElementById('explorerTree');
const sidebarLoader = document.getElementById('sidebarLoader');

const viewportMetadataBar = document.getElementById('viewportMetadataBar');
const activeFileName = document.getElementById('activeFileName');
const activeFileSize = document.getElementById('activeFileSize');
const activeFilePath = document.getElementById('activeFilePath');
const fileExtBadge = document.getElementById('fileExtBadge');
const btnOpenNative = document.getElementById('btnOpenNative');
const btnDownloadFile = document.getElementById('btnDownloadFile');

const viewportDisplayArea = document.getElementById('viewportDisplayArea');
const noSelectionScreen = document.getElementById('noSelectionScreen');
const viewportLoader = document.getElementById('viewportLoader');
const viewportLoaderText = document.getElementById('viewportLoaderText');

// Viewports
const dxfViewportContainer = document.getElementById('dxfViewportContainer');
const dxfCanvas = document.getElementById('dxfCanvas');
const mesh3dViewportContainer = document.getElementById('mesh3dViewportContainer');
const imageViewportContainer = document.getElementById('imageViewportContainer');
const interactiveImage = document.getElementById('interactiveImage');
const zoomableImageWrapper = document.getElementById('zoomableImageWrapper');
const pdfViewportContainer = document.getElementById('pdfViewportContainer');
const proprietaryFallbackScreen = document.getElementById('proprietaryFallbackScreen');

// Fallback screen items
const fallbackFormatName = document.getElementById('fallbackFormatName');
const fallbackSoftwareIcon = document.getElementById('fallbackSoftwareIcon');
const btnFallbackOpenNative = document.getElementById('btnFallbackOpenNative');
const exportManualContent = document.getElementById('exportManualContent');
const autolinkPreviewBox = document.getElementById('autolinkPreviewBox');
const autolinkActions = document.getElementById('autolinkActions');
const toastContainer = document.getElementById('toastContainer');

/* ==========================================
   1. Toast & Theme Helper Functions
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
    
    setTimeout(() => {
        toast.style.transform = 'translateY(100px)';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

function setViewportLoader(active, text = '도면을 분석하고 있습니다...') {
    viewportLoaderText.innerText = text;
    viewportLoader.style.display = active ? 'flex' : 'none';
}

themeToggleBtn?.addEventListener('click', () => {
    if (viewerState.theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'light');
        if (themeIconSun) themeIconSun.style.display = 'none';
        if (themeIconMoon) themeIconMoon.style.display = 'block';
        viewerState.theme = 'light';
        showToast('밝은 테마로 전환되었습니다.', 'info');
    } else {
        document.documentElement.removeAttribute('data-theme');
        if (themeIconSun) themeIconSun.style.display = 'block';
        if (themeIconMoon) themeIconMoon.style.display = 'none';
        viewerState.theme = 'dark';
        showToast('어두운 테마로 전환되었습니다.', 'info');
    }
    // Redraw DXF canvas in case colors changed
    if (dxfState.entities.length > 0) {
        drawDxf();
    }
});

/* ==========================================
   2. Fetching & Filtering Local Files API
   ========================================== */

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

async function fetchProjectFiles() {
    sidebarLoader.style.display = 'flex';
    try {
        const response = await fetch(getApiUrl('/api/list_files'));
        if (!response.ok) throw new Error("서버 응답 오류");
        const data = await response.json();
        viewerState.files = data;
        applyFilters();
    } catch (err) {
        console.error("실시간 파일 목록 로드 실패. 데모 데이터로 대체합니다.", err);
        showToast("로컬 서버 미작동. 데모용 기본 파일 목록을 로드했습니다.", "info");
        viewerState.files = [
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
        applyFilters();
    } finally {
        sidebarLoader.style.display = 'none';
    }
}

function applyFilters() {
    let filtered = viewerState.files;
    
    if (viewerState.searchQuery) {
        const q = viewerState.searchQuery.toLowerCase();
        filtered = filtered.filter(f => f.name.toLowerCase().includes(q));
    }
    
    const cadExts = ['dxf', 'dwg', 'stl', 'obj', 'max', 'art', 'pz3', 'catpart', 'catproduct', 'mb', 'ma'];
    const mediaExts = ['jpg', 'jpeg', 'png', 'gif', 'ai', 'psd', 'pdf'];
    
    if (viewerState.currentFilter === 'cad') {
        filtered = filtered.filter(f => cadExts.includes(f.ext));
    } else if (viewerState.currentFilter === 'media') {
        filtered = filtered.filter(f => mediaExts.includes(f.ext));
    }
    
    renderExplorerTree(filtered);
    if (viewerState.activeFile === null) {
        renderBehanceGrid(filtered);
    }
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function renderExplorerTree(files) {
    explorerTree.innerHTML = '';
    
    if (files.length === 0) {
        explorerTree.innerHTML = '<div style="padding: 1.5rem; text-align: center; color: var(--text-muted);"><p>검색 조건에 맞는 도면 파일이 없습니다.</p></div>';
        return;
    }
    
    const groups = {};
    files.forEach(file => {
        let folder = '루트 폴더';
        if (file.path.includes('/')) {
            folder = file.path.substring(0, file.path.lastIndexOf('/'));
        }
        if (!groups[folder]) groups[folder] = [];
        groups[folder].push(file);
    });
    
    const sortedFolders = Object.keys(groups).sort((a, b) => {
        if (a === '루트 폴더') return -1;
        if (b === '루트 폴더') return 1;
        return a.localeCompare(b);
    });
    
    sortedFolders.forEach(folder => {
        const folderDiv = document.createElement('div');
        folderDiv.className = 'folder-group';
        
        const titleDiv = document.createElement('div');
        titleDiv.className = 'folder-title';
        titleDiv.innerHTML = `<i data-lucide="folder" style="width: 14px; height: 14px;"></i><span>${folder}</span>`;
        folderDiv.appendChild(titleDiv);
        
        const sortedFiles = groups[folder].sort((a, b) => a.name.localeCompare(b.name));
        
        sortedFiles.forEach(file => {
            const fileItem = document.createElement('div');
            fileItem.className = 'tree-file-item';
            if (viewerState.activeFile && viewerState.activeFile.path === file.path) {
                fileItem.classList.add('active');
            }
            
            const sizeStr = formatBytes(file.size);
            
            fileItem.innerHTML = `
                <div class="tree-file-left">
                    <div class="tree-file-icon badge-${file.ext}">${file.ext}</div>
                    <div class="tree-file-details">
                        <div class="tree-file-name" title="${file.name}">${file.name}</div>
                        <div class="tree-file-size">${sizeStr}</div>
                    </div>
                </div>
                <div class="tree-file-action">
                    <i data-lucide="chevron-right" style="width: 14px; height: 14px; color: var(--text-muted);"></i>
                </div>
            `;
            
            fileItem.addEventListener('click', () => {
                const items = document.querySelectorAll('.tree-file-item');
                if (items) {
                    items.forEach(el => el.classList.remove('active'));
                }
                fileItem.classList.add('active');
                selectFile(file);
            });
            
            folderDiv.appendChild(fileItem);
        });
        
        explorerTree.appendChild(folderDiv);
    });
    
    lucide.createIcons();
}

// Search & Filter event bindings
fileSearch?.addEventListener('input', (e) => {
    viewerState.searchQuery = e.target.value;
    applyFilters();
});

filterAll?.addEventListener('click', () => {
    toggleFilterTab(filterAll, 'all');
});
filterCAD?.addEventListener('click', () => {
    toggleFilterTab(filterCAD, 'cad');
});
filterMedia?.addEventListener('click', () => {
    toggleFilterTab(filterMedia, 'media');
});

function toggleFilterTab(activeBtn, filter) {
    [filterAll, filterCAD, filterMedia].forEach(btn => btn?.classList.remove('active'));
    activeBtn?.classList.add('active');
    viewerState.currentFilter = filter;
    applyFilters();
}

btnRefresh?.addEventListener('click', () => {
    viewerState.activeFile = null;
    if (viewportMetadataBar) viewportMetadataBar.style.display = 'none';
    const commentsSec = document.getElementById('commentsSection');
    if (commentsSec) commentsSec.style.display = 'none';
    fetchProjectFiles();
    showToast('도면 파일 목록을 새로 갱신했습니다.', 'success');
});

function renderBehanceGrid(files) {
    if (!noSelectionScreen) return;
    
    noSelectionScreen.innerHTML = '';
    noSelectionScreen.className = 'pinterest-grid';
    noSelectionScreen.removeAttribute('style'); // reset layout styles
    
    if (files.length === 0) {
        noSelectionScreen.innerHTML = '<div style="padding: 3rem; text-align: center; color: var(--text-muted);"><p>검색 조건에 맞는 도면 파일이 없습니다.</p></div>';
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
            selectFile(file);
            const items = document.querySelectorAll('.tree-file-item');
            if (items) {
                items.forEach(el => el.classList.remove('active'));
            }
            const sidebarItems = Array.from(document.querySelectorAll('.tree-file-item'));
            const matchingItem = sidebarItems.find(el => {
                const nameEl = el.querySelector('.tree-file-name');
                return nameEl && nameEl.innerText === file.name;
            });
            if (matchingItem) matchingItem.classList.add('active');
        });
        
        noSelectionScreen.appendChild(card);
    });
    
    lucide.createIcons();
}

function loadComments(filePath) {
    const listEl = document.getElementById('commentsList');
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

function submitComment() {
    if (!viewerState.activeFile) return;
    const nameEl = document.getElementById('commentName');
    const textEl = document.getElementById('commentText');
    
    const name = nameEl.value.trim() || '익명 유저';
    const text = textEl.value.trim();
    if (!text) return;
    
    const pathKey = 'cad_social_' + viewerState.activeFile.path;
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
    loadComments(viewerState.activeFile.path);
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

function selectFile(file) {
    viewerState.activeFile = file;
    
    viewportMetadataBar.style.display = 'flex';
    noSelectionScreen.style.display = 'none';
    
    activeFileName.innerText = file.name;
    activeFileSize.innerText = formatBytes(file.size);
    
    let pathLabel = file.path;
    if (pathLabel.includes('/')) {
        pathLabel = pathLabel.substring(0, pathLabel.lastIndexOf('/'));
    } else {
        pathLabel = 'Root Workspace';
    }
    activeFilePath.innerText = pathLabel;
    
    fileExtBadge.innerText = file.ext;
    fileExtBadge.className = `file-icon-badge badge-${file.ext}`;
    
    btnDownloadFile.href = getFileUrl(file.path);
    
    // Comments section visibility
    const comSec = document.getElementById('commentsSection');
    if (comSec) comSec.style.display = 'block';
    loadComments(file.path);
    
    // Views & Appreciate tracker setup
    const pathKey = 'cad_social_' + file.path;
    let socialData = localStorage.getItem(pathKey);
    if (!socialData) {
        socialData = JSON.stringify({ appreciations: 0, views: 0, comments: [] });
    }
    const data = JSON.parse(socialData);
    data.views++;
    localStorage.setItem(pathKey, JSON.stringify(data));
    
    const appText = document.getElementById('btnAppreciateText');
    if (appText) appText.innerText = `추천 (${data.appreciations})`;
    
    const appBtn = document.getElementById('btnAppreciate');
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
    
    hideAllViewports();
    
    const ext = file.ext;
    
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) {
        renderImage(file.path);
    } 
    else if (ext === 'dxf') {
        renderDXF(file.path);
    } 
    else if (['stl', 'obj'].includes(ext)) {
        render3D(file.path, ext);
    } 
    else if (['pdf', 'ai'].includes(ext)) {
        renderPDF(file.path);
    } 
    else if (['dwg', 'max', 'mb', 'ma', 'catpart', 'catproduct', 'art', 'pz3', 'psd'].includes(ext)) {
        renderProprietaryFallback(file);
    }
}

function hideAllViewports() {
    dxfViewportContainer.style.display = 'none';
    mesh3dViewportContainer.style.display = 'none';
    imageViewportContainer.style.display = 'none';
    pdfViewportContainer.style.display = 'none';
    proprietaryFallbackScreen.style.display = 'none';
    
    // Clean up Three.js animation and renderers to conserve memory
    if (threeState.animationId) {
        cancelAnimationFrame(threeState.animationId);
        threeState.animationId = null;
    }
    if (threeState.resizeObserver) {
        threeState.resizeObserver.disconnect();
        threeState.resizeObserver = null;
    }
    if (threeState.renderer) {
        threeState.renderer.dispose();
        threeState.renderer = null;
        threeState.scene = null;
        threeState.camera = null;
        threeState.controls = null;
    }
    const container = document.getElementById('threeJsContainer');
    container.innerHTML = '';
}

// Bind Open Native App buttons (main bar and fallback screen)
const triggerOpenNative = async () => {
    if (!viewerState.activeFile) return;
    showToast('로컬 네이티브 프로그램을 구동하고 있습니다...', 'info');
    try {
        const response = await fetch(getApiUrl(`/api/open_file?path=${encodeURIComponent(viewerState.activeFile.path)}`));
        if (!response.ok) throw new Error("서버 응답 오류");
        const result = await response.json();
        if (result.status === 'success') {
            showToast(result.message, 'success');
        } else {
            showToast(result.message, 'error');
        }
    } catch (err) {
        console.error(err);
        showToast('로컬 연동에 실패했습니다: API 서버가 닫혀있거나 로컬이 아닙니다.', 'error');
    }
};

btnOpenNative?.addEventListener('click', triggerOpenNative);
btnFallbackOpenNative?.addEventListener('click', triggerOpenNative);

/* ==========================================
   4. Image Viewer (JPG / PNG)
   ========================================== */

function renderImage(path) {
    imageViewportContainer.style.display = 'flex';
    setViewportLoader(true, "이미지 파일을 불러오고 있습니다...");
    
    interactiveImage.src = getFileUrl(path);
    
    interactiveImage.onload = () => {
        // Reset scale and offsets
        imgState.zoom = 1.0;
        imgState.panX = 0;
        imgState.panY = 0;
        updateImgTransform();
        setViewportLoader(false);
    };
    
    interactiveImage.onerror = () => {
        showToast("이미지를 불러오는 데 실패했습니다.", "error");
        setViewportLoader(false);
    };
}

function updateImgTransform() {
    zoomableImageWrapper.style.transform = `translate(${imgState.panX}px, ${imgState.panY}px) scale(${imgState.zoom})`;
}

// Image dragging events
zoomableImageWrapper?.addEventListener('mousedown', (e) => {
    if (viewerState.activeFile && ['jpg', 'jpeg', 'png', 'gif'].includes(viewerState.activeFile.ext)) {
        imgState.isDragging = true;
        imgState.startX = e.clientX - imgState.panX;
        imgState.startY = e.clientY - imgState.panY;
    }
});

window.addEventListener('mousemove', (e) => {
    if (imgState.isDragging) {
        imgState.panX = e.clientX - imgState.startX;
        imgState.panY = e.clientY - imgState.startY;
        updateImgTransform();
    }
});

window.addEventListener('mouseup', () => {
    imgState.isDragging = false;
});

// Image Wheel zoom
zoomableImageWrapper?.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = 1.1;
    if (e.deltaY < 0) {
        imgState.zoom *= zoomFactor;
    } else {
        imgState.zoom /= zoomFactor;
    }
    imgState.zoom = Math.max(0.1, Math.min(10, imgState.zoom));
    updateImgTransform();
}, { passive: false });

// HUD bindings
document.getElementById('btnImgZoomIn')?.addEventListener('click', () => {
    imgState.zoom *= 1.25;
    updateImgTransform();
});
document.getElementById('btnImgZoomOut')?.addEventListener('click', () => {
    imgState.zoom /= 1.25;
    updateImgTransform();
});
document.getElementById('btnImgReset')?.addEventListener('click', () => {
    imgState.zoom = 1.0;
    imgState.panX = 0;
    imgState.panY = 0;
    updateImgTransform();
});

/* ==========================================
   5. PDF / Adobe Illustrator Viewer (.pdf, .ai)
   ========================================== */

function renderPDF(path) {
    pdfViewportContainer.style.display = 'flex';
    setViewportLoader(true, "PDF 문서를 해석하는 중...");
    
    const pdfjsLib = window.pdfjsLib || window['pdfjs-dist/build/pdf'];
    if (!pdfjsLib) {
        showToast("PDF 렌더링 라이브러리(PDF.js)가 로드되지 않았습니다.", "error");
        setViewportLoader(false);
        return;
    }
    
    const renderArea = document.getElementById('pdfRenderingArea');
    renderArea.innerHTML = '';
    
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
    
    pdfState.currentPath = path;
    pdfState.currentPage = 1;
    
    pdfjsLib.getDocument(getFileUrl(path)).promise.then((pdf) => {
        pdfState.pdfInstance = pdf;
        pdfState.totalPages = pdf.numPages;
        const totalPagesEl = document.getElementById('pdfTotalPages');
        if (totalPagesEl) totalPagesEl.innerText = pdf.numPages;
        renderPdfPage(1);
    }).catch(err => {
        console.error(err);
        showToast("PDF 도면 해석에 실패했습니다. 형식 규격 에러.", "error");
        setViewportLoader(false);
    });
}

function renderPdfPage(pageNum) {
    if (!pdfState.pdfInstance) return;
    setViewportLoader(true, `도면 ${pageNum}페이지 렌더링 중...`);
    
    const renderArea = document.getElementById('pdfRenderingArea');
    renderArea.innerHTML = '';
    
    pdfState.pdfInstance.getPage(pageNum).then((page) => {
        const canvas = document.createElement('canvas');
        canvas.className = 'pdf-page-canvas';
        renderArea.appendChild(canvas);
        
        const ctx = canvas.getContext('2d');
        const viewportWidth = renderArea.clientWidth || 800;
        const initialViewport = page.getViewport({ scale: 1.0 });
        const scale = viewportWidth / initialViewport.width;
        const viewport = page.getViewport({ scale: scale });
        
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        const renderCtx = {
            canvasContext: ctx,
            viewport: viewport
        };
        
        page.render(renderCtx).promise.then(() => {
            const currentPageEl = document.getElementById('pdfCurrentPage');
            if (currentPageEl) currentPageEl.innerText = pageNum;
            setViewportLoader(false);
        }).catch(err => {
            console.error("PDF page render error:", err);
            setViewportLoader(false);
        });
    }).catch(err => {
        console.error(err);
        setViewportLoader(false);
    });
}

// PDF navigation button bindings
document.getElementById('btnPdfPrev')?.addEventListener('click', () => {
    if (pdfState.currentPage > 1) {
        pdfState.currentPage--;
        renderPdfPage(pdfState.currentPage);
    }
});

document.getElementById('btnPdfNext')?.addEventListener('click', () => {
    if (pdfState.currentPage < pdfState.totalPages) {
        pdfState.currentPage++;
        renderPdfPage(pdfState.currentPage);
    }
});

/* ==========================================
   6. Three.js WebGL 3D Mesh Viewer (STL & OBJ)
   ========================================== */

function initThreeJs() {
    if (typeof THREE === 'undefined') {
        showToast("WebGL 3D 라이브러리가 존재하지 않습니다. CDN 장애를 확인하십시오.", "error");
        return false;
    }
    
    const container = document.getElementById('threeJsContainer');
    container.innerHTML = '';
    
    const scene = new THREE.Scene();
    // Soft metallic navy blueprint shade for 3D space
    scene.background = new THREE.Color(viewerState.theme === 'dark' ? 0x090d16 : 0xf1f5f9);
    
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 2000);
    camera.position.set(200, 200, 300);
    
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    
    // Orbit camera controls
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2; // Don't go below floor
    
    // Complex lighting setup for premium model shading
    const ambientLight = new THREE.AmbientLight(viewerState.theme === 'dark' ? 0x222222 : 0x555555);
    scene.add(ambientLight);
    
    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.85);
    dirLight1.position.set(100, 250, 100);
    scene.add(dirLight1);
    
    const dirLight2 = new THREE.DirectionalLight(0x6366f1, 0.4); // Indigo highlight light
    dirLight2.position.set(-100, -250, -100);
    scene.add(dirLight2);
    
    // Ground blue-gray grid helper
    const gridHelper = new THREE.GridHelper(400, 40, 0x6366f1, viewerState.theme === 'dark' ? 0x1f2937 : 0xcbd5e1);
    gridHelper.position.y = -0.5;
    scene.add(gridHelper);
    
    threeState.scene = scene;
    threeState.camera = camera;
    threeState.renderer = renderer;
    threeState.controls = controls;
    threeState.activeMesh = null;
    threeState.isWireframe = false;
    
    // Handle viewport resize container
    const resizeObserver = new ResizeObserver(() => {
        if (threeState.renderer && threeState.camera) {
            threeState.camera.aspect = container.clientWidth / container.clientHeight;
            threeState.camera.updateProjectionMatrix();
            threeState.renderer.setSize(container.clientWidth, container.clientHeight);
        }
    });
    resizeObserver.observe(container);
    threeState.resizeObserver = resizeObserver;
    
    // Animation rendering loop
    function animate() {
        threeState.animationId = requestAnimationFrame(animate);
        if (threeState.controls) threeState.controls.update();
        if (threeState.renderer && threeState.scene && threeState.camera) {
            threeState.renderer.render(threeState.scene, threeState.camera);
        }
    }
    animate();
    
    return true;
}

function render3D(path, format) {
    mesh3dViewportContainer.style.display = 'block';
    setViewportLoader(true, `3D 메쉬 파일(${format.toUpperCase()})을 파싱하는 중...`);
    
    if (!threeState.scene) {
        if (!initThreeJs()) return;
    }
    
    if (format === 'stl') {
        const loader = new THREE.STLLoader();
        loader.load(getFileUrl(path), (geometry) => {
            const material = new THREE.MeshStandardMaterial({ 
                color: 0x6366f1, 
                roughness: 0.4,
                metalness: 0.7,
                side: THREE.DoubleSide
            });
            const mesh = new THREE.Mesh(geometry, material);
            
            // Adjust geometry bounds to center on grid
            geometry.computeBoundingBox();
            const box = geometry.boundingBox;
            const center = new THREE.Vector3();
            box.getCenter(center);
            mesh.position.sub(center);
            
            const size = new THREE.Vector3();
            box.getSize(size);
            mesh.position.y += size.y / 2; // sit on ground floor
            
            threeState.scene.add(mesh);
            threeState.activeMesh = mesh;
            
            // Refocus camera
            const maxDim = Math.max(size.x, size.y, size.z);
            threeState.camera.position.set(maxDim * 1.2, maxDim * 1.2, maxDim * 1.5);
            threeState.controls.target.set(0, size.y / 2, 0);
            threeState.controls.update();
            
            setViewportLoader(false);
        }, 
        (xhr) => {
            if (xhr.lengthComputable) {
                const pct = Math.round((xhr.loaded / xhr.total) * 100);
                setViewportLoader(true, `3D STL 파일 버퍼 적재 중: ${pct}%`);
            }
        },
        (err) => {
            console.error(err);
            showToast("STL 3D 모델 렌더링에 실패했습니다.", "error");
            setViewportLoader(false);
        });
    } 
    else if (format === 'obj') {
        const loader = new THREE.OBJLoader();
        loader.load(getFileUrl(path), (obj) => {
            const material = new THREE.MeshStandardMaterial({ 
                color: 0xa855f7, 
                roughness: 0.5,
                metalness: 0.5,
                side: THREE.DoubleSide
            });
            
            obj.traverse((child) => {
                if (child.isMesh) {
                    child.material = material;
                }
            });
            
            // Center OBJ model
            const box = new THREE.Box3().setFromObject(obj);
            const center = new THREE.Vector3();
            box.getCenter(center);
            obj.position.sub(center);
            
            const size = new THREE.Vector3();
            box.getSize(size);
            obj.position.y += size.y / 2;
            
            threeState.scene.add(obj);
            threeState.activeMesh = obj;
            
            const maxDim = Math.max(size.x, size.y, size.z);
            threeState.camera.position.set(maxDim * 1.2, maxDim * 1.2, maxDim * 1.5);
            threeState.controls.target.set(0, size.y / 2, 0);
            threeState.controls.update();
            
            setViewportLoader(false);
        },
        (xhr) => {
            if (xhr.lengthComputable) {
                const pct = Math.round((xhr.loaded / xhr.total) * 100);
                setViewportLoader(true, `3D OBJ 파일 버퍼 적재 중: ${pct}%`);
            }
        },
        (err) => {
            console.error(err);
            showToast("OBJ 3D 모델 렌더링에 실패했습니다.", "error");
            setViewportLoader(false);
        });
    }
}

// 3D HUD controls
document.getElementById('btn3dWireframe')?.addEventListener('click', () => {
    if (!threeState.activeMesh) return;
    
    threeState.isWireframe = !threeState.isWireframe;
    
    // Toggle wireframe on material(s)
    const toggle = (mesh) => {
        if (mesh.material) {
            mesh.material.wireframe = threeState.isWireframe;
        }
    };
    
    if (threeState.activeMesh.traverse) {
        threeState.activeMesh.traverse(child => {
            if (child.isMesh) toggle(child);
        });
    } else {
        toggle(threeState.activeMesh);
    }
    
    showToast(threeState.isWireframe ? '와이어프레임 모드로 전환' : '솔리드 셰이딩 모드로 전환', 'info');
});

document.getElementById('btn3dReset')?.addEventListener('click', () => {
    if (!threeState.activeMesh || !threeState.camera) return;
    
    const box = new THREE.Box3().setFromObject(threeState.activeMesh);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    
    threeState.camera.position.set(maxDim * 1.2, maxDim * 1.2, maxDim * 1.5);
    threeState.controls.target.set(0, size.y / 2, 0);
    threeState.controls.update();
});

/* ==========================================
   7. 2D Vector CAD DXF Viewer (HTML5 Canvas)
   ========================================== */

async function renderDXF(path) {
    dxfViewportContainer.style.display = 'block';
    setViewportLoader(true, "DXF CAD 설계 도면을 해석하는 중...");
    
    try {
        const response = await fetch(getFileUrl(path));
        if (!response.ok) throw new Error("도면을 불러오지 못했습니다.");
        const text = await response.text();
        
        // Custom simple DXF parser
        dxfState.entities = parseDxfText(text);
        
        // Calculate drawing boundaries
        calculateDxfBounds();
        
        // Scale and Fit drawing into Canvas viewport
        fitDxfToViewport();
        
        // Draw DXF on Canvas
        drawDxf();
        
        setViewportLoader(false);
    } catch (err) {
        console.error(err);
        showToast("DXF 파일 해석 및 벡터 렌더링에 실패했습니다.", "error");
        setViewportLoader(false);
    }
}

// Group-code based simple DXF parser
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
                if (subCode === 0) break; // Start of next entity
                
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

function calculateDxfBounds() {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    const checkPt = (x, y) => {
        if (isNaN(x) || isNaN(y)) return;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
    };
    
    dxfState.entities.forEach(ent => {
        if (ent.type === "LINE") {
            checkPt(ent.x, ent.y);
            checkPt(ent.x2, ent.y2);
        } else if (ent.type === "CIRCLE" || ent.type === "ARC") {
            checkPt(ent.x - ent.radius, ent.y - ent.radius);
            checkPt(ent.x + ent.radius, ent.y + ent.radius);
        } else if (ent.type === "LWPOLYLINE" && ent.vertices) {
            ent.vertices.forEach(v => checkPt(v.x, v.y));
        } else if (ent.x !== undefined && ent.y !== undefined) {
            checkPt(ent.x, ent.y);
        }
    });
    
    if (minX === Infinity) {
        // Fallback default bounds
        dxfState.bounds = { minX: -150, maxX: 150, minY: -150, maxY: 150 };
    } else {
        dxfState.bounds = { minX, maxX, minY, maxY };
    }
}

function fitDxfToViewport() {
    // Sync canvas resolution to layout size
    dxfCanvas.width = dxfCanvas.parentElement.clientWidth;
    dxfCanvas.height = dxfCanvas.parentElement.clientHeight;
    
    const pad = 40;
    const width = dxfCanvas.width - pad * 2;
    const height = dxfCanvas.height - pad * 2;
    
    const dx = dxfState.bounds.maxX - dxfState.bounds.minX;
    const dy = dxfState.bounds.maxY - dxfState.bounds.minY;
    
    if (dx > 0 && dy > 0) {
        const zoomX = width / dx;
        const zoomY = height / dy;
        dxfState.zoom = Math.min(zoomX, zoomY);
        
        const midCADX = (dxfState.bounds.minX + dxfState.bounds.maxX) / 2;
        const midCADY = (dxfState.bounds.minY + dxfState.bounds.maxY) / 2;
        
        const midScreenX = dxfCanvas.width / 2;
        const midScreenY = dxfCanvas.height / 2;
        
        dxfState.panX = midScreenX - midCADX * dxfState.zoom;
        dxfState.panY = midScreenY + midCADY * dxfState.zoom; // invert Y
    } else {
        dxfState.zoom = 1.0;
        dxfState.panX = dxfCanvas.width / 2;
        dxfState.panY = dxfCanvas.height / 2;
    }
}

// Convert CAD Cartesian (Y up) to Canvas screen (Y down)
function toScreen(cx, cy) {
    return {
        x: dxfState.panX + cx * dxfState.zoom,
        y: dxfState.panY - cy * dxfState.zoom
    };
}

// Convert Screen coordinates back to CAD
function toCAD(sx, sy) {
    return {
        x: (sx - dxfState.panX) / dxfState.zoom,
        y: (dxfState.panY - sy) / dxfState.zoom
    };
}

function drawDxf() {
    const ctx = dxfCanvas.getContext('2d');
    ctx.clearRect(0, 0, dxfCanvas.width, dxfCanvas.height);
    
    // Choose lines color matching the current theme (cyan/white on dark, blue/dark gray on light)
    const isDark = viewerState.theme === 'dark';
    const strokeColor = isDark ? '#3b82f6' : '#1e3a8a';
    const textColor = isDark ? '#e5e7eb' : '#1f2937';
    
    ctx.lineWidth = 1.0;
    
    dxfState.entities.forEach(ent => {
        ctx.strokeStyle = strokeColor;
        ctx.fillStyle = strokeColor;
        
        if (ent.type === "LINE") {
            const p1 = toScreen(ent.x, ent.y);
            const p2 = toScreen(ent.x2, ent.y2);
            
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        } 
        else if (ent.type === "CIRCLE") {
            const center = toScreen(ent.x, ent.y);
            const r = ent.radius * dxfState.zoom;
            
            ctx.beginPath();
            ctx.arc(center.x, center.y, r, 0, 2 * Math.PI);
            ctx.stroke();
        } 
        else if (ent.type === "ARC") {
            const center = toScreen(ent.x, ent.y);
            const r = ent.radius * dxfState.zoom;
            
            // DXF angles are CCW in degrees, starting from X axis.
            // Screen Canvas angles are CW. We must flip angles to match.
            const startRad = -ent.startAngle * Math.PI / 180;
            const endRad = -ent.endAngle * Math.PI / 180;
            
            ctx.beginPath();
            // Since we flip the Y axis, we flip angles and sweep direction (CCW true -> CW false)
            ctx.arc(center.x, center.y, r, startRad, endRad, true);
            ctx.stroke();
        } 
        else if (ent.type === "LWPOLYLINE" && ent.vertices && ent.vertices.length > 0) {
            ctx.beginPath();
            ent.vertices.forEach((v, idx) => {
                const pt = toScreen(v.x, v.y);
                if (idx === 0) ctx.moveTo(pt.x, pt.y);
                else ctx.lineTo(pt.x, pt.y);
            });
            ctx.stroke();
        } 
        else if ((ent.type === "TEXT" || ent.type === "MTEXT") && ent.text) {
            const pt = toScreen(ent.x, ent.y);
            const h = Math.max(8, ent.radius ? ent.radius * dxfState.zoom : 12);
            
            ctx.font = `${h}px 'Inter', sans-serif`;
            ctx.fillStyle = textColor;
            ctx.textBaseline = 'bottom';
            
            // Strip DXF text formatting codes like \A1; or \P
            let cleanText = ent.text.replace(/\\[A-Za-z0-9]+;/g, '').replace(/[\{\}]/g, '');
            ctx.fillText(cleanText, pt.x, pt.y);
        }
    });
}

// Canvas dragging (Pan)
dxfCanvas?.addEventListener('mousedown', (e) => {
    dxfState.isDragging = true;
    dxfState.startX = e.clientX - dxfState.panX;
    dxfState.startY = e.clientY - dxfState.panY;
});

window.addEventListener('mousemove', (e) => {
    if (dxfState.isDragging) {
        dxfState.panX = e.clientX - dxfState.startX;
        dxfState.panY = e.clientY - dxfState.startY;
        drawDxf();
    }
    
    // Live update coordinates HUD
    if (viewerState.activeFile && viewerState.activeFile.ext === 'dxf') {
        const rect = dxfCanvas ? dxfCanvas.getBoundingClientRect() : null;
        if (rect) {
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            if (mouseX >= 0 && mouseX <= dxfCanvas.width && mouseY >= 0 && mouseY <= dxfCanvas.height) {
                const cadPt = toCAD(mouseX, mouseY);
                const hudCoordsEl = document.getElementById('hudCoords');
                if (hudCoordsEl) hudCoordsEl.innerText = `X: ${cadPt.x.toFixed(2)}, Y: ${cadPt.y.toFixed(2)}`;
            }
        }
    }
});

window.addEventListener('mouseup', () => {
    dxfState.isDragging = false;
});

// Canvas Zooming
dxfCanvas?.addEventListener('wheel', (e) => {
    e.preventDefault();
    
    // Center of zoom: mouse pointer position
    const rect = dxfCanvas ? dxfCanvas.getBoundingClientRect() : null;
    if (!rect) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    
    const cadPt = toCAD(sx, sy);
    
    const zoomFactor = 1.15;
    if (e.deltaY < 0) {
        dxfState.zoom *= zoomFactor;
    } else {
        dxfState.zoom /= zoomFactor;
    }
    
    dxfState.zoom = Math.max(0.01, Math.min(200, dxfState.zoom));
    
    // Recalculate pan offset to keep mouse position locked in CAD space
    dxfState.panX = sx - cadPt.x * dxfState.zoom;
    dxfState.panY = sy + cadPt.y * dxfState.zoom; // note the inverted Y
    
    drawDxf();
}, { passive: false });

// DXF HUD controls
document.getElementById('btnCadZoomIn')?.addEventListener('click', () => {
    const midX = dxfCanvas.width / 2;
    const midY = dxfCanvas.height / 2;
    const cadPt = toCAD(midX, midY);
    dxfState.zoom *= 1.25;
    dxfState.panX = midX - cadPt.x * dxfState.zoom;
    dxfState.panY = midY + cadPt.y * dxfState.zoom;
    drawDxf();
});

document.getElementById('btnCadZoomOut')?.addEventListener('click', () => {
    const midX = dxfCanvas.width / 2;
    const midY = dxfCanvas.height / 2;
    const cadPt = toCAD(midX, midY);
    dxfState.zoom /= 1.25;
    dxfState.panX = midX - cadPt.x * dxfState.zoom;
    dxfState.panY = midY + cadPt.y * dxfState.zoom;
    drawDxf();
});

document.getElementById('btnCadFit')?.addEventListener('click', () => {
    fitDxfToViewport();
    drawDxf();
});

// Resize handler for Canvas size
window.addEventListener('resize', () => {
    if (viewerState.activeFile && viewerState.activeFile.ext === 'dxf') {
        fitDxfToViewport();
        drawDxf();
    }
});

/* ==========================================
   8. Proprietary Program Fallback & Export Guides
   ========================================== */

function renderProprietaryFallback(file) {
    proprietaryFallbackScreen.style.display = 'flex';
    
    // Auto-detect software type and extension
    const ext = file.ext;
    let formatTitle = '';
    let manualHtml = '';
    let iconName = 'cpu';
    
    switch (ext) {
        case 'max':
            formatTitle = 'Autodesk 3ds Max Scene (.max)';
            iconName = 'box';
            manualHtml = `
                <ol>
                    <li>3ds Max에서 파일을 엽니다.</li>
                    <li>상단 메뉴 <strong>File > Export > Export Selected...</strong>를 실행합니다.</li>
                    <li>포맷 형식을 <strong>Wavefront OBJ (.obj)</strong> 또는 <strong>STL (.stl)</strong>로 지정합니다.</li>
                    <li>웹 업로드 폴더에 원본과 동일한 이름으로 저장(예: <code>double_layered_dome_3dprint.stl</code>)하면, 뷰어에서 자동으로 연동 렌더링 아이콘이 생성됩니다.</li>
                </ol>
            `;
            break;
            
        case 'mb':
        case 'ma':
            formatTitle = `Autodesk Maya ${ext === 'mb' ? 'Binary' : 'ASCII'} Scene (.${ext})`;
            iconName = 'box';
            manualHtml = `
                <ol>
                    <li>Maya 프로그램에서 씬 파일을 오픈합니다.</li>
                    <li>내보낼 모델 선택 후 <strong>File > Export Selection...</strong>을 클릭합니다.</li>
                    <li>파일 형식을 <strong>OBJexport</strong>로 설정하여 내보냅니다.</li>
                    <li>자산 폴더 내에 저장하면 브라우저에서 3D 궤도 인터랙티브 뷰포트로 즉시 로드할 수 있습니다.</li>
                </ol>
            `;
            break;
            
        case 'catpart':
        case 'catproduct':
            formatTitle = `Dassault CATIA V5 ${ext === 'catpart' ? 'Part' : 'Product'} (.${ext})`;
            iconName = 'drafting-compass';
            manualHtml = `
                <ol>
                    <li>카티아 프로그램에서 설계 모델을 활성화합니다.</li>
                    <li>상단 파일 <strong>File > Save As...</strong> 메뉴를 엽니다.</li>
                    <li>2D 상세 도면인 경우 <strong>dxf (.dxf)</strong>, 3D 입체 파트 부품인 경우 <strong>stl (.stl)</strong>을 선택해 저장합니다.</li>
                    <li>변환본을 각각 <code>dwg/</code> 또는 <code>3d_print/</code> 하위 폴더에 저장해 주십시오.</li>
                </ol>
            `;
            break;
            
        case 'art':
            formatTitle = 'Delcam / Autodesk ArtCAM Project (.art)';
            iconName = 'activity';
            manualHtml = `
                <ol>
                    <li>ArtCAM 디자인 프로젝트를 엽니다.</li>
                    <li>부품 모델 릴리프 메뉴에서 <strong>Relief > Export > 3D ODF/STL...</strong>을 실행합니다.</li>
                    <li><strong>STL (Binary)</strong> 형식으로 내보내기를 완수합니다.</li>
                    <li>변환된 stl 파일을 <code>3d_print/</code> 폴더에 배치하여 조회하십시오.</li>
                </ol>
            `;
            break;
            
        case 'pz3':
            formatTitle = 'Smith Micro Poser Scene (.pz3)';
            iconName = 'user-check';
            manualHtml = `
                <ol>
                    <li>Poser 캐릭터 캐릭터/구동 씬을 엽니다.</li>
                    <li>상단 메뉴 <strong>File > Export > Wavefront OBJ...</strong>를 클릭합니다.</li>
                    <li>체결 데이터 및 메쉬 단위를 확인하고 OBJ로 보존합니다.</li>
                    <li>출력된 파일명을 원본과 같게 하여 <code>3d_print/</code> 폴더로 이동해 주십시오.</li>
                </ol>
            `;
            break;
            
        case 'psd':
            formatTitle = 'Adobe Photoshop Image Document (.psd)';
            iconName = 'image';
            manualHtml = `
                <ol>
                    <li>포토샵에서 드로잉/디자인 파일을 불러옵니다.</li>
                    <li><strong>File > Export > Export As...</strong> 또는 Save a Copy를 선택합니다.</li>
                    <li>포맷을 <strong>PNG</strong> 또는 <strong>JPG</strong>로 저장합니다.</li>
                    <li>익스포트한 이미지를 <code>jpg/</code> 폴더에 넣어 뷰어와 연동하십시오.</li>
                </ol>
            `;
            break;
            
        case 'dwg':
            formatTitle = 'Autodesk AutoCAD Drawing (.dwg)';
            iconName = 'drafting-compass';
            manualHtml = `
                <ol>
                    <li>AutoCAD에서 도면을 엽니다.</li>
                    <li>커맨드 창에 <strong>DXFOUT</strong> 명령어를 타이핑하여 입력합니다.</li>
                    <li>도면 버전을 <strong>AutoCAD 2018 DXF</strong> 이하로 지정하여 저장합니다.</li>
                    <li>내보낸 dxf 파일을 <code>dwg/</code> 폴더에 배치하면, 벡터 캔버스 뷰포트로 즉시 도면을 탐색할 수 있습니다.</li>
                </ol>
            `;
            break;
    }
    
    fallbackFormatName.innerText = formatTitle;
    fallbackSoftwareIcon.setAttribute('data-lucide', iconName);
    exportManualContent.innerHTML = manualHtml;
    lucide.createIcons();
    
    // Auto-linked viewable previews search
    searchAutolinks(file);
}

function searchAutolinks(file) {
    autolinkPreviewBox.style.display = 'none';
    autolinkActions.innerHTML = '';
    
    const baseName = file.name.substring(0, file.name.lastIndexOf('.'));
    
    // Look for matching files with same name but viewable extension (dxf, stl, obj, jpg, png)
    const matches = viewerState.files.filter(f => {
        const fBase = f.name.substring(0, f.name.lastIndexOf('.'));
        return fBase === baseName && ['dxf', 'stl', 'obj', 'jpg', 'png', 'pdf'].includes(f.ext) && f.path !== file.path;
    });
    
    if (matches.length > 0) {
        autolinkPreviewBox.style.display = 'block';
        
        matches.forEach(match => {
            const btn = document.createElement('button');
            btn.className = 'btn-glass';
            btn.style.borderColor = 'var(--accent-primary)';
            
            let btnLabel = '';
            let btnIcon = 'eye';
            
            if (['jpg', 'png'].includes(match.ext)) {
                btnLabel = `렌더링 이미지 보기 (.${match.ext})`;
                btnIcon = 'image';
            } else if (match.ext === 'dxf') {
                btnLabel = '2D CAD 도면 렌더링 (.dxf)';
                btnIcon = 'drafting-compass';
            } else if (['stl', 'obj'].includes(match.ext)) {
                btnLabel = `3D 모델 렌더링 (.${match.ext})`;
                btnIcon = 'box';
            } else if (match.ext === 'pdf') {
                btnLabel = 'PDF 도면 보기 (.pdf)';
                btnIcon = 'file-text';
            }
            
            btn.innerHTML = `<i data-lucide="${btnIcon}"></i><span>${btnLabel}</span>`;
            
            btn.addEventListener('click', () => {
                // Find matching tree file item to set active
                const items = document.querySelectorAll('.tree-file-item');
                if (items) {
                    items.forEach(el => {
                        if (el.dataset.path === match.path) {
                            el.classList.add('active');
                        } else {
                            el.classList.remove('active');
                        }
                    });
                }
                selectFile(match);
            });
            
            autolinkActions.appendChild(btn);
        });
        
        lucide.createIcons();
    }
}

/* ==========================================
   9. Application Initialization
   ========================================== */

document.addEventListener('DOMContentLoaded', () => {
    bindSoundWidgetListeners();
    const cForm = document.getElementById('commentForm');
    if (cForm) {
        cForm.addEventListener('submit', (e) => {
            e.preventDefault();
            submitComment();
        });
    }
    fetchProjectFiles();
});
