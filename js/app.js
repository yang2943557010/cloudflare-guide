(function () {
  /** 站点根路径（兼容 Live Server 子目录与 Cloudflare 根域名） */
  function getSiteBase() {
    const script = document.querySelector('script[src*="app.js"]');
    if (script?.src) {
      const u = new URL(script.src, location.href);
      let path = u.pathname.replace(/\/js\/app\.js.*$/, '');
      if (!path.endsWith('/')) path += '/';
      return path;
    }
    return './';
  }

  function siteUrl(relativePath) {
    return getSiteBase() + String(relativePath || '').replace(/^\//, '');
  }

  function resolveDataUrl() {
    return siteUrl('data/versions.json');
  }

  async function loadVersions() {
    const url = resolveDataUrl();
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error('无法加载版本数据');
    return res.json();
  }

  function statusLabel(status) {
    const map = { latest: '当前版本', stable: '稳定版', archived: '历史版本' };
    return map[status] || status;
  }

  function renderVersionItem(release, options = {}) {
    const { compact = false } = options;
    const highlights = (release.highlights || [])
      .map((h) => `<li>${escapeHtml(h)}</li>`)
      .join('');

    const actions = [];
    if (release.hasArticleGuide) {
      actions.push(`<a class="btn btn-outline btn-sm" href="${siteUrl('guide/article.html')}">图文说明</a>`);
    }
    if (release.hasVideoGuide) {
      actions.push(`<a class="btn btn-outline btn-sm" href="${siteUrl('guide/video.html')}">视频教程</a>`);
    }
    if (release.status === 'latest' && options.downloadLatest) {
      actions.push(
        `<a class="btn btn-primary btn-sm" href="${escapeHtml(options.downloadLatest)}" target="_blank" rel="noopener">下载最新版 v${escapeHtml(release.version)}</a>`
      );
    } else if (options.downloadBase) {
      const dl = options.downloadBase.startsWith('http')
        ? options.downloadBase
        : siteUrl(options.downloadBase.replace(/^\//, ''));
      actions.push(
        `<a class="btn btn-outline btn-sm" href="${escapeHtml(dl)}v${escapeHtml(release.version)}.zip" download>下载 v${escapeHtml(release.version)}</a>`
      );
    }

    return `
      <article class="version-item ${release.status === 'latest' ? 'latest' : ''}">
        <div class="version-item-head">
          <span class="version-number">v${escapeHtml(release.version)}</span>
          <span class="version-date">${escapeHtml(release.date)}</span>
          <span class="status-badge ${escapeHtml(release.status)}">${statusLabel(release.status)}</span>
        </div>
        <p class="version-summary">${escapeHtml(release.summary || '')}</p>
        ${highlights && !compact ? `<ul class="version-highlights">${highlights}</ul>` : ''}
        ${actions.length ? `<div class="version-actions">${actions.join('')}</div>` : ''}
      </article>
    `;
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function resolveAssetUrl(path) {
    if (!path) return '';
    if (/^https?:\/\//i.test(path) || path.startsWith('/')) return path;
    const page = document.body?.dataset?.page;
    const prefix = page === 'video' ? '../' : page === 'home' ? '' : '../';
    return prefix + path.replace(/^\.\//, '');
  }

  function videoEmbed(v) {
    if (!v?.url) return '';
    const type = v.embedType || 'bilibili';
    if (type === 'local' || /\.mp4(\?|$)/i.test(v.url)) {
      const src = resolveAssetUrl(v.url);
      return `<video controls playsinline preload="metadata" src="${escapeHtml(src)}">您的浏览器不支持视频播放，请<a href="${escapeHtml(src)}">下载观看</a>。</video>`;
    }
    return bilibiliEmbed(v.url);
  }

  function bilibiliEmbed(url) {
    if (!url) return '';
    const bv = url.match(/BV[\w]+/i)?.[0];
    if (bv) {
      return `<iframe src="https://player.bilibili.com/player.html?bvid=${bv}&high_quality=1&danmaku=0" allowfullscreen></iframe>`;
    }
    if (url.includes('<iframe')) return url;
    if (url.startsWith('http')) {
      return `<iframe src="${escapeHtml(url)}" allowfullscreen></iframe>`;
    }
    return '';
  }

  async function initHome() {
    const currentEl = document.getElementById('current-version');
    const listEl = document.getElementById('home-version-list');
    const downloadEl = document.getElementById('latest-download-panel');
    if (!currentEl && !listEl && !downloadEl) return;

    try {
      const data = await loadVersions();
      const linkOpts = {
        downloadLatest: data.links?.downloadLatest,
        downloadBase: data.links?.downloadBase,
      };
      if (currentEl) {
        currentEl.innerHTML = `<span class="dot"></span> v${escapeHtml(data.currentVersion)}`;
      }
      if (downloadEl && data.links?.downloadLatest) {
        const pwd = data.links.downloadPassword
          ? ` · 提取码 <strong>${escapeHtml(data.links.downloadPassword)}</strong>`
          : '';
        downloadEl.innerHTML = `
          <div class="download-banner">
            <div class="download-banner-text">
              <strong>最新版 v${escapeHtml(data.currentVersion)}</strong>
              <span>百度网盘下载，解压后在 Chrome 加载已解压的扩展程序${pwd}</span>
            </div>
            <a class="btn btn-primary" href="${escapeHtml(data.links.downloadLatest)}" target="_blank" rel="noopener">下载最新版</a>
          </div>`;
      }
      if (listEl) {
        const latestThree = (data.releases || []).slice(0, 3);
        listEl.innerHTML = latestThree
          .map((r) => renderVersionItem(r, { compact: true, ...linkOpts }))
          .join('');
      }
    } catch (e) {
      if (listEl) listEl.innerHTML = `<p class="version-summary">版本信息加载失败，请稍后刷新。</p>`;
      console.error(e);
    }
  }

  async function initVersionsPage() {
    const listEl = document.getElementById('all-version-list');
    const titleEl = document.getElementById('versions-current');
    if (!listEl) return;

    try {
      const data = await loadVersions();
      if (titleEl) {
        titleEl.textContent = `当前最新 v${data.currentVersion}`;
      }
      listEl.innerHTML = (data.releases || [])
        .map((r) =>
          renderVersionItem(r, {
            downloadLatest: data.links?.downloadLatest,
            downloadBase: data.links?.downloadBase,
          })
        )
        .join('');
    } catch (e) {
      listEl.innerHTML = `<p class="version-summary">版本信息加载失败。</p>`;
    }
  }

  async function initVideoPage() {
    const grid = document.getElementById('video-grid');
    if (!grid) return;

    try {
      const data = await loadVersions();
      const videos = data.videos || {};
      const entries = Object.entries(videos);

      if (!entries.length) {
        grid.innerHTML = '<div class="empty-video">暂无视频，请在 data/versions.json 中配置。</div>';
        return;
      }

      grid.innerHTML = entries
        .map(([key, v]) => {
          const embed = videoEmbed(v);
          const embedHtml = embed
            ? `<div class="video-embed">${embed}</div>`
            : `<div class="video-embed">视频链接待配置<br><small>编辑 data/versions.json → videos</small></div>`;

          const metaParts = [];
          if (v.duration) metaParts.push(escapeHtml(v.duration));
          if (v.shareUrl) {
            metaParts.push(
              `<a href="${escapeHtml(v.shareUrl)}" target="_blank" rel="noopener noreferrer">在哔哩哔哩观看</a>`
            );
          }
          const metaHtml = metaParts.length
            ? `<div class="video-meta">${metaParts.join(' · ')}</div>`
            : '';

          return `
            <div class="video-card" id="video-${escapeHtml(key)}">
              ${embedHtml}
              <div class="video-body">
                <h3>${escapeHtml(v.title)}</h3>
                ${metaHtml}
                ${v.note ? `<p class="video-note">${escapeHtml(v.note)}</p>` : ''}
              </div>
            </div>
          `;
        })
        .join('');

      const hash = window.location.hash.replace(/^#/, '');
      if (hash) {
        const target = document.getElementById(`video-${hash}`) || document.getElementById(hash);
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch (e) {
      grid.innerHTML = '<div class="empty-video">视频列表加载失败。</div>';
    }
  }

  function initTocHighlight() {
    const toc = document.querySelector('.guide-toc');
    if (!toc) return;
    const links = [...toc.querySelectorAll('a[href^="#"]')];
    const sections = links
      .map((a) => document.querySelector(a.getAttribute('href')))
      .filter(Boolean);

    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            links.forEach((l) => l.classList.remove('active'));
            const active = links.find((l) => l.getAttribute('href') === `#${entry.target.id}`);
            active?.classList.add('active');
          }
        });
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 }
    );

    sections.forEach((s) => observer.observe(s));
  }

  const page = document.body.dataset.page;
  if (page === 'home') initHome();
  if (page === 'versions') initVersionsPage();
  if (page === 'video') initVideoPage();
  initTocHighlight();
})();
