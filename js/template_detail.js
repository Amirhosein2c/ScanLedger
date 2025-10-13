// template_detail.js
// Responsibilities:
// 1. Read query param ?name= (template display name from Default_Templates.html)
// 2. Fetch and parse Fin_OCR_Document_Templates.csv (simple split on lines + commas)
// 3. Locate row whose second column (index 1) matches template name (case-insensitive)
// 4. Render remaining columns (after the name) as editable text inputs (ignore empty trailing cells)
// 5. Provide Save (store in localStorage shadow copy) + Reset + status messaging
// 6. Graceful handling of errors / missing template

(function() {
  const CSV_PATH = 'Fin_OCR_Document_Templates.csv';
  const params = new URLSearchParams(window.location.search);
  const templateName = params.get('name');

  const titleEl = document.getElementById('templateTitle');
  const formEl = document.getElementById('fieldsForm');
  const loadingEl = document.getElementById('loadingState');
  const emptyEl = document.getElementById('emptyState');
  const statusMsg = document.getElementById('statusMsg');
  const saveBtn = document.getElementById('saveBtn');
  const resetBtn = document.getElementById('resetBtn');
  const backBtn = document.getElementById('backBtn');

  backBtn?.addEventListener('click', () => {
    history.length > 1 ? history.back() : window.location.href = 'Default_Templates.html';
  });

  if (!templateName) {
    titleEl.textContent = 'Template';
    showEmpty('Missing template name');
    return;
  }
  titleEl.textContent = templateName;

  let originalValues = [];

  function setStatus(msg, transient = false) {
    statusMsg.textContent = msg;
    if (transient) {
      setTimeout(() => { if (statusMsg.textContent === msg) statusMsg.textContent = 'Ready'; }, 2500);
    }
  }

  function showEmpty(reason) {
    loadingEl.classList.add('hidden');
    formEl.classList.add('hidden');
    emptyEl.classList.remove('hidden');
    if (reason) setStatus(reason, true);
  }

  function parseCSV(text) {
    // Simple split; CSV appears to have no quoted commas per provided sample
    return text.trim().split(/\r?\n/).map(line => line.split(','));
  }

  async function load() {
    try {
      const res = await fetch(CSV_PATH, { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const csvText = await res.text();
      const rows = parseCSV(csvText);
      // Row structure: [id, Name, Field1, Field2, ...]
      const row = rows.find(r => (r[1] || '').toLowerCase() === templateName.toLowerCase());
      if (!row) {
        showEmpty('Template not found');
        return;
      }
      const fields = row.slice(2).filter(cell => cell && cell.trim() !== '');
      if (!fields.length) {
        showEmpty('No fields in template');
        return;
      }
      renderFields(fields);
    } catch (e) {
      console.error(e);
      showEmpty('Failed to load CSV');
    }
  }

  function renderFields(fields) {
    loadingEl.classList.add('hidden');
    formEl.innerHTML = '';
    originalValues = fields.slice();

    fields.forEach((label, idx) => {
      const id = 'field_' + idx;
      const wrapper = document.createElement('div');
      wrapper.className = 'space-y-1';
      const labelEl = document.createElement('label');
      labelEl.setAttribute('for', id);
      labelEl.className = 'block text-sm font-medium text-white/80';
      labelEl.textContent = label;

      const input = document.createElement('input');
      input.type = 'text';
      input.id = id;
      input.name = label;
      input.value = label; // start with same value; could be blank if desired
      input.className = 'w-full rounded-md bg-[#1F2937] border border-white/10 focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2 text-sm';

      input.addEventListener('input', markDirty);

      wrapper.appendChild(labelEl);
      wrapper.appendChild(input);
      formEl.appendChild(wrapper);
    });

    formEl.classList.remove('hidden');
    saveBtn.disabled = true;
    setStatus('Loaded');
  }

  function markDirty() {
    const dirty = Array.from(formEl.querySelectorAll('input')).some((inp, i) => inp.value !== originalValues[i]);
    saveBtn.disabled = !dirty;
    if (dirty) setStatus('Unsaved changes'); else setStatus('No changes');
  }

  saveBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const data = Array.from(formEl.querySelectorAll('input')).map(inp => inp.value);
    // Persist locally (namespace by template name)
    try {
      localStorage.setItem('templateFields:' + templateName, JSON.stringify(data));
      originalValues = data.slice();
      saveBtn.disabled = true;
      setStatus('Saved locally', true);
    } catch (err) {
      console.error(err);
      setStatus('Save failed', true);
    }
  });

  resetBtn.addEventListener('click', () => {
    const stored = localStorage.getItem('templateFields:' + templateName);
    if (stored) {
      try {
        const arr = JSON.parse(stored);
        Array.from(formEl.querySelectorAll('input')).forEach((inp, i) => { if (arr[i] !== undefined) inp.value = arr[i]; });
        originalValues = arr.slice();
        markDirty();
        setStatus('Reset to saved', true);
        return;
      } catch(e) { /* fallthrough */ }
    }
    // Fallback: original CSV values
    Array.from(formEl.querySelectorAll('input')).forEach((inp, i) => inp.value = originalValues[i]);
    markDirty();
    setStatus('Reset', true);
  });

  // Load any stored edits after render
  function applyStoredEdits() {
    const stored = localStorage.getItem('templateFields:' + templateName);
    if (!stored) return;
    try {
      const arr = JSON.parse(stored);
      Array.from(formEl.querySelectorAll('input')).forEach((inp, i) => { if (arr[i] !== undefined) inp.value = arr[i]; });
      originalValues = arr.slice();
      markDirty();
      saveBtn.disabled = true; // matches original stored
      setStatus('Loaded saved edits', true);
    } catch (e) { console.warn('Failed to parse stored edits'); }
  }

  document.addEventListener('DOMContentLoaded', () => {
    load().then(() => applyStoredEdits());
  });
})();
