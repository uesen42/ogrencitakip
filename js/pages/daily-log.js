let dailyLogDate = DateUtils.today();

async function renderDailyLog(container) {
  const students = await DB.getStudents();
  const activeStudents = students.filter(s => s.active);
  const logs = await DB.getStudyLogsByDate(dailyLogDate);
  const topics = await DB.getTopics();

  const topicMap = {};
  topics.forEach(t => topicMap[t.id] = t);
  const studentMap = {};
  students.forEach(s => studentMap[s.id] = s);

  const totalMinutes = logs.reduce((sum, log) => sum + log.durationMinutes, 0);

  container.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
      <button class="btn btn-outline btn-sm" onclick="changeDailyLogDate(-1)">
        ${UI.createIcon('chevronLeft', 20)}
      </button>
      <div style="flex: 1; text-align: center;">
        <div style="font-weight: 600; font-size: 16px;">${DateUtils.formatDisplay(dailyLogDate)}</div>
        <div style="font-size: 12px; color: #6B7280;">${DateUtils.getDayName(dailyLogDate)}</div>
      </div>
      <button class="btn btn-outline btn-sm" onclick="changeDailyLogDate(1)">
        ${UI.createIcon('chevronRight', 20)}
      </button>
    </div>

    <div class="stat-card" style="margin-bottom: 16px;">
      <div class="stat-value" style="font-size: 24px;">${DateUtils.formatMinutes(totalMinutes)}</div>
      <div class="stat-label">Toplam Çalışma</div>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">Yeni Kayıt Ekle</span>
      </div>
      <form id="logForm" onsubmit="saveStudyLog(event)">
        <div class="form-group">
          <label class="form-label">Öğrenci</label>
          <select class="form-select" id="logStudent" required onchange="updateTopicOptions()">
            <option value="">Öğrenci seçin</option>
            ${activeStudents.map(s => `
              <option value="${s.id}">${s.name} (${s.examType})</option>
            `).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Konu</label>
          <select class="form-select" id="logTopic" required>
            <option value="">Önce öğrenci seçin</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Süre (dakika)</label>
          <input type="number" class="form-input" id="logDuration" required min="1" max="600" placeholder="60">
        </div>
        <div class="form-group">
          <label class="form-label">Not (opsiyonel)</label>
          <textarea class="form-textarea" id="logNotes" placeholder="Çalışma detayları..."></textarea>
        </div>
        <button type="submit" class="btn btn-primary btn-block">
          ${UI.createIcon('check', 16)} Kaydet
        </button>
      </form>
    </div>

    <div class="card" style="margin-top: 16px;">
      <div class="card-header">
        <span class="card-title">Bugünkü Kayıtlar (${logs.length})</span>
      </div>
      ${logs.length > 0 ? `
        <div>
          ${logs.reverse().map(log => {
            const topic = topicMap[log.topicId];
            const student = studentMap[log.studentId];
            return `
              <div class="list-item">
                <div class="list-item-content">
                  <div class="list-item-title">${student ? student.name : 'Bilinmeyen'}</div>
                  <div class="list-item-subtitle">
                    ${topic ? `${topic.examCategory} ${topic.subject} - ${topic.name}` : 'Bilinmeyen konu'}
                    ${log.notes ? `<br><em style="font-size: 11px;">${log.notes}</em>` : ''}
                  </div>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span class="badge badge-primary">${DateUtils.formatMinutes(log.durationMinutes)}</span>
                  <button class="btn btn-outline btn-sm" onclick="deleteStudyLog(${log.id})" style="color: var(--danger); padding: 4px;">
                    ${UI.createIcon('trash', 14)}
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      ` : UI.renderEmptyState('Bu tarihte kayıt yok', 'clock')}
    </div>
  `;
}

function changeDailyLogDate(delta) {
  dailyLogDate = DateUtils.addDays(dailyLogDate, delta);
  renderDailyLog(document.getElementById('page-content'));
}

async function updateTopicOptions() {
  const studentId = document.getElementById('logStudent').value;
  const topicSelect = document.getElementById('logTopic');

  if (!studentId) {
    topicSelect.innerHTML = '<option value="">Önce öğrenci seçin</option>';
    return;
  }

  const assignedTopics = await DB.getAssignedTopics(parseInt(studentId));
  topicSelect.innerHTML = `
    <option value="">Konu seçin</option>
    ${assignedTopics.map(st => st.topic ? `
      <option value="${st.topicId}">${st.topic.examCategory} ${st.topic.subject} - ${st.topic.name}</option>
    ` : '').join('')}
  `;
}

async function saveStudyLog(event) {
  event.preventDefault();
  const studentId = parseInt(document.getElementById('logStudent').value);
  const topicId = parseInt(document.getElementById('logTopic').value);
  const durationMinutes = parseInt(document.getElementById('logDuration').value);
  const notes = document.getElementById('logNotes').value.trim();

  if (!studentId || !topicId || !durationMinutes) return;

  await DB.addStudyLog({
    studentId,
    topicId,
    date: dailyLogDate,
    durationMinutes,
    notes
  });

  document.getElementById('logDuration').value = '';
  document.getElementById('logNotes').value = '';

  UI.showToast('Kayıt eklendi');
  renderDailyLog(document.getElementById('page-content'));
}

async function deleteStudyLog(id) {
  const confirmed = await UI.confirm('Bu kaydı silmek istediğinize emin misiniz?');
  if (!confirmed) return;

  await DB.deleteStudyLog(id);
  UI.showToast('Kayıt silindi');
  renderDailyLog(document.getElementById('page-content'));
}