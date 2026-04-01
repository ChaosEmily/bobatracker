let allData = [];
let currentTag = null;
let currentBrand = null;

async function loadData() {
  const res = await fetch('./data.json');
  allData = await res.json();
  renderTagBar();
  renderBrandBar();
  renderCards(allData);
}

function renderTagBar() {
  const tags = [...new Set(allData.map(p => p.tag).filter(Boolean))];
  const bar = document.getElementById('tag-bar');
  bar.innerHTML = '';

  const allBtn = document.createElement('button');
  allBtn.className = 'tag-btn' + (currentTag === null ? ' active' : '');
  allBtn.textContent = '全部分類';
  allBtn.onclick = () => setTag(null);
  bar.appendChild(allBtn);

  tags.forEach(tag => {
    const btn = document.createElement('button');
    btn.className = 'tag-btn' + (currentTag === tag ? ' active' : '');
    btn.textContent = tag;
    btn.onclick = () => setTag(tag);
    bar.appendChild(btn);
  });
}

function renderBrandBar() {
  const pool = currentTag ? allData.filter(p => p.tag === currentTag) : allData;
  const brands = [...new Set(pool.map(p => p.brand))];
  const bar = document.getElementById('filter-bar');
  bar.innerHTML = '';

  const allBtn = document.createElement('button');
  allBtn.className = 'filter-btn' + (currentBrand === null ? ' active' : '');
  allBtn.textContent = '所有品牌';
  allBtn.onclick = () => setBrand(null);
  bar.appendChild(allBtn);

  brands.forEach(brand => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn' + (currentBrand === brand ? ' active' : '');
    btn.textContent = brand;
    btn.onclick = () => setBrand(brand);
    bar.appendChild(btn);
  });
}

function setTag(tag) {
  currentTag = tag;
  currentBrand = null;
  renderTagBar();
  renderBrandBar();
  renderCards(filtered());
}

function setBrand(brand) {
  currentBrand = brand;
  renderBrandBar();
  renderCards(filtered());
}

function filtered() {
  return allData.filter(p => {
    if (currentTag && p.tag !== currentTag) return false;
    if (currentBrand && p.brand !== currentBrand) return false;
    return true;
  });
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
  const summary = (post.postText || '').replace(/\n/g, '<br>');
  const isFiltered = currentBrand === post.brand;
  const filterBtnText = isFiltered ? '看所有品牌' : `只看 ${post.brand}`;
  const filterBtnAction = isFiltered
    ? `onclick="setBrand(null)"`
    : `onclick="setBrand('${post.brand.replace(/'/g, "\\'")}')"`;

  const imageSection = post.imageUrl
    ? `<img class="card-image" src="${post.imageUrl}" alt="${post.brand}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
      + `<div class="card-image-placeholder" style="display:none">🧋</div>`
    : `<div class="card-image-placeholder">🧋</div>`;

  const tagBadge = post.tag
    ? `<span class="tag-badge">${post.tag}</span>`
    : '';

  return `
    <div class="card">
      <div class="card-header">
        <span class="brand-name">${post.brand}</span>
        <button class="filter-only-btn" ${filterBtnAction}>${filterBtnText}</button>
      </div>
      ${imageSection}
      <div class="card-footer">
        <div class="card-meta">
          ${tagBadge}
          <span class="brand-tag">${post.brand}</span>
          <span>${date}</span>
        </div>
        <p class="card-text">${summary}</p>
        <a class="card-link" href="${post.postUrl}" target="_blank" rel="noopener">→ 前往原文</a>
      </div>
    </div>
  `;
}

loadData();
