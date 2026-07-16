// ===== js/script.js =====
let links = [];
let filteredLinks = [];

// --- Theme ---
function initTheme() {
    const stored = localStorage.getItem('linkhub-theme');
    if (stored === 'dark') {
        document.body.classList.add('dark-theme');
        document.getElementById('themeToggle').innerHTML = '<i class="bi bi-sun-fill"></i>';
    } else {
        document.body.classList.remove('dark-theme');
        document.getElementById('themeToggle').innerHTML = '<i class="bi bi-moon-fill"></i>';
    }
}
function toggleTheme() {
    const body = document.body;
    const btn = document.getElementById('themeToggle');
    if (body.classList.contains('dark-theme')) {
        body.classList.remove('dark-theme');
        localStorage.setItem('linkhub-theme', 'light');
        btn.innerHTML = '<i class="bi bi-moon-fill"></i>';
    } else {
        body.classList.add('dark-theme');
        localStorage.setItem('linkhub-theme', 'dark');
        btn.innerHTML = '<i class="bi bi-sun-fill"></i>';
    }
}

// --- Recent ---
const MAX_RECENT = 5;
function getRecentLinks() {
    try {
        const data = JSON.parse(localStorage.getItem('linkhub-recent')) || [];
        return data;
    } catch { return []; }
}
function saveRecentLinks(recent) {
    localStorage.setItem('linkhub-recent', JSON.stringify(recent.slice(0, MAX_RECENT)));
}
function addRecentLink(linkId) {
    const recent = getRecentLinks();
    const filtered = recent.filter(id => id !== linkId);
    filtered.unshift(linkId);
    saveRecentLinks(filtered);
}
function renderRecentChips() {
    const section = document.getElementById('recentSection');
    const container = document.getElementById('recentChips');
    if (!section || !container) return;
    const recentIds = getRecentLinks();
    if (!recentIds.length) {
        section.style.display = 'none';
        return;
    }
    const recentLinks = recentIds.map(id => links.find(l => l.id == id)).filter(Boolean);
    if (!recentLinks.length) {
        section.style.display = 'none';
        return;
    }
    section.style.display = 'block';
    container.innerHTML = '';
    recentLinks.forEach(link => {
        const chip = document.createElement('span');
        chip.className = 'recent-chip';
        chip.textContent = link.title;
        chip.addEventListener('click', () => {
            window.open(link.url, '_blank');
            addRecentLink(link.id);
        });
        container.appendChild(chip);
    });
}

// --- 🔥 JSONBin.io से डेटा लाना (सिर्फ Read) ---
async function fetchLinks() {
    const BIN_ID = '6a585431f5f4af5e2995b375';
    const MASTER_KEY = '$2a$10$dUodIZFxFRfZ6ueDYy4WbO1NqzY92xjupOLcIWLkpbTJu.EYPadcO';
    const URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

    try {
        const response = await fetch(URL, {
            headers: {
                'X-Access-Key': MASTER_KEY
            }
        });
        if (!response.ok) throw new Error('Failed to fetch from JSONBin.io');
        const data = await response.json();

        // JSONBin.io का डेटा 'record' के अंदर होता है
        let fetchedLinks = data.record;

        // अगर record सीधे array नहीं है, तो 'links' प्रॉपर्टी ढूंढें
        if (!Array.isArray(fetchedLinks)) {
            if (fetchedLinks.links && Array.isArray(fetchedLinks.links)) {
                fetchedLinks = fetchedLinks.links;
            } else {
                fetchedLinks = [];
            }
        }

        // हर लिंक को सामान्य फॉर्मेट में बदलें
        links = fetchedLinks.map(link => ({
            ...link,
            favorite: link.favorite || false,
            tags: link.tags || [],
            description: link.description || '',
            image: link.image || ''
        }));

        return links;
    } catch (err) {
        console.error('Failed to fetch links from JSONBin.io:', err);
        links = [];
        return links;
    }
}

// --- UI helpers ---
function createLinkCard(link) {
    const col = document.createElement('div');
    col.className = 'col-md-6 col-lg-4 col-xl-3';
    const catClass = `category-${link.category}`;
    const favBadge = link.favorite ? '<span class="badge bg-warning text-dark ms-1"><i class="bi bi-star-fill"></i></span>' : '';
    const tagsHtml = (link.tags || []).map(t => `<span class="badge bg-light text-dark me-1 mb-1">${t}</span>`).join('');
    const imageUrl = link.image || 'https://via.placeholder.com/40?text=Link';

    col.innerHTML = `
        <div class="card link-card">
            <div class="card-header d-flex justify-content-between align-items-center">
                <div><span class="category-badge ${catClass}">${link.category}</span> ${favBadge}</div>
                <!-- removed date -->
            </div>
            <div class="card-body">
                <div class="d-flex align-items-center mb-2">
                    <div class="link-thumbnail me-2" style="background-image: url('${imageUrl}');"></div>
                    <h5 class="card-title mb-0">${link.title}</h5>
                </div>
                <p class="card-text small text-secondary">${link.description || '—'}</p>
                <a href="${link.url}" target="_blank" class="link-url" rel="noopener">${truncate(link.url, 45)}</a>
                <div class="mt-3 small">${tagsHtml}</div>
            </div>
            <div class="card-footer bg-transparent d-flex justify-content-between align-items-center">
                <small class="text-muted"><i class="bi bi-tag"></i> ${link.category}</small>
                <a href="${link.url}" target="_blank" class="btn btn-sm btn-outline-primary rounded-pill px-3" rel="noopener">Visit <i class="bi bi-box-arrow-up-right ms-1"></i></a>
            </div>
        </div>
    `;
    return col;
}
function truncate(str, n) { return str.length > n ? str.slice(0, n-2)+'…' : str; }

