async function renderDashboard(container) {
  const today = DateUtils.today();
  const weekStart = DateUtils.getWeekStart(today);
  const { year, month } = DateUtils.getCurrentMonth();

  const [students, todayLogs, weekLogs, monthLogs] = await Promise.all([
    DB.getStudents(),
    DB.getStudyLogsByDate(today),
    DB.getStudyLogsByWeek(weekStart),
    DB.getStudyLogsByMonth(year, month)
  ]);

  const activeStudents = students.filter(s => s.active);
  const todayMinutes = todayLogs.reduce((sum, log) => sum + log.durationMinutes, 0);
  const weekMinutes = weekLogs.reduce((sum, log) => sum + log.durationMinutes, 0);
  const monthMinutes = monthLogs.reduce((sum, log) => sum + log.durationMinutes, 0);

  const topicGoal = await DB.getSetting('monthlyGoal') || 0;

  const tytDate = await DB.getSetting('tytDate') || '';
  const aytDate = await DB.getSetting('aytDate') || '';
  const lgsDate = await DB.getSetting('lgsDate') || '';

  const examDates = [
    { name: 'TYT', date: tytDate },
    { name: 'AYT', date: aytDate },
    { name: 'LGS', date: lgsDate }
  ].filter(e => e.date);

  const topics = await DB.getTopics();
  const topicMap = {};
  topics.forEach(t => topicMap[t.id] = t);
  const studentMap = {};
  students.forEach(s => studentMap[s.id] = s);

  const recentLogs = todayLogs.slice(-5).reverse();

  let goalPercentage = 0;
  if (topicGoal > 0) {
    goalPercentage = Math.min(100, (monthMinutes / (topicGoal * 60)) * 100);
  }

  container.innerHTML = `
    ${examDates.length > 0 ? `
      <div style="display: flex; gap: 8px; margin-bottom: 16px; overflow-x: auto; padding-bottom: 4px;">
        ${examDates.map(exam => {
          const days = Math.ceil((new Date(exam.date) - new Date(today)) / (1000 * 60 * 60 * 24));
          const color = days <= 30 ? 'var(--danger)' : days <= 90 ? 'var(--warning)' : 'var(--success)';
          return `
            <div style="min-width: 100px; background: var(--card); border-radius: 12px; padding: 12px; text-align: center; border: 2px solid ${color};">
              <div style="font-size: 12px; color: #6B7280;">${exam.name}</div>
              <div style="font-size: 24px; font-weight: 700; color: ${color};">${days > 0 ? days : 0}</div>
              <div style="font-size: 11px; color: #6B7280;">gün kaldı</div>
            </div>
          `;
        }).join('')}
      </div>
    ` : ''}

    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-value">${activeStudents.length}</div>
        <div class="stat-label">Öğrenci</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="font-size: 22px;">${DateUtils.formatMinutes(todayMinutes)}</div>
        <div class="stat-label">Bugün</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="font-size: 22px;">${DateUtils.formatMinutes(weekMinutes)}</div>
        <div class="stat-label">Bu Hafta</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="font-size: 22px;">${DateUtils.formatMinutes(monthMinutes)}</div>
        <div class="stat-label">${DateUtils.getMonthName(month)}</div>
      </div>
    </div>

    ${topicGoal > 0 ? `
      <div class="card" style="margin-top: 16px;">
        <div class="card-header">
          <span class="card-title">Aylık Hedef</span>
          <span style="font-size: 14px; font-weight: 600; color: ${goalPercentage >= 100 ? 'var(--success)' : 'var(--primary)'}">
            ${goalPercentage.toFixed(0)}%
          </span>
        </div>
        ${UI.renderProgressBar(goalPercentage, goalPercentage >= 100 ? 'var(--success)' : 'var(--primary)')}
        <div style="display: flex; justify-content: space-between; font-size: 12px; color: #6B7280; margin-top: 8px;">
          <span>${DateUtils.formatMinutes(monthMinutes)} çalışıldı</span>
          <span>Hedef: ${topicGoal} saat</span>
        </div>
      </div>
    ` : ''}

    <div class="card" style="margin-top: 16px;">
      <div class="card-header">
        <span class="card-title">Bugünkü Kayıtlar</span>
        <button class="btn btn-primary btn-sm" onclick="navigateTo('daily-log')">
          ${UI.createIcon('plus', 16)} Ekle
        </button>
      </div>
      ${recentLogs.length > 0 ? `
        <div>
          ${recentLogs.map(log => {
            const topic = topicMap[log.topicId];
            const student = studentMap[log.studentId];
            return `
              <div class="list-item">
                <div class="list-item-content">
                  <div class="list-item-title">${student ? student.name : 'Bilinmeyen'}</div>
                  <div class="list-item-subtitle">${topic ? `${topic.examCategory} ${topic.subject} - ${topic.name}` : 'Bilinmeyen konu'}</div>
                </div>
                <span class="badge badge-primary">${DateUtils.formatMinutes(log.durationMinutes)}</span>
              </div>
            `;
          }).join('')}
        </div>
      ` : UI.renderEmptyState('Bugün henüz kayıt yok', 'clock')}
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">Hızlı İşlemler</span>
      </div>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
        <button class="btn btn-outline" onclick="navigateTo('timer')" style="flex-direction: column; padding: 16px 8px;">
          ${UI.createIcon('clock', 24)}
          <span style="font-size: 11px; margin-top: 4px;">Zamanlayıcı</span>
        </button>
        <button class="btn btn-outline" onclick="navigateTo('students')" style="flex-direction: column; padding: 16px 8px;">
          ${UI.createIcon('users', 24)}
          <span style="font-size: 11px; margin-top: 4px;">Öğrenciler</span>
        </button>
        <button class="btn btn-outline" onclick="navigateTo('analysis')" style="flex-direction: column; padding: 16px 8px;">
          ${UI.createIcon('chart', 24)}
          <span style="font-size: 11px; margin-top: 4px;">Analiz</span>
        </button>
        <button class="btn btn-outline" onclick="navigateTo('topics')" style="flex-direction: column; padding: 16px 8px;">
          ${UI.createIcon('book', 24)}
          <span style="font-size: 11px; margin-top: 4px;">Konular</span>
        </button>
        <button class="btn btn-outline" onclick="navigateTo('weekly-plan')" style="flex-direction: column; padding: 16px 8px;">
          ${UI.createIcon('calendar', 24)}
          <span style="font-size: 11px; margin-top: 4px;">Planlama</span>
        </button>
        <button class="btn btn-outline" onclick="navigateTo('settings')" style="flex-direction: column; padding: 16px 8px;">
          ${UI.createIcon('settings', 24)}
          <span style="font-size: 11px; margin-top: 4px;">Ayarlar</span>
        </button>
      </div>
    </div>
  `;
}