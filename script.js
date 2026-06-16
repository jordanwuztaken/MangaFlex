// Configuration
const CONFIG = {
    API_SOURCES: {
        jikan: {
            base: 'https://api.jikan.moe/v4',
        }
    },
    CURRENT_API: 'jikan',
    PAGE_SIZE: 20,
};

// State
let currentCategory = 'trending';
let currentPage = 1;
let allManga = [];
let currentTheme = localStorage.getItem('theme') || 'light';
let currentMangaReading = null;
let currentVolume = 1;
let currentPageNum = 1;
let totalPages = 100;

// DOM Elements
const contentContainer = document.getElementById('contentContainer');
const loading = document.getElementById('loading');
const errorState = document.getElementById('errorState');
const mangaModal = document.getElementById('mangaModal');
const modalBody = document.getElementById('modalBody');
const readerModal = document.getElementById('readerModal');
const readerContent = document.getElementById('readerContent');
const readerTitle = document.getElementById('readerTitle');
const volumeSelect = document.getElementById('volumeSelect');
const pageCounter = document.getElementById('pageCounter');
const settingsPanel = document.getElementById('settingsPanel');
const fab = document.getElementById('fab');
const navItems = document.querySelectorAll('.nav-item');
const searchBtn = document.getElementById('searchBtn');
const searchBar = document.getElementById('searchBar');
const searchInput = document.getElementById('searchInput');
const closeSearchBtn = document.getElementById('closeSearchBtn');
const settingsBtn = document.getElementById('settingsBtn');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const prevPageBtn = document.getElementById('prevPageBtn');
const nextPageBtn = document.getElementById('nextPageBtn');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    setupEventListeners();
    fetchMangaData();
});

// Event Listeners
function setupEventListeners() {
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const clickedItem = e.currentTarget;
            navItems.forEach(nav => nav.classList.remove('active'));
            clickedItem.classList.add('active');
            currentCategory = clickedItem.dataset.category;
            currentPage = 1;
            fetchMangaData();
        });
    });

    searchBtn.addEventListener('click', () => searchBar.classList.add('active'));
    closeSearchBtn.addEventListener('click', () => {
        searchBar.classList.remove('active');
        searchInput.value = '';
        fetchMangaData();
    });
    
    let searchTimeout;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentPage = 1;
            fetchMangaData(searchInput.value);
        }, 500);
    });

    settingsBtn.addEventListener('click', () => settingsPanel.classList.add('active'));
    closeSettingsBtn.addEventListener('click', () => settingsPanel.classList.remove('active'));
    
    prevPageBtn.addEventListener('click', previousPage);
    nextPageBtn.addEventListener('click', nextPage);
    volumeSelect.addEventListener('change', changeVolume);
    
    fab.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// Theme Handling
function initTheme() {
    if (currentTheme === 'dark') {
        document.body.classList.add('dark-theme');
    }
}

