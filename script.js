let allData = [];
let currentFilter = null;

async function loadData() {
  const res = await fetch('./data.json');
  allData = await res.json();
  renderFilterBar();
  renderCards(allData);
}

function renderFilterBar() {
  const brands = [...new Set(allData.map(p => p.brand))];
  const bar = document.getElementById('filter-bar');
  bar.innerHTML = '';

  const allBtn = document.createElement('button');
  allBtn.className = 'filter-btn' + (currentFilter === null ? ' active' : '');
  allBtn.textContent = '所有品牌';
  allBtn.onclick = () => setFilter(null);
  bar.appendChild(allBtn);

  brands.forEach(brand => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn' + (currentFilter === brand ? ' active' : '');
    btn.textContent = brand;
    btn.onclick = () => setFilter(brand);
    bar.appendChild(btn);
  });
}

function setFilter(brand) {
  currentFilter = brand;
  renderFilterBar();
  const filtered = brand ? allData.filter(p => p.brand === brand) : allData;
  renderCards(filtered);
}

function renderCards(posts) {
  const grid = document.getElementById('card-grid');
  const empty = document.getElementById('empty-state');

  if (!posts.length) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';
  grid.innerHTML = posts.map(post => cardHTML(post)).join('');
}

function cardHTML(post) {
  const date = new Date(post.timestamp).toLocaleDateString('zh-TW', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
  const summary = (post.postText || '').replace(/\n/g, ' ').slice(0, 40);
  const isFiltered = currentFilter === post.brand;
  const filterBtnText = isFiltered ? '看所有品牌' : `只看 ${post.brand}`;
  const filterBtnAction = isFiltered
    ? `onclick="setFilter(null)"`
    : `onclick="setFilter('${post.brand.replace(/'/g, "\\'")}')"`;

  const imageSection = post.imageUrl
    ? `<img class="card-image" src="${post.imageUrl}" alt="${post.brand}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
      + `<div class="card-image-placeholder" style="display:none">🧋</div>`
    : `<div class="card-image-placeholder">🧋</div>`;

  return `
    <div class="card">
      <div class="card-header">
        <span class="brand-name">${post.brand}</span>
        <button class="filter-only-btn" ${filterBtnAction}>${filterBtnText}</button>
      </div>
      ${imageSection}
      <div class="card-footer">
        <div class="card-meta">
          <span class="brand-tag">${post.brand}</span>
          <span>${date}</span>
        </div>
        <p class="card-text">${summary}${post.postText && post.postText.length > 40 ? '…' : ''}</p>
        <a class="card-link" href="${post.postUrl}" target="_blank" rel="noopener">→ 前往原文</a>
      </div>
    </div>
  `;
}

loadData();
