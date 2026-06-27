let timerInterval = null;
let timerSeconds = 0;
let timerRunning = false;
let timerStudentId = null;
let timerTopicId = null;
let timerStartTime = null;

async function renderTimer(container) {
  const students = await DB.getStudents();
  const activeStudents = students.filter(s => s.active);
  const todayLogs = await DB.getStudyLogsByDate(DateUtils.today());
  const todayMinutes = todayLogs.reduce((sum, log) => sum + log.durationMinutes, 0);

  container.innerHTML = `
    <div class="stat-card" style="margin-bottom: 16px; padding: 24px;">
      <div style="font-size: 48px; font-weight: 700; font-family: monospace; color: ${timerRunning ? 'var(--success)' : 'var(--primary)'};">
        ${formatTimerTime(timerSeconds)}
      </div>
      <div class="stat-label" style="margin-top: 8px;">
        ${timerRunning ? 'Çalışıyor...' : 'Hazır'}
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">Zamanlayıcı Ayarları</span>
      </div>
      <div class="form-group">
        <label class="form-label">Öğrenci</label>
        <select class="form-select" id="timerStudent" ${timerRunning ? 'disabled' : ''} onchange="loadTimerTopics()">
          <option value="">Öğrenci seçin</option>
          ${activeStudents.map(s => `
            <option value="${s.id}" ${timerStudentId == s.id ? 'selected' : ''}>${s.name}</option>
          `).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Konu</label>
        <select class="form-select" id="timerTopic" ${timerRunning ? 'disabled' : ''}>
          <option value="">Önce öğrenci seçin</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Not (opsiyonel)</label>
        <input type="text" class="form-input" id="timerNote" placeholder="Bugün ne working..." ${timerRunning ? 'disabled' : ''}>
      </div>

      <div style="display: flex; gap: 12px;">
        ${timerRunning ? `
          <button class="btn btn-danger" style="flex: 1;" onclick="stopTimer()">
            ${UI.createIcon('clock', 16)} Durdur & Kaydet
          </button>
          <button class="btn btn-outline" style="flex: 1;" onclick="resetTimer()">
            ${UI.createIcon('trash', 16)} Sıfırla
          </button>
        ` : `
          <button class="btn btn-success btn-block" onclick="startTimer()" ${!timerStudentId || !timerTopicId ? 'disabled style="opacity:0.5"' : ''}>
            ${UI.createIcon('clock', 16)} Başlat
          </button>
        `}
      </div>
    </div>

    <div class="card" style="margin-top: 16px;">
      <div class="card-header">
        <span class="card-title">Bugünkü Oturumlar</span>
        <span class="badge badge-primary">${DateUtils.formatMinutes(todayMinutes)}</span>
      </div>
      ${todayLogs.length > 0 ? todayLogs.reverse().map(log => {
        const topic = todayTopicsMap[log.topicId] || null;
        const student = todayStudentsMap[log.studentId] || null;
        return `
          <div class="list-item" style="padding: 8px 0;">
            <div class="list-item-content">
              <div class="list-item-title" style="font-size: 13px;">${student ? student.name : '?'}</div>
              <div class="list-item-subtitle" style="font-size: 11px;">${topic ? topic.name : '?'} ${log.notes ? '- ' + log.notes : ''}</div>
            </div>
            <span class="badge badge-success">${DateUtils.formatMinutes(log.durationMinutes)}</span>
          </div>
        `;
      }).join('') : '<p style="color: #6B7280; font-size: 13px; text-align: center;">Henüz oturum yok</p>'}
    </div>
  `;

  loadTimerTopics();
}

let todayTopicsMap = {};
let todayStudentsMap = {};

async function loadTimerTopics() {
  const select = document.getElementById('timerStudent');
  if (!select) return;
  const studentId = select.value;
  timerStudentId = studentId ? parseInt(studentId) : null;

  const topicSelect = document.getElementById('timerTopic');
  if (!studentId) {
    topicSelect.innerHTML = '<option value="">Önce öğrenci seçin</option>';
    timerTopicId = null;
    updateTimerButtons();
    return;
  }

  const assignedTopics = await DB.getAssignedTopics(parseInt(studentId));
  topicSelect.innerHTML = `
    <option value="">Konu seçin</option>
    ${assignedTopics.map(st => st.topic ? `
      <option value="${st.topicId}" ${timerTopicId == st.topicId ? 'selected' : ''}>${st.topic.name}</option>
    ` : '').join('')}
  `;
  topicSelect.onchange = () => {
    timerTopicId = topicSelect.value ? parseInt(topicSelect.value) : null;
    updateTimerButtons();
  };

  const allTopics = await DB.getTopics();
  todayTopicsMap = {};
  allTopics.forEach(t => todayTopicsMap[t.id] = t);
  const allStudents = await DB.getStudents();
  todayStudentsMap = {};
  allStudents.forEach(s => todayStudentsMap[s.id] = s);
}

function updateTimerButtons() {
  const btn = document.querySelector('.btn-success');
  if (btn) {
    btn.disabled = !timerStudentId || !timerTopicId;
    btn.style.opacity = (!timerStudentId || !timerTopicId) ? '0.5' : '1';
  }
}

function formatTimerTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function startTimer() {
  if (!timerStudentId || !timerTopicId) return;
  timerRunning = true;
  timerStartTime = Date.now() - (timerSeconds * 1000);
  timerInterval = setInterval(() => {
    timerSeconds = Math.floor((Date.now() - timerStartTime) / 1000);
    const display = document.querySelector('[style*="font-size: 48px"]');
    if (display) display.textContent = formatTimerTime(timerSeconds);
    const label = document.querySelector('.stat-label');
    if (label) label.textContent = 'Çalışıyor...';
  }, 1000);
  renderTimer(document.getElementById('page-content'));
}

function stopTimer() {
  clearInterval(timerInterval);
  timerRunning = false;

  if (timerSeconds >= 60 && timerStudentId && timerTopicId) {
    const minutes = Math.round(timerSeconds / 60);
    const note = document.getElementById('timerNote') ? document.getElementById('timerNote').value.trim() : '';
    DB.addStudyLog({
      studentId: timerStudentId,
      topicId: timerTopicId,
      date: DateUtils.today(),
      durationMinutes: minutes,
      notes: note || 'Zamanlayıcı ile'
    });
    UI.showToast(`${minutes} dakika kaydedildi`);
  } else if (timerSeconds < 60) {
    UI.showToast('En az 1 dakika olmalı');
  }

  timerSeconds = 0;
  renderTimer(document.getElementById('page-content'));
}

function resetTimer() {
  clearInterval(timerInterval);
  timerRunning = false;
  timerSeconds = 0;
  renderTimer(document.getElementById('page-content'));
}