let reportYear = new Date().getFullYear();
let reportMonth = new Date().getMonth() + 1;
let reportStudentId = 'all';

async function renderReports(container) {
  const students = await DB.getStudents();
  const activeStudents = students.filter(s => s.active);
  const logs = await DB.getStudyLogsByMonth(reportYear, reportMonth);
  const topics = await DB.getTopics();
  const allPlans = await db.weeklyPlans.toArray();

  const topicMap = {};
  topics.forEach(t => topicMap[t.id] = t);
  const studentMap = {};
  students.forEach(s => studentMap[s.id] = s);

  let filteredLogs = reportStudentId !== 'all'
    ? logs.filter(l => l.studentId === parseInt(reportStudentId))
    : logs;

  let filteredPlans = reportStudentId !== 'all'
    ? allPlans.filter(p => p.studentId === parseInt(reportStudentId))
    : allPlans;

  const monthStart = `${reportYear}-${String(reportMonth).padStart(2, '0')}-01`;
  const monthEnd = new Date(reportYear, reportMonth, 0).toISOString().split('T')[0];

  filteredPlans = filteredPlans.filter(p => p.weekStart >= monthStart && p.weekStart <= monthEnd);

  const totalMinutes = filteredLogs.reduce((sum, log) => sum + log.durationMinutes, 0);

  let totalPlannedMinutes = 0;
  filteredPlans.forEach(p => {
    if (p.plannedTopics) {
      p.plannedTopics.forEach(pt => { totalPlannedMinutes += pt.plannedMinutes || 0; });
    }
  });

  const byStudent = {};
  filteredLogs.forEach(log => {
    if (!byStudent[log.studentId]) {
      byStudent[log.studentId] = { minutes: 0, count: 0 };
    }
    byStudent[log.studentId].minutes += log.durationMinutes;
    byStudent[log.studentId].count++;
  });

  const byStudentPlanned = {};
  filteredPlans.forEach(p => {
    if (!byStudentPlanned[p.studentId]) {
      byStudentPlanned[p.studentId] = 0;
    }
    if (p.plannedTopics) {
      p.plannedTopics.forEach(pt => {
        byStudentPlanned[p.studentId] += pt.plannedMinutes || 0;
      });
    }
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

  const byDay = {};
  filteredLogs.forEach(log => {
    const dayName = DateUtils.getDayName(log.date);
    if (!byDay[dayName]) {
      byDay[dayName] = { minutes: 0, count: 0 };
    }
    byDay[dayName].minutes += log.durationMinutes;
    byDay[dayName].count++;
  });

  container.innerHTML = `
    <div style="display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap;">
      <select class="form-select" style="flex: 1; min-width: 90px;" onchange="reportMonth=parseInt(this.value); renderReports(document.getElementById('page-content'))">
        ${Array.from({length: 12}, (_, i) => `
          <option value="${i+1}" ${reportMonth === i+1 ? 'selected' : ''}>${DateUtils.getMonthName(i+1)}</option>
        `).join('')}
      </select>
      <select class="form-select" style="flex: 1; min-width: 70px;" onchange="reportYear=parseInt(this.value); renderReports(document.getElementById('page-content'))">
        ${[2024, 2025, 2026, 2027].map(y => `
          <option value="${y}" ${reportYear === y ? 'selected' : ''}>${y}</option>
        `).join('')}
      </select>
      <select class="form-select" style="flex: 1; min-width: 100px;" onchange="reportStudentId=this.value; renderReports(document.getElementById('page-content'))">
        <option value="all">Tüm Öğrenciler</option>
        ${activeStudents.map(s => `
          <option value="${s.id}" ${reportStudentId == s.id ? 'selected' : ''}>${s.name}</option>
        `).join('')}
      </select>
    </div>

    <div class="stat-grid" style="grid-template-columns: repeat(2, 1fr); margin-bottom: 16px;">
      <div class="stat-card">
        <div class="stat-value" style="font-size: 20px;">${DateUtils.formatMinutes(totalMinutes)}</div>
        <div class="stat-label">Gerçekleşen</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="font-size: 20px;">${DateUtils.formatMinutes(totalPlannedMinutes)}</div>
        <div class="stat-label">Planlanan</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="font-size: 20px;">${DateUtils.minutesToHours(totalMinutes)}</div>
        <div class="stat-label">Toplam Saat</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="font-size: 20px;">${filteredLogs.length}</div>
        <div class="stat-label">Toplam Kayıt</div>
      </div>
    </div>

    ${totalPlannedMinutes > 0 ? `
      <div class="card">
        <div class="card-header">
          <span class="card-title">Plan vs Gerçekleşme</span>
        </div>
        <div style="margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-size: 14px;">Oran</span>
            <span style="font-size: 14px; font-weight: 600; color: ${totalMinutes >= totalPlannedMinutes ? 'var(--success)' : 'var(--warning)'}">
              ${totalPlannedMinutes > 0 ? ((totalMinutes / totalPlannedMinutes) * 100).toFixed(0) : 0}%
            </span>
          </div>
          ${UI.renderProgressBar(totalPlannedMinutes > 0 ? (totalMinutes / totalPlannedMinutes * 100) : 0,
            totalMinutes >= totalPlannedMinutes ? 'var(--success)' : 'var(--warning)')}
        </div>
        <div style="font-size: 12px; color: #6B7280; text-align: center;">
          ${totalMinutes >= totalPlannedMinutes ? 'Tebrikler! Plan hedefine ulaşıldı.' : `Hedefe ${DateUtils.formatMinutes(totalPlannedMinutes - totalMinutes)} kaldı.`}
        </div>
      </div>
    ` : ''}

    ${Object.keys(byStudent).length > 0 ? `
      <div class="card" style="margin-top: 16px;">
        <div class="card-header">
          <span class="card-title">Öğrenci Bazlı Dağılım</span>
        </div>
        ${Object.entries(byStudent).map(([studentId, data]) => {
          const student = studentMap[studentId];
          const planned = byStudentPlanned[studentId] || 0;
          const percentage = totalMinutes > 0 ? (data.minutes / totalMinutes * 100) : 0;
          return `
            <div style="margin-bottom: 16px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="font-size: 14px; font-weight: 500;">${student ? student.name : 'Bilinmeyen'}</span>
                <span style="font-size: 13px; color: #6B7280;">${DateUtils.formatMinutes(data.minutes)}</span>
              </div>
              ${UI.renderProgressBar(percentage)}
              <div style="display: flex; justify-content: space-between; font-size: 11px; color: #9CA3AF; margin-top: 4px;">
                <span>${data.count} kayıt</span>
                ${planned > 0 ? `<span>Plan: ${DateUtils.formatMinutes(planned)} (${data.minutes >= planned ? '✓ tamamlandı' : DateUtils.formatMinutes(planned - data.minutes) + ' eksik'})</span>` : ''}
              </div>
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

    ${Object.keys(byDay).length > 0 ? `
      <div class="card" style="margin-top: 16px;">
        <div class="card-header">
          <span class="card-title">Gün Bazlı Dağılım</span>
        </div>
        ${Object.entries(byDay).map(([day, data]) => {
          const percentage = totalMinutes > 0 ? (data.minutes / totalMinutes * 100) : 0;
          return `
            <div style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 13px; width: 100px;">${day}</span>
              <div style="flex: 1; margin: 0 12px;">
                ${UI.renderProgressBar(percentage, 'var(--primary)')}
              </div>
              <span style="font-size: 12px; color: #6B7280; width: 60px; text-align: right;">${DateUtils.formatMinutes(data.minutes)}</span>
            </div>
          `;
        }).join('')}
      </div>
    ` : ''}

    ${filteredLogs.length === 0 && totalPlannedMinutes === 0 ? UI.renderEmptyState('Bu dönem için kayıt bulunamadı', 'chart') : ''}
  `;
}