// --- index stats ---
function updateStatsUI() {
    if (!document.getElementById('statTotal')) return;
    document.getElementById('statTotal').innerText = links.length;
    const categories = [...new Set(links.map(l => l.category))];
    document.getElementById('statCategories').innerText = categories.length;
    document.getElementById('statImportant').innerText = links.filter(l => l.favorite).length;
    // Latest: just take first from array (no date)
    const latestTitle = links.length ? links[0].title : '—';
    document.getElementById('statLatest').innerText = latestTitle.substring(0,10) + (latestTitle.length>10?'…':'');
}

// --- Important links on homepage ---
function renderImportantLinks() {
    const container = document.getElementById('importantContainer');
    if (!container) return;
    const important = links.filter(l => l.favorite);
    if (!important.length) {
        container.innerHTML = `<div class="col-12 text-center py-4 text-muted">No important links yet. Star some from the All links page.</div>`;
        return;
    }
    container.innerHTML = '';
    // show up to 3
    const display = important.slice(0, 3);
    display.forEach(link => container.appendChild(createLinkCard(link)));
}

// --- Category chips on homepage ---
function renderCategoryChips() {
    const container = document.getElementById('categoryChips');
    if (!container) return;
    const catMap = {};
    links.forEach(l => { catMap[l.category] = (catMap[l.category] || 0) + 1; });
    const sorted = Object.entries(catMap).sort((a,b) => b[1] - a[1]);
    container.innerHTML = '';
    sorted.forEach(([cat, count]) => {
        const chip = document.createElement('span');
        chip.className = 'category-chip';
        chip.innerHTML = `${cat} <span class="badge bg-primary rounded-pill ms-1">${count}</span>`;
        chip.style.cursor = 'pointer';
        chip.addEventListener('click', () => {
            // redirect to link.html with category filter
            window.location.href = `link.html?category=${encodeURIComponent(cat)}`;
        });
        container.appendChild(chip);
    });
}

// --- Populate Categories Modal ---
function populateCategoryModal() {
    const body = document.getElementById('categoriesModalBody');
    if (!body) return;
    const catMap = {};
    links.forEach(l => { catMap[l.category] = (catMap[l.category] || 0) + 1; });
    const sorted = Object.entries(catMap).sort((a,b) => b[1] - a[1]);
    body.innerHTML = sorted.length ? sorted.map(([cat, count]) =>
        `<div class="d-flex justify-content-between align-items-center border-bottom py-2">
            <span><i class="bi bi-tag me-2"></i>${cat}</span>
            <span class="badge bg-secondary rounded-pill">${count} links</span>
        </div>`
    ).join('') : '<div class="text-muted text-center">No categories found.</div>';
}

// --- Populate Important Modal ---
function populateImportantModal() {
    const body = document.getElementById('importantModalBody');
    if (!body) return;
    const important = links.filter(l => l.favorite);
    if (!important.length) {
        body.innerHTML = '<div class="text-muted text-center">No important links yet.</div>';
        return;
    }
    body.innerHTML = important.map(link =>
        `<div class="d-flex justify-content-between align-items-center border-bottom py-2">
            <div>
                <strong>${link.title}</strong>
                <div class="small text-muted">${truncate(link.url, 50)}</div>
            </div>
            <a href="${link.url}" target="_blank" class="btn btn-sm btn-outline-primary">Visit</a>
        </div>`
    ).join('');
}

// --- link.html ---
function renderAllLinks(filtered = links) {
    const container = document.getElementById('allLinksContainer');
    if (!container) return;
    if (!filtered.length) {
        container.innerHTML = `<div class="col-12 empty-state"><i class="bi bi-link-45deg"></i><h5>No links match</h5><p class="text-muted">try a different filter</p></div>`;
        return;
    }
    container.innerHTML = '';
    filtered.forEach(link => container.appendChild(createLinkCard(link)));
}
function filterAllLinks() {
    const searchTerm = document.getElementById('searchLinks')?.value.toLowerCase() || '';
    const category = document.getElementById('categoryFilter')?.value || 'all';
    const favOnly = document.getElementById('favFilterBtn')?.classList.contains('active') || false;

    filteredLinks = links.filter(link => {
        if (category !== 'all' && link.category !== category) return false;
        if (favOnly && !link.favorite) return false;
        if (searchTerm) {
            return link.title.toLowerCase().includes(searchTerm) ||
                   link.url.toLowerCase().includes(searchTerm) ||
                   (link.description && link.description.toLowerCase().includes(searchTerm)) ||
                   (link.tags && link.tags.some(t => t.toLowerCase().includes(searchTerm)));
        }
        return true;
    });
    renderAllLinks(filteredLinks);
}

// --- init ---
document.addEventListener('DOMContentLoaded', function() {
    initTheme();
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

    // URL param handling for link.html category filter
    const params = new URLSearchParams(window.location.search);
    const catParam = params.get('category');
    if (catParam && document.getElementById('categoryFilter')) {
        // wait for links to load
        const check = setInterval(() => {
            if (links.length) {
                clearInterval(check);
                const select = document.getElementById('categoryFilter');
                if (select) {
                    select.value = catParam;
                    filterAllLinks();
                }
            }
        }, 100);
    }
});

// Expose
window.fetchLinks = fetchLinks;
window.updateStatsUI = updateStatsUI;
window.renderImportantLinks = renderImportantLinks;
window.renderCategoryChips = renderCategoryChips;
window.renderRecentChips = renderRecentChips;
window.populateCategoryModal = populateCategoryModal;
window.populateImportantModal = populateImportantModal;
window.renderAllLinks = renderAllLinks;
window.filterAllLinks = filterAllLinks;
window.addRecentLink = addRecentLink;