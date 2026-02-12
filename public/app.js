// Simple demo app: renders a grid heatmap using getCellColor()
document.addEventListener('DOMContentLoaded', () => {
  const heatmapEl = document.getElementById('heatmap');
  const journalForm = document.getElementById('journal-form');
  const journalList = document.getElementById('journal-list');

  // Generate demo data: 16x16 grid
  const cols = 16;
  const rows = 16;
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // demo values with some pattern + randomness
      const val = Math.round((Math.sin(r / 3) - Math.cos(c / 4)) * 2000 + (Math.random() - 0.5) * 2000);
      cells.push({ r, c, val });
    }
  }

  const maxAbs = Math.max(...cells.map((x) => Math.abs(x.val)), 1);

  cells.forEach((cell) => {
    const div = document.createElement('div');
    div.className = 'cell';
    div.textContent = cell.val;
    const styleObj = getCellColor(0, cell.val, maxAbs, 'pro');
    if (styleObj.backgroundColor) div.style.backgroundColor = styleObj.backgroundColor;
    if (styleObj.backgroundImage) div.style.backgroundImage = styleObj.backgroundImage;
    if (styleObj.boxShadow) div.style.boxShadow = styleObj.boxShadow;
    heatmapEl.appendChild(div);
  });

  // Journal (localStorage)
  function loadJournal() {
    const entries = JSON.parse(localStorage.getItem('journal') || '[]');
    journalList.innerHTML = '';
    entries.forEach((e) => {
      const li = document.createElement('li');
      li.textContent = `${e.title} — ${e.note}`;
      journalList.appendChild(li);
    });
  }

  journalForm.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const title = document.getElementById('entry-title').value.trim();
    const note = document.getElementById('entry-note').value.trim();
    if (!title) return;
    const entries = JSON.parse(localStorage.getItem('journal') || '[]');
    entries.unshift({ title, note, ts: Date.now() });
    localStorage.setItem('journal', JSON.stringify(entries));
    journalForm.reset();
    loadJournal();
  });

  loadJournal();
});
