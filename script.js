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
const modalClose = document.getElementById('modalClose');
const closeReaderBtn = document.getElementById('closeReaderBtn');
const prevPageBtn = document.getElementById('prevPageBtn');
const nextPageBtn = document.getElementById('nextPageBtn');
const themeToggle = document.getElementById('themeToggle');
const apiSelect = document.getElementById('apiSelect');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    setupEventListeners();
    loadManga();
});

// Theme Management
function initTheme() {
    if (currentTheme === 'dark') {
        document.body.classList.add('dark-theme');
    }
}

function toggleTheme() {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', currentTheme);
    if (currentTheme === 'dark') {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }
}

// Event Listeners
function setupEventListeners() {
    // Navigation
    navItems.forEach(item => {
        item.addEventListener('click', handleNavClick);
    });

    // Theme Toggle
    themeToggle.addEventListener('click', toggleTheme);

    // Search
    searchBtn.addEventListener('click', () => {
        searchBar.classList.toggle('active');
        if (searchBar.classList.contains('active')) {
            searchInput.focus();
        }
    });

    closeSearchBtn.addEventListener('click', () => {
        searchBar.classList.remove('active');
        searchInput.value = '';
    });

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchManga(searchInput.value);
        }
    });

    // Settings
    settingsBtn.addEventListener('click', () => {
        settingsPanel.classList.add('active');
    });

    closeSettingsBtn.addEventListener('click', () => {
        settingsPanel.classList.remove('active');
    });

    // Modal
    modalClose.addEventListener('click', closeModal);
    mangaModal.addEventListener('click', (e) => {
        if (e.target === mangaModal) closeModal();
    });

    // Reader
    closeReaderBtn.addEventListener('click', closeReader);
    readerModal.addEventListener('click', (e) => {
        if (e.target === readerModal) closeReader();
    });
    prevPageBtn.addEventListener('click', previousPage);
    nextPageBtn.addEventListener('click', nextPage);
    volumeSelect.addEventListener('change', changeVolume);

    // FAB
    fab.addEventListener('click', loadRandomManga);

    // Close settings when clicking outside
    document.addEventListener('click', (e) => {
        if (!settingsPanel.contains(e.target) && e.target !== settingsBtn) {
            settingsPanel.classList.remove('active');
        }
    });
}

function handleNavClick(e) {
    const category = e.currentTarget.getAttribute('data-category');
    
    navItems.forEach(item => item.classList.remove('active'));
    e.currentTarget.classList.add('active');
    
    currentCategory = category;
    currentPage = 1;
    loadManga();
}

// API Functions
async function loadManga() {
    showLoading();
    try {
        let manga = [];
        manga = await fetchFromJikan();
        
        allManga = manga;
        renderManga(manga);
        hideLoading();
    } catch (error) {
        console.error('Error loading manga:', error);
        showError('Failed to load manga. Please check your connection and try again.');
    }
}

async function fetchFromJikan() {
    const endpoints = {
        trending: '/top/manga?type=manga&filter=bypopularity',
        airing: '/top/manga?type=manga&filter=airing',
        bypopularity: '/top/manga?type=manga&filter=bypopularity',
        upcoming: '/top/manga?type=manga&filter=upcoming'
    };

    const endpoint = endpoints[currentCategory] || endpoints.trending;
    const url = `${CONFIG.API_SOURCES.jikan.base}${endpoint}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error('API request failed');
    
    const data = await response.json();
    return formatJikanData(data.data);
}

// Data Formatting
function formatJikanData(items) {
    if (!items) return [];
    
    return items.slice(0, CONFIG.PAGE_SIZE).map(item => {
        const authors = item.authors?.map(a => a.name).join(', ') || 'Unknown';
        const genres = item.genres?.map(g => g.name).join(', ') || 'Various';
        
        return {
            id: item.mal_id,
            title: item.title || 'Unknown',
            image: item.images?.jpg?.image_url || 'https://via.placeholder.com/300x450?text=No+Image',
            rating: item.score || 0,
            synopsis: item.synopsis || 'No description available',
            chapters: item.chapters || 'Unknown',
            authors: authors,
            genres: genres,
            status: item.status || 'Unknown'
        };
    });
}

async function searchManga(query) {
    if (!query.trim()) return;
    
    showLoading();
    try {
        const url = `${CONFIG.API_SOURCES.jikan.base}/manga?query=${encodeURIComponent(query)}&type=manga`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Search failed');
        
        const data = await response.json();
        const manga = formatJikanData(data.data);
        renderManga(manga);
        hideLoading();
    } catch (error) {
        console.error('Search error:', error);
        showError('Search failed. Please try again.');
    }
}

async function loadRandomManga() {
    if (allManga.length === 0) return;
    const random = allManga[Math.floor(Math.random() * allManga.length)];
    showMangaDetail(random);
}

// Rendering
function renderManga(manga) {
    contentContainer.innerHTML = '';
    
    if (manga.length === 0) {
        contentContainer.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px 20px; color: var(--text-secondary);">
                <span class="material-icons" style="font-size: 64px; opacity: 0.5;">search</span>
                <p>No manga found</p>
            </div>
        `;
        return;
    }

    manga.forEach(item => {
        const card = createMangaCard(item);
        contentContainer.appendChild(card);
    });
}

