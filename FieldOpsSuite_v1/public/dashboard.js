(() => {
  const STORAGE_KEY = 'fieldOpsDashboardV1';
  const ICONS_KEY = 'fieldOpsDashboardIconsV1';

  /** @typedef {{ order: string[], pinned: Record<string, boolean>, customize: boolean }} LayoutState */
  /** @typedef {{ order: string[], pinned: Record<string, boolean> }} IconsState */

  /**
   * Read saved layout or return defaults based on current DOM.
   * @returns {LayoutState}
   */
  function loadLayoutState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return getDefaultState();
      const parsed = JSON.parse(raw);
      return {
        order: Array.isArray(parsed.order) ? parsed.order : getDefaultOrder(),
        pinned: parsed.pinned && typeof parsed.pinned === 'object' ? parsed.pinned : {},
        customize: Boolean(parsed.customize),
      };
    } catch (_) {
      return getDefaultState();
    }
  }

  /** @returns {IconsState} */
  function loadIconsState() {
    try {
      const raw = localStorage.getItem(ICONS_KEY);
      if (!raw) return getDefaultIconsState();
      const parsed = JSON.parse(raw);
      return {
        order: Array.isArray(parsed.order) ? parsed.order : getDefaultIconsOrder(),
        pinned: parsed.pinned && typeof parsed.pinned === 'object' ? parsed.pinned : {},
      };
    } catch (_) {
      return getDefaultIconsState();
    }
  }

  /** @returns {IconsState} */
  function getDefaultIconsState() {
    return { order: getDefaultIconsOrder(), pinned: {} };
  }

  function getDefaultIconsOrder() {
    return Array.from(document.querySelectorAll('#iconDock .icon')).map(el => el.dataset.id);
  }

  /** @returns {LayoutState} */
  function getDefaultState() {
    return { order: getDefaultOrder(), pinned: {}, customize: false };
  }

  function getDefaultOrder() {
    return Array.from(document.querySelectorAll('article.widget')).map(el => el.dataset.id);
  }

  /**
   * Persist layout state to localStorage.
   * @param {LayoutState} state
   */
  function saveLayoutState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  /**
   * Persist icons state to localStorage.
   * @param {IconsState} state
   */
  function saveIconsState(state) {
    localStorage.setItem(ICONS_KEY, JSON.stringify(state));
  }

  /**
   * Apply order and pin states to DOM.
   * @param {LayoutState} state
   */
  function applyStateToDom(state) {
    const container = document.getElementById('widgets');
    const widgets = new Map(Array.from(container.children).map(c => [c.dataset.id, c]));

    // Order
    state.order.forEach(id => {
      const el = widgets.get(id);
      if (el) container.appendChild(el);
    });

    // Any new widgets not captured yet
    widgets.forEach((el, id) => {
      if (!state.order.includes(id)) container.appendChild(el);
    });

    // Pin state and draggable
    document.querySelectorAll('article.widget').forEach(el => {
      const id = el.dataset.id;
      const isPinned = !!state.pinned[id];
      el.classList.toggle('pinned', isPinned);
      // Pin button
      const pinBtn = el.querySelector('.pin-btn');
      if (pinBtn) pinBtn.setAttribute('aria-pressed', String(isPinned));
      // Draggability depends on customize + not pinned
      const draggable = state.customize && !isPinned;
      el.setAttribute('draggable', String(draggable));
    });

    // Customize toggle
    const customizeToggle = document.getElementById('customizeToggle');
    customizeToggle.checked = !!state.customize;
    document.body.classList.toggle('customizing', !!state.customize);
  }

  /**
   * Apply icon order and pin state to DOM.
   * @param {IconsState} state
   * @param {boolean} customizeEnabled
   */
  function applyIconsToDom(state, customizeEnabled) {
    const dock = document.getElementById('iconDock');
    const icons = new Map(Array.from(dock.children).map(c => [c.dataset.id, c]));

    state.order.forEach(id => {
      const el = icons.get(id);
      if (el) dock.appendChild(el);
    });
    icons.forEach((el, id) => {
      if (!state.order.includes(id)) dock.appendChild(el);
    });

    dock.querySelectorAll('.icon').forEach(el => {
      const id = el.dataset.id;
      const isPinned = !!state.pinned[id];
      el.classList.toggle('pinned', isPinned);
      const pinBtn = el.querySelector('.icon-pin-btn');
      if (pinBtn) pinBtn.setAttribute('aria-pressed', String(isPinned));
      const draggable = customizeEnabled && !isPinned;
      el.setAttribute('draggable', String(draggable));
    });
  }

  /**
   * Compute the element in container after which dragged should be inserted based on pointer position.
   * @param {HTMLElement} container
   * @param {number} x
   * @param {number} y
   */
  function getDragAfterElement(container, x, y) {
    const elements = [...container.querySelectorAll('.widget:not(.dragging)')];
    if (elements.length === 0) return null;

    // Use distance to center heuristic for CSS grid layouts
    let closest = { distance: Number.POSITIVE_INFINITY, element: null };
    for (const el of elements) {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = cx - x;
      const dy = cy - y;
      const dist = Math.hypot(dx, dy);
      if (dist < closest.distance) closest = { distance: dist, element: el };
    }
    return closest.element;
  }

  function setupDnD(state) {
    const container = document.getElementById('widgets');

    container.addEventListener('dragstart', (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      const item = target.closest('.widget');
      if (!item) return;
      const id = item.dataset.id;
      if (!state.customize || state.pinned[id]) {
        e.preventDefault();
        return;
      }
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', id);
    });

    container.addEventListener('dragend', (e) => {
      const item = e.target instanceof HTMLElement ? e.target.closest('.widget') : null;
      if (item) item.classList.remove('dragging');
      container.classList.remove('drop-indicator');
    });

    container.addEventListener('dragover', (e) => {
      if (!state.customize) return;
      e.preventDefault();
      container.classList.add('drop-indicator');
      const afterEl = getDragAfterElement(container, e.clientX, e.clientY);
      const dragging = container.querySelector('.widget.dragging');
      if (!dragging) return;
      if (afterEl == null) {
        container.appendChild(dragging);
      } else {
        container.insertBefore(dragging, afterEl);
      }
    });

    container.addEventListener('drop', () => {
      // Save new order
      state.order = Array.from(container.querySelectorAll('article.widget')).map(el => el.dataset.id);
      saveLayoutState(state);
      container.classList.remove('drop-indicator');
    });
  }

  function setupIconsDnD(layoutState, iconsState) {
    const dock = document.getElementById('iconDock');

    dock.addEventListener('dragstart', (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      const icon = target.closest('.icon');
      if (!icon) return;
      const id = icon.dataset.id;
      if (!layoutState.customize || iconsState.pinned[id]) {
        e.preventDefault();
        return;
      }
      icon.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', id);
    });

    dock.addEventListener('dragend', (e) => {
      const icon = e.target instanceof HTMLElement ? e.target.closest('.icon') : null;
      if (icon) icon.classList.remove('dragging');
      dock.classList.remove('drop-indicator');
    });

    dock.addEventListener('dragover', (e) => {
      if (!layoutState.customize) return;
      e.preventDefault();
      dock.classList.add('drop-indicator');
      const afterEl = getDragAfterIcon(dock, e.clientX, e.clientY);
      const dragging = dock.querySelector('.icon.dragging');
      if (!dragging) return;
      if (afterEl == null) {
        dock.appendChild(dragging);
      } else {
        dock.insertBefore(dragging, afterEl);
      }
    });

    dock.addEventListener('drop', () => {
      iconsState.order = Array.from(dock.querySelectorAll('.icon')).map(el => el.dataset.id);
      saveIconsState(iconsState);
      dock.classList.remove('drop-indicator');
    });
  }

  function getDragAfterIcon(dock, x, y) {
    const elements = [...dock.querySelectorAll('.icon:not(.dragging)')];
    if (elements.length === 0) return null;
    let closest = { distance: Number.POSITIVE_INFINITY, element: null };
    for (const el of elements) {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = cx - x;
      const dy = cy - y;
      const dist = Math.hypot(dx, dy);
      if (dist < closest.distance) closest = { distance: dist, element: el };
    }
    return closest.element;
  }

  function setupPinning(state) {
    const container = document.getElementById('widgets');
    container.addEventListener('click', (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      const pinBtn = target.closest('.pin-btn');
      if (!pinBtn) return;
      const widget = pinBtn.closest('.widget');
      if (!widget) return;
      const id = widget.dataset.id;
      const nextPinned = !state.pinned[id];
      if (nextPinned) state.pinned[id] = true; else delete state.pinned[id];
      saveLayoutState(state);
      applyStateToDom(state);
    });
  }

  function setupIconsPinning(layoutState, iconsState) {
    const dock = document.getElementById('iconDock');
    dock.addEventListener('click', (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      const pinBtn = target.closest('.icon-pin-btn');
      if (!pinBtn) return;
      const icon = pinBtn.closest('.icon');
      if (!icon) return;
      const id = icon.dataset.id;
      const nextPinned = !iconsState.pinned[id];
      if (nextPinned) iconsState.pinned[id] = true; else delete iconsState.pinned[id];
      saveIconsState(iconsState);
      applyIconsToDom(iconsState, layoutState.customize);
    });
  }

  function setupCustomizeToggle(state) {
    const toggle = document.getElementById('customizeToggle');
    toggle.addEventListener('change', () => {
      state.customize = !!toggle.checked;
      saveLayoutState(state);
      applyStateToDom(state);
    });
  }

  async function renderHeatmap() {
    const el = document.getElementById('heatmapBody');
    try {
      const [overlayRes, geoRes] = await Promise.all([
        fetch('heatmapOverlay.json', { cache: 'no-store' }),
        fetch('heatmap.geojson', { cache: 'no-store' })
      ]);
      if (!overlayRes.ok) throw new Error('Failed to load overlay');
      const data = await overlayRes.json();
      const geo = geoRes.ok ? await geoRes.json() : null;
      const filterSel = document.getElementById('heatmapFilter');

      function renderList(filter) {
        const filtered = Array.isArray(data) ? data.filter(d => filter === 'all' || d.intensity === filter) : [];
        if (filtered.length === 0) {
          el.innerHTML = '<span class="muted">No heatmap zones.</span>';
          return;
        }
        const frag = document.createDocumentFragment();
        const list = document.createElement('ul');
        list.style.listStyle = 'none';
        list.style.padding = '0';
        list.style.margin = '0';
        for (const entry of filtered) {
          const li = document.createElement('li');
          li.style.display = 'flex';
          li.style.alignItems = 'center';
          li.style.gap = '8px';
          const badge = document.createElement('span');
          badge.textContent = String(entry.intensity || '').toUpperCase();
          badge.style.padding = '2px 6px';
          badge.style.borderRadius = '6px';
          badge.style.border = '1px solid var(--border)';
          badge.style.background = 'rgba(56,189,248,.08)';
          badge.style.color = 'var(--accent)';
          const text = document.createElement('span');
          text.textContent = String(entry.zone || 'Unknown zone');
          li.appendChild(badge);
          li.appendChild(text);
          list.appendChild(li);
        }
        frag.appendChild(list);
        el.innerHTML = '';
        el.appendChild(frag);
      }

      function renderMap(filter) {
        const container = document.getElementById('heatmapMap');
        if (!container || !window.maplibregl || !geo || !geo.features) return;
        container.innerHTML = '';
        const map = new window.maplibregl.Map({
          container,
          style: 'https://demotiles.maplibre.org/style.json',
          center: [-95, 38],
          zoom: 3.2,
        });
        map.on('load', () => {
          const filtered = {
            type: 'FeatureCollection',
            features: geo.features.filter(f => {
              return filter === 'all' || (f.properties && f.properties.intensity === filter);
            })
          };
          map.addSource('zones', { type: 'geojson', data: filtered });
          map.addLayer({
            id: 'zones-circles',
            type: 'circle',
            source: 'zones',
            paint: {
              'circle-radius': [
                'interpolate', ['linear'], ['get', 'count'],
                0, 4,
                200, 12,
                400, 18
              ],
              'circle-color': [
                'match', ['get', 'intensity'],
                'high', '#ef4444',
                'medium', '#f59e0b',
                'low', '#22c55e',
                '#a3a3a3'
              ],
              'circle-opacity': 0.8,
            },
          });
        });
      }

      const applyAll = () => {
        const filter = filterSel ? filterSel.value : 'all';
        renderList(filter);
        renderMap(filter);
      };
      if (filterSel) filterSel.addEventListener('change', applyAll);
      applyAll();
    } catch (err) {
      el.innerHTML = '<span class="danger">Failed to load heatmap.</span>';
    }
  }

  async function renderQrScans() {
    const el = document.getElementById('qrBody');
    try {
      const res = await fetch('../data/qrScans.json', { cache: 'no-store' });
      if (!res.ok) throw new Error('not found');
      const data = await res.json();
      const count = Array.isArray(data) ? data.length : 0;
      el.innerHTML = `<strong>${count}</strong> scan(s) available.`;
    } catch (_) {
      el.innerHTML = '<span class="muted">QR scans not available in public build.</span>';
    }
  }

  async function renderDigest() {
    const el = document.getElementById('digestBody');
    try {
      const res = await fetch('../digests/weekly.md', { cache: 'no-store' });
      if (!res.ok) throw new Error('not found');
      const text = await res.text();
      const preview = text.split('\n').slice(0, 5).join('\n');
      const pre = document.createElement('pre');
      pre.textContent = preview + (text.includes('\n', 5) ? '\n…' : '');
      pre.style.whiteSpace = 'pre-wrap';
      pre.style.margin = '0';
      el.innerHTML = '';
      el.appendChild(pre);
    } catch (_) {
      el.innerHTML = '<span class="muted">Digest not available in public build.</span>';
    }
  }

  function setupResetButton(state) {
    const btn = document.getElementById('resetLayoutBtn');
    btn.addEventListener('click', () => {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(ICONS_KEY);
      const fresh = getDefaultState();
      const iconsFresh = getDefaultIconsState();
      applyStateToDom(fresh);
      applyIconsToDom(iconsFresh, fresh.customize);
      saveLayoutState(fresh);
      saveIconsState(iconsFresh);
      // Update ref
      state.order = fresh.order;
      state.pinned = fresh.pinned;
      state.customize = fresh.customize;
    });
  }

  // Boot
  window.addEventListener('DOMContentLoaded', () => {
    const state = loadLayoutState();
    const iconsState = loadIconsState();
    applyStateToDom(state);
    applyIconsToDom(iconsState, state.customize);
    setupDnD(state);
    setupIconsDnD(state, iconsState);
    setupPinning(state);
    setupIconsPinning(state, iconsState);
    setupCustomizeToggle(state);
    setupResetButton(state);
    // Data rendering
    renderHeatmap();
    renderQrScans();
    renderDigest();
  });
})();

