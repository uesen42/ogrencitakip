let analysisStudentId = 'all';

async function renderAnalysis(container) {
  const students = await DB.getStudents();
  const activeStudents = students.filter(s => s.active);
  const allLogs = await db.studyLogs.toArray();
  const topics = await DB.getTopics();

  const topicMap = {};
  topics.forEach(t => topicMap[t.id] = t);

  let filteredLogs = analysisStudentId !== 'all'
    ? allLogs.filter(l => l.studentId === parseInt(analysisStudentId))
    : allLogs;

  const topicStats = {};
  filteredLogs.forEach(log => {
    const topic = topicMap[log.topicId];
    if (!topic) return;
    const key = `${topic.examCategory}|${topic.subject}|${topic.name}`;
    if (!topicStats[key]) {
      topicStats[key] = {
        examCategory: topic.examCategory,
        subject: topic.subject,
        name: topic.name,
        totalMinutes: 0,
        logCount: 0,
        lastDate: null
      };
    }
    topicStats[key].totalMinutes += log.durationMinutes;
    topicStats[key].logCount++;
    if (!topicStats[key].lastDate || log.date > topicStats[key].lastDate) {
      topicStats[key].lastDate = log.date;
    }
  });

  const allTopicStats = Object.values(topicStats);
  allTopicStats.sort((a, b) => b.totalMinutes - a.totalMinutes);

  const studied = allTopicStats.filter(t => t.totalMinutes > 0);
  const unstudied = topics.filter(t => {
    if (analysisStudentId !== 'all') {
      return !allTopicStats.find(s => s.name === t.name && s.examCategory === t.examCategory);
    }
    return !allTopicStats.find(s => s.name === t.name && s.examCategory === t.examCategory);
  });

  const totalMinutes = filteredLogs.reduce((sum, log) => sum + log.durationMinutes, 0);
  const avgMinutes = studied.length > 0 ? Math.round(totalMinutes / studied.length) : 0;

  const weakTopics = studied.filter(t => t.totalMinutes < avgMinutes * 0.5).slice(0, 5);
  const strongTopics = studied.slice(0, 5);

  const bySubject = {};
  allTopicStats.forEach(t => {
    const key = `${t.examCategory} - ${t.subject}`;
    if (!bySubject[key]) bySubject[key] = { minutes: 0, count: 0, topicCount: 0 };
    bySubject[key].minutes += t.totalMinutes;
    bySubject[key].count += t.logCount;
    bySubject[key].topicCount++;
  });

  container.innerHTML = `
    <div style="margin-bottom: 16px;">
      <select class="form-select" onchange="analysisStudentId=this.value; renderAnalysis(document.getElementById('page-content'))">
        <option value="all">Tüm Öğrenciler</option>
        ${activeStudents.map(s => `
          <option value="${s.id}" ${analysisStudentId == s.id ? 'selected' : ''}>${s.name}</option>
        `).join('')}
      </select>
    </div>

    <div class="stat-grid" style="grid-template-columns: repeat(2, 1fr); margin-bottom: 16px;">
      <div class="stat-card">
        <div class="stat-value" style="font-size: 22px;">${studied.length}</div>
        <div class="stat-label">Çalışılan Konu</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="font-size: 22px;">${unstudied.length}</div>
        <div class="stat-label">Çalışılmayan Konu</div>
      </div>
    </div>

    ${weakTopics.length > 0 ? `
      <div class="card">
        <div class="card-header">
          <span class="card-title" style="color: var(--danger);">Zayıf Konular</span>
        </div>
        ${weakTopics.map((t, i) => `
          <div class="list-item" style="padding: 8px 0;">
            <div style="width: 28px; height: 28px; border-radius: 50%; background: rgba(239,68,68,0.1); color: var(--danger); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; margin-right: 12px;">
              ${i + 1}
            </div>
            <div class="list-item-content">
              <div class="list-item-title" style="font-size: 14px;">${t.name}</div>
              <div class="list-item-subtitle">
                <span class="badge badge-primary">${t.examCategory}</span>
                <span style="margin-left: 4px;">${DateUtils.formatMinutes(t.totalMinutes)} - ${t.logCount} kayıt</span>
              </div>
            </div>
          </div>
        `).join('')}
        <div style="font-size: 12px; color: #6B7280; margin-top: 8px;">
          Bu konulara daha fazla zaman ayırmanız önerilir.
        </div>
      </div>
    ` : ''}

    ${strongTopics.length > 0 ? `
      <div class="card" style="margin-top: 16px;">
        <div class="card-header">
          <span class="card-title" style="color: var(--success);">En Çok Çalışılan Konular</span>
        </div>
        ${strongTopics.map((t, i) => `
          <div class="list-item" style="padding: 8px 0;">
            <div style="width: 28px; height: 28px; border-radius: 50%; background: rgba(16,185,129,0.1); color: var(--success); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; margin-right: 12px;">
              ${i + 1}
            </div>
            <div class="list-item-content">
              <div class="list-item-title" style="font-size: 14px;">${t.name}</div>
              <div class="list-item-subtitle">
                <span class="badge badge-primary">${t.examCategory}</span>
                <span style="margin-left: 4px;">${DateUtils.formatMinutes(t.totalMinutes)} - ${t.logCount} kayıt</span>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    ` : ''}

    ${Object.keys(bySubject).length > 0 ? `
      <div class="card" style="margin-top: 16px;">
        <div class="card-header">
          <span class="card-title">Ders Bazlı Özet</span>
        </div>
        ${Object.entries(bySubject).sort((a, b) => b[1].minutes - a[1].minutes).map(([key, data]) => {
          const percentage = totalMinutes > 0 ? (data.minutes / totalMinutes * 100) : 0;
          return `
            <div style="margin-bottom: 12px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="font-size: 14px; font-weight: 500;">${key}</span>
                <span style="font-size: 13px; color: #6B7280;">${DateUtils.formatMinutes(data.minutes)} (${percentage.toFixed(0)}%)</span>
              </div>
              ${UI.renderProgressBar(percentage)}
              <div style="font-size: 11px; color: #9CA3AF; margin-top: 2px;">${data.topicCount} konu - ${data.count} kayıt</div>
            </div>
          `;
        }).join('')}
      </div>
    ` : ''}

    ${unstudied.length > 0 ? `
      <div class="card" style="margin-top: 16px;">
        <div class="card-header">
          <span class="card-title">Çalışılmayan Konular (${unstudied.length})</span>
        </div>
        <div style="max-height: 300px; overflow-y: auto;">
          ${unstudied.map(t => `
            <div class="list-item" style="padding: 6px 0;">
              <div class="list-item-content">
                <div class="list-item-title" style="font-size: 13px;">${t.name}</div>
                <div class="list-item-subtitle" style="font-size: 11px;">
                  <span class="badge badge-primary">${t.examCategory}</span>
                  <span style="margin-left: 4px;">${t.subject}</span>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}

    ${allTopicStats.length === 0 ? UI.renderEmptyState('Henüz çalışma kaydı yok', 'chart') : ''}
  `;
}