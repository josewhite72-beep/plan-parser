// ===== CONFIG =====
const COMIC_CREATOR_URL = 'https://comic-creator-2.vercel.app/';

// ===== STATE =====
let currentTab = 'upload';
let extractedFileText = '';
let lastResult = null;

// ===== TABS =====
function switchTab(tab, btn) {
  currentTab = tab;
  document.querySelectorAll('.itab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('tab-upload').style.display = tab === 'upload' ? 'block' : 'none';
  document.getElementById('tab-paste').style.display = tab === 'paste' ? 'block' : 'none';
}

// ===== DRAG & DROP =====
function onDragOver(e) {
  e.preventDefault();
  document.getElementById('uploadZone').classList.add('dragover');
}
function onDragLeave(e) {
  document.getElementById('uploadZone').classList.remove('dragover');
}
function onDrop(e) {
  e.preventDefault();
  document.getElementById('uploadZone').classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
}

// ===== FILE HANDLING =====
async function handleFile(file) {
  if (!file) return;
  const filename = document.getElementById('uploadFilename');
  filename.textContent = '⏳ Reading ' + file.name + '...';
  extractedFileText = '';

  try {
    const ext = file.name.split('.').pop().toLowerCase();

    if (ext === 'txt') {
      extractedFileText = await readAsText(file);
    } else if (ext === 'docx') {
      extractedFileText = await readDocx(file);
    } else if (ext === 'pdf') {
      extractedFileText = await readPdf(file);
    } else {
      filename.textContent = '❌ Unsupported format';
      return;
    }

    filename.textContent = '✅ ' + file.name + ' (' + Math.round(extractedFileText.length / 100) / 10 + 'k chars)';
  } catch (err) {
    filename.textContent = '❌ Error reading file: ' + err.message;
  }
}

function readAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsText(file);
  });
}

async function readDocx(file) {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

async function readPdf(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map(item => item.str).join(' ') + '\n';
  }
  return text;
}

// ===== PARSE =====
async function parseLesson() {
  // Get text source
  let text = '';
  if (currentTab === 'upload') {
    text = extractedFileText;
    if (!text) { showToast('Upload a file first'); return; }
  } else {
    text = document.getElementById('pasteText').value.trim();
    if (!text) { showToast('Paste your planeamiento text first'); return; }
  }

  const btn = document.getElementById('parseBtn');
  const status = document.getElementById('parseStatus');

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Analyzing planeamiento...';
  status.className = 'status loading';
  status.textContent = '🔍 Sending to AI for analysis...';

  try {
    const resp = await fetch('/api/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });

    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.error || 'Server error ' + resp.status);
    }

    const data = await resp.json();
    lastResult = data;
    displayResult(data);
    status.className = 'status';

  } catch (err) {
    status.className = 'status error';
    status.textContent = '❌ ' + err.message;
  } finally {
    btn.disabled = false;
    btn.innerHTML = '📋 Extract Comic Elements';
  }
}

// ===== DISPLAY RESULT =====
function displayResult(data) {
  // Topic
  setText('outTopic', data.topic || 'Not found');

  // Vocabulary tags
  const vocabEl = document.getElementById('outVocab');
  vocabEl.innerHTML = '';
  if (data.vocabulary && data.vocabulary.length) {
    data.vocabulary.forEach(w => {
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = w;
      vocabEl.appendChild(tag);
    });
  } else {
    vocabEl.textContent = 'Not found';
  }
  // Add copy button to vocab
  const vocabCopy = document.createElement('button');
  vocabCopy.className = 'copy-field-btn';
  vocabCopy.textContent = 'copy';
  vocabCopy.style.position = 'static';
  vocabCopy.style.marginLeft = 'auto';
  vocabCopy.onclick = () => {
    navigator.clipboard.writeText((data.vocabulary || []).join(', '));
    showToast('Vocabulary copied!');
  };
  vocabEl.appendChild(vocabCopy);

  setText('outStructure', data.targetStructure || 'Not found');
  setText('outFunction', data.communicativeFunction || 'Not found');
  setText('outHook', data.hook || 'Not found');
  setText('outOutcome', data.expectedOutcome || 'Not found');

  // Set grade and phase selectors
  if (data.grade) setSelectValue('outGrade', data.grade);
  if (data.phase) setSelectValue('outPhase', data.phase);

  // Show result card
  document.getElementById('resultCard').classList.add('visible');
  document.getElementById('resultCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function setText(id, text) {
  const el = document.getElementById(id);
  // Keep copy button if it exists
  const btn = el.querySelector('.copy-field-btn');
  el.textContent = text;
  if (btn) el.appendChild(btn);
}

function setSelectValue(id, value) {
  const sel = document.getElementById(id);
  for (let i = 0; i < sel.options.length; i++) {
    if (sel.options[i].value === value || sel.options[i].text === value) {
      sel.selectedIndex = i;
      return;
    }
  }
}

// ===== COPY FIELD =====
function copyField(id) {
  const el = document.getElementById(id);
  const text = el.textContent.replace('copy', '').trim();
  navigator.clipboard.writeText(text).then(() => showToast('Copied!'));
}

// ===== COPY ALL =====
function copyAll() {
  if (!lastResult) return;
  const grade = document.getElementById('outGrade').value;
  const phase = document.getElementById('outPhase').value;
  const text = [
    'TOPIC: ' + (lastResult.topic || ''),
    'GRADE: ' + grade,
    'PHASE: ' + phase,
    'VOCABULARY: ' + (lastResult.vocabulary || []).join(', '),
    'TARGET STRUCTURE: ' + (lastResult.targetStructure || ''),
    'FUNCTION: ' + (lastResult.communicativeFunction || ''),
    'HOOK: ' + (lastResult.hook || ''),
    'OUTCOME: ' + (lastResult.expectedOutcome || ''),
    '',
    'CONTEXT: ' + (lastResult.context || '')
  ].join('\n');

  navigator.clipboard.writeText(text).then(() => showToast('All elements copied!'));
}

// ===== OPEN IN COMIC CREATOR =====
function openInComicCreator() {
  if (!lastResult) return;
  const grade = document.getElementById('outGrade').value;
  const phase = document.getElementById('outPhase').value;

  // Build context string combining all elements
  const context = [
    lastResult.targetStructure ? 'Target structure: ' + lastResult.targetStructure : '',
    lastResult.vocabulary?.length ? 'Vocabulary: ' + lastResult.vocabulary.join(', ') : '',
    lastResult.communicativeFunction ? 'Function: ' + lastResult.communicativeFunction : '',
    lastResult.hook ? 'Hook: ' + lastResult.hook : '',
    lastResult.context || ''
  ].filter(Boolean).join('\n');

  const params = new URLSearchParams({
    topic: lastResult.topic || '',
    grade,
    phase,
    context
  });

  const url = COMIC_CREATOR_URL + '?' + params.toString();
  window.open(url, '_blank');
  showToast('Opening Comic Creator...');
}

// ===== RESET =====
function resetAll() {
  extractedFileText = '';
  lastResult = null;
  document.getElementById('uploadFilename').textContent = '';
  document.getElementById('pasteText').value = '';
  document.getElementById('fileInput').value = '';
  document.getElementById('parseStatus').className = 'status';
  document.getElementById('resultCard').classList.remove('visible');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== TOAST =====
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(window._toast);
  window._toast = setTimeout(() => t.classList.remove('show'), 2200);
}

// ===== INIT: configure PDF.js worker =====
if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}
