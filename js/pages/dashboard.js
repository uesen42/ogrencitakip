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

  const topics = await DB.getTopics();
  const topicMap = {};
  topics.forEach(t => topicMap[t.id] = t);
  const studentMap = {};
  students.forEach(s => studentMap[s.id] = s);

  const recentLogs = todayLogs.slice(-5).reverse();

  container.innerHTML = `
    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-value">${activeStudents.length}</div>
        <div class="stat-label">Aktif Öğrenci</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${DateUtils.formatMinutes(todayMinutes)}</div>
        <div class="stat-label">Bugün</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${DateUtils.formatMinutes(weekMinutes)}</div>
        <div class="stat-label">Bu Hafta</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${DateUtils.formatMinutes(monthMinutes)}</div>
        <div class="stat-label">${DateUtils.getMonthName(month)}</div>
      </div>
    </div>

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
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <button class="btn btn-outline" onclick="navigateTo('students')">
          ${UI.createIcon('users', 20)} Öğrenci Ekle
        </button>
        <button class="btn btn-outline" onclick="navigateTo('topics')">
          ${UI.createIcon('book', 20)} Konu Yönetimi
        </button>
        <button class="btn btn-outline" onclick="navigateTo('weekly-plan')">
          ${UI.createIcon('calendar', 20)} Haftalık Plan
        </button>
        <button class="btn btn-outline" onclick="navigateTo('reports')">
          ${UI.createIcon('chart', 20)} Raporlar
        </button>
      </div>
    </div>
  `;
}