// Data Fetching (Jikan API)
async function fetchMangaData(query = '') {
    showLoading();
    try {
        let url = `${CONFIG.API_SOURCES.jikan.base}/top/manga?type=manga&page=${currentPage}&limit=${CONFIG.PAGE_SIZE}`;
        if (query) {
            url = `${CONFIG.API_SOURCES.jikan.base}/manga?q=${encodeURIComponent(query)}&page=${currentPage}&limit=${CONFIG.PAGE_SIZE}`;
        } else if (currentCategory === 'popular') {
            url = `${CONFIG.API_SOURCES.jikan.base}/top/manga?filter=bypopularity&page=${currentPage}&limit=${CONFIG.PAGE_SIZE}`;
        } else if (currentCategory === 'favorites') {
            url = `${CONFIG.API_SOURCES.jikan.base}/top/manga?filter=favorite&page=${currentPage}&limit=${CONFIG.PAGE_SIZE}`;
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        allManga = data.data || [];
        renderMangaList();
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

function renderMangaList() {
    contentContainer.innerHTML = '';
    if (allManga.length === 0) {
        contentContainer.innerHTML = '<div class="error-state"><p>No manga found.</p></div>';
        return;
    }

    allManga.forEach(manga => {
        const card = document.createElement('div');
        card.className = 'manga-card';
        card.addEventListener('click', () => openMangaDetail(manga));

        const posterUrl = manga.images?.jpg?.large_image_url || manga.images?.jpg?.image_url || '';
        const score = manga.score ? manga.score.toFixed(1) : 'N/A';

        card.innerHTML = `
            <div class="manga-poster">
                ${posterUrl ? `<img src="${posterUrl}" alt="${manga.title}" loading="lazy">` : ''}
                <div class="manga-overlay">
                    <h3 class="manga-title">${manga.title}</h3>
                    <div class="manga-rating">
                        <span class="material-icons">star</span>
                        <span>${score}</span>
                    </div>
                </div>
            </div>
        `;
        contentContainer.appendChild(card);
    });
}

function openMangaDetail(manga) {
    modalBody.innerHTML = `
        <button class="modal-close" onclick="closeModal()">
            <span class="material-icons">close</span>
        </button>
        <div class="modal-body">
            <img class="manga-detail-poster" src="${manga.images?.jpg?.large_image_url || manga.images?.jpg?.image_url}" alt="${manga.title}">
            <h2 class="manga-detail-title">${manga.title}</h2>
            <div class="manga-detail-info">
                <div class="manga-detail-info-item">
                    <span class="manga-detail-info-label">Score</span>
                    <span>${manga.score ? manga.score.toFixed(1) : 'N/A'}</span>
                </div>
                <div class="manga-detail-info-item">
                    <span class="manga-detail-info-label">Chapters</span>
                    <span>${manga.chapters || 'Ongoing'}</span>
                </div>
                <div class="manga-detail-info-item">
                    <span class="manga-detail-info-label">Volumes</span>
                    <span>${manga.volumes || 'N/A'}</span>
                </div>
            </div>
            <p class="manga-detail-description">${manga.synopsis || 'No description available.'}</p>
            <button class="btn-primary" onclick="startReading('${manga.mal_id}')">Read Now</button>
        </div>
    `;
    mangaModal.classList.add('active');
}

function startReading(malId) {
    const manga = allManga.find(m => m.mal_id == malId);
    if (!manga) return;

    currentMangaReading = manga;
    readerTitle.textContent = manga.title;
    
    volumeSelect.innerHTML = '<option value="">Select Volume</option>';
    const totalVols = manga.volumes || 5;
    for (let i = 1; i <= totalVols; i++) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = `Volume ${i}`;
        volumeSelect.appendChild(opt);
    }
    
    currentVolume = 1;
    currentPageNum = 1;
    totalPages = 25;
    volumeSelect.value = "1";
    
    mangaModal.classList.remove('active');
    readerModal.classList.add('active');
    displayPage();
}

function displayPage() {
    const chapters = currentMangaReading.synopsis || "No content summary available.";
    
    readerContent.innerHTML = `
        <div class="manga-page">
            <div class="page-content">
                <div class="page-header">
                    <h3>Volume ${currentVolume}</h3>
                    <p class="chapter-title">Chapter ${(currentVolume - 1) * 10 + Math.ceil(currentPageNum / 5)}</p>
                </div>
                <div class="page-body">
                    <div class="manga-panels">
                        <div class="panel panel-1" id="p1"></div>
                        <div class="panel panel-2" id="p2"></div>
                        <div class="panel panel-3" id="p3"></div>
                        <div class="panel panel-4" id="p4"></div>
                    </div>
                    <div class="page-text">
                        ${chapters.substring(0, 300)}${chapters.length > 300 ? '...' : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    pageCounter.textContent = `Page ${currentPageNum} / ${totalPages}`;
    prevPageBtn.disabled = currentPageNum === 1;
    nextPageBtn.disabled = currentPageNum === totalPages;

    // Generates completely safe image content using random illustration matrices
    for (let i = 1; i <= 4; i++) {
        const panelEl = document.getElementById(`p${i}`);
        if (panelEl) {
            const seedId = `${currentMangaReading.mal_id || 1}-${currentPageNum}-${i}`;
            panelEl.style.backgroundImage = `url('https://picsum.photos/seed/${seedId}/400/300')`;
            panelEl.style.backgroundSize = 'cover';
            panelEl.style.backgroundPosition = 'center';
            panelEl.style.backgroundRepeat = 'no-repeat';
        }
    }
}

function nextPage() {
    if (currentPageNum < totalPages) {
        currentPageNum++;
        displayPage();
    }
}

function previousPage() {
    if (currentPageNum > 1) {
        currentPageNum--;
        displayPage();
    }
}

function changeVolume() {
    const vol = volumeSelect.value;
    if (vol) {
        currentVolume = parseInt(vol);
        currentPageNum = 1;
        totalPages = 25;
        displayPage();
    }
}

function closeReader() {
    readerModal.classList.remove('active');
}

function closeModal() {
    mangaModal.classList.remove('active');
}

// Loading/Error States
function showLoading() {
    loading.style.display = 'flex';
    errorState.style.display = 'none';
    contentContainer.style.display = 'none';
}

function hideLoading() {
    loading.style.display = 'none';
    contentContainer.style.display = 'grid';
}

function showError(message) {
    document.getElementById('errorMessage').textContent = message;
    errorState.style.display = 'flex';
    contentContainer.style.display = 'none';
}