function createMangaCard(manga) {
    const card = document.createElement('div');
    card.className = 'manga-card';
    card.innerHTML = `
        <div class="manga-poster">
            <img src="${manga.image}" alt="${manga.title}" onerror="this.src='https://via.placeholder.com/300x450?text=No+Image'">
            <div class="manga-overlay">
                <div class="manga-title">${manga.title}</div>
                <div class="manga-rating">
                    <span class="material-icons">star</span>
                    <span>${manga.rating.toFixed(1)}</span>
                </div>
            </div>
        </div>
    `;
    
    card.addEventListener('click', () => showMangaDetail(manga));
    return card;
}

function showMangaDetail(manga) {
    currentMangaReading = manga;
    modalBody.innerHTML = `
        <img src="${manga.image}" alt="${manga.title}" class="manga-detail-poster" onerror="this.src='https://via.placeholder.com/300x450?text=No+Image'">
        <h2 class="manga-detail-title">${manga.title}</h2>
        <div class="manga-detail-info">
            <div class="manga-detail-info-item">
                <span class="manga-detail-info-label">Rating</span>
                <span>${manga.rating.toFixed(1)}/10</span>
            </div>
            <div class="manga-detail-info-item">
                <span class="manga-detail-info-label">Status</span>
                <span>${manga.status}</span>
            </div>
        </div>
        <div class="manga-detail-info">
            <div class="manga-detail-info-item" style="flex: 1;">
                <span class="manga-detail-info-label">Genres</span>
                <span>${manga.genres}</span>
            </div>
        </div>
        <div class="manga-detail-info">
            <div class="manga-detail-info-item" style="flex: 1;">
                <span class="manga-detail-info-label">Authors</span>
                <span>${manga.authors}</span>
            </div>
        </div>
        <div class="manga-detail-description">${manga.synopsis}</div>
        <button class="btn-primary" onclick="startReading()">Read Now</button>
    `;
    
    mangaModal.classList.add('active');
}

function startReading() {
    closeModal();
    // Initialize reader
    currentVolume = 1;
    currentPageNum = 1;
    totalPages = 50 + Math.floor(Math.random() * 100); // Random pages
    
    readerTitle.textContent = currentMangaReading.title;
    
    // Populate volumes
    volumeSelect.innerHTML = '<option value="">Select Volume</option>';
    const numVolumes = Math.max(1, Math.floor(Number(currentMangaReading.chapters) / 10) || 5);
    for (let i = 1; i <= numVolumes; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `Volume ${i}`;
        volumeSelect.appendChild(option);
    }
    volumeSelect.value = 1;
    
    displayPage();
    readerModal.classList.add('active');
}

function displayPage() {
    // Generate page content (mock pages with chapter content)
    const chapters = currentMangaReading.synopsis;
    readerContent.innerHTML = `
        <div class="manga-page">
            <div class="page-content">
                <div class="page-header">
                    <h3>Volume ${currentVolume}</h3>
                    <p class="chapter-title">Chapter ${(currentVolume - 1) * 10 + Math.ceil(currentPageNum / 5)}</p>
                </div>
                <div class="page-body">
                    <div class="manga-panels">
                        <div class="panel panel-1"></div>
                        <div class="panel panel-2"></div>
                        <div class="panel panel-3"></div>
                        <div class="panel panel-4"></div>
                    </div>
                    <div class="page-text">
                        ${chapters.substring(0, 300)}...
                    </div>
                </div>
            </div>
        </div>
    `;
    
    pageCounter.textContent = `Page ${currentPageNum} / ${totalPages}`;
    prevPageBtn.disabled = currentPageNum === 1;
    nextPageBtn.disabled = currentPageNum === totalPages;
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
        totalPages = 50 + Math.floor(Math.random() * 100);
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
    loading.style.display = 'none';
}