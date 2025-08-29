(() => {
  const STORAGE_KEY = 'fieldOpsDashboardV1';

  /** @typedef {{ order: string[], pinned: Record<string, boolean>, customize: boolean }} LayoutState */

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
      const res = await fetch('heatmapOverlay.json', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error('Unexpected format');
      if (data.length === 0) {
        el.innerHTML = '<span class="muted">No heatmap zones.</span>';
        return;
      }
      const frag = document.createDocumentFragment();
      const list = document.createElement('ul');
      list.style.listStyle = 'none';
      list.style.padding = '0';
      list.style.margin = '0';
      for (const entry of data) {
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
      const fresh = getDefaultState();
      applyStateToDom(fresh);
      saveLayoutState(fresh);
      // Update ref
      state.order = fresh.order;
      state.pinned = fresh.pinned;
      state.customize = fresh.customize;
    });
  }

  // Boot
  window.addEventListener('DOMContentLoaded', () => {
    const state = loadLayoutState();
    applyStateToDom(state);
    setupDnD(state);
    setupPinning(state);
    setupCustomizeToggle(state);
    setupResetButton(state);
    // Data rendering
    renderHeatmap();
    renderQrScans();
    renderDigest();
  });
})();

