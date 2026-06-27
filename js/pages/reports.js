let reportYear = new Date().getFullYear();
let reportMonth = new Date().getMonth() + 1;
let reportStudentId = 'all';

async function renderReports(container) {
  const students = await DB.getStudents();
  const activeStudents = students.filter(s => s.active);
  const logs = await DB.getStudyLogsByMonth(reportYear, reportMonth);
  const topics = await DB.getTopics();

  const topicMap = {};
  topics.forEach(t => topicMap[t.id] = t);
  const studentMap = {};
  students.forEach(s => studentMap[s.id] = s);

  let filteredLogs = reportStudentId !== 'all'
    ? logs.filter(l => l.studentId === parseInt(reportStudentId))
    : logs;

  const totalMinutes = filteredLogs.reduce((sum, log) => sum + log.durationMinutes, 0);

  const byStudent = {};
  filteredLogs.forEach(log => {
    if (!byStudent[log.studentId]) {
      byStudent[log.studentId] = { minutes: 0, count: 0 };
    }
    byStudent[log.studentId].minutes += log.durationMinutes;
    byStudent[log.studentId].count++;
  });

  const byTopic = {};
  filteredLogs.forEach(log => {
    const topic = topicMap[log.topicId];
    if (!topic) return;
    const key = `${topic.examCategory}-${topic.subject}`;
    if (!byTopic[key]) {
      byTopic[key] = { category: topic.examCategory, subject: topic.subject, minutes: 0, count: 0 };
    }
    byTopic[key].minutes += log.durationMinutes;
    byTopic[key].count++;
  });

  const byWeek = {};
  filteredLogs.forEach(log => {
    const weekStart = DateUtils.getWeekStart(log.date);
    if (!byWeek[weekStart]) {
      byWeek[weekStart] = { minutes: 0, count: 0 };
    }
    byWeek[weekStart].minutes += log.durationMinutes;
    byWeek[weekStart].count++;
  });

  const weekEntries = Object.entries(byWeek).sort((a, b) => a[0].localeCompare(b[0]));

  container.innerHTML = `
    <div style="display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap;">
      <select class="form-select" style="flex: 1; min-width: 100px;" onchange="reportMonth=parseInt(this.value); renderReports(document.getElementById('page-content'))">
        ${Array.from({length: 12}, (_, i) => `
          <option value="${i+1}" ${reportMonth === i+1 ? 'selected' : ''}>${DateUtils.getMonthName(i+1)}</option>
        `).join('')}
      </select>
      <select class="form-select" style="flex: 1; min-width: 80px;" onchange="reportYear=parseInt(this.value); renderReports(document.getElementById('page-content'))">
        ${[2024, 2025, 2026, 2027].map(y => `
          <option value="${y}" ${reportYear === y ? 'selected' : ''}>${y}</option>
        `).join('')}
      </select>
      <select class="form-select" style="flex: 1; min-width: 120px;" onchange="reportStudentId=this.value; renderReports(document.getElementById('page-content'))">
        <option value="all">Tüm Öğrenciler</option>
        ${activeStudents.map(s => `
          <option value="${s.id}" ${reportStudentId == s.id ? 'selected' : ''}>${s.name}</option>
        `).join('')}
      </select>
    </div>

    <div class="stat-grid" style="grid-template-columns: repeat(2, 1fr);">
      <div class="stat-card">
        <div class="stat-value" style="font-size: 22px;">${DateUtils.formatMinutes(totalMinutes)}</div>
        <div class="stat-label">Toplam Süre</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="font-size: 22px;">${DateUtils.minutesToHours(totalMinutes)}</div>
        <div class="stat-label">Toplam Saat</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="font-size: 22px;">${filteredLogs.length}</div>
        <div class="stat-label">Toplam Kayıt</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="font-size: 22px;">${Object.keys(byStudent).length}</div>
        <div class="stat-label">Aktif Öğrenci</div>
      </div>
    </div>

    ${Object.keys(byStudent).length > 0 ? `
      <div class="card" style="margin-top: 16px;">
        <div class="card-header">
          <span class="card-title">Öğrenci Bazlı Dağılım</span>
        </div>
        ${Object.entries(byStudent).map(([studentId, data]) => {
          const student = studentMap[studentId];
          const percentage = totalMinutes > 0 ? (data.minutes / totalMinutes * 100) : 0;
          return `
            <div style="margin-bottom: 12px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="font-size: 14px; font-weight: 500;">${student ? student.name : 'Bilinmeyen'}</span>
                <span style="font-size: 13px; color: #6B7280;">${DateUtils.formatMinutes(data.minutes)} (${percentage.toFixed(0)}%)</span>
              </div>
              ${UI.renderProgressBar(percentage)}
            </div>
          `;
        }).join('')}
      </div>
    ` : ''}

    ${Object.keys(byTopic).length > 0 ? `
      <div class="card" style="margin-top: 16px;">
        <div class="card-header">
          <span class="card-title">Ders/Kategori Dağılımı</span>
        </div>
        ${Object.entries(byTopic).sort((a, b) => b[1].minutes - a[1].minutes).map(([key, data]) => {
          const percentage = totalMinutes > 0 ? (data.minutes / totalMinutes * 100) : 0;
          return `
            <div style="margin-bottom: 12px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="font-size: 14px; font-weight: 500;">
                  <span class="badge badge-primary">${data.category}</span>
                  <span style="margin-left: 4px;">${data.subject}</span>
                </span>
                <span style="font-size: 13px; color: #6B7280;">${DateUtils.formatMinutes(data.minutes)} (${percentage.toFixed(0)}%)</span>
              </div>
              ${UI.renderProgressBar(percentage, 'var(--success)')}
            </div>
          `;
        }).join('')}
      </div>
    ` : ''}

    ${weekEntries.length > 0 ? `
      <div class="card" style="margin-top: 16px;">
        <div class="card-header">
          <span class="card-title">Haftalık Kırılım</span>
        </div>
        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>Hafta</th>
                <th>Süre</th>
                <th>Kayıt</th>
              </tr>
            </thead>
            <tbody>
              ${weekEntries.map(([weekStart, data]) => `
                <tr>
                  <td style="font-size: 13px;">
                    ${DateUtils.formatShort(weekStart)}
                  </td>
                  <td>
                    <span class="badge badge-primary">${DateUtils.formatMinutes(data.minutes)}</span>
                  </td>
                  <td style="font-size: 12px; color: #6B7280;">${data.count} kayıt</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    ` : ''}

    ${filteredLogs.length === 0 ? UI.renderEmptyState('Bu dönem için kayıt bulunamadı', 'chart') : ''}
  `;
}