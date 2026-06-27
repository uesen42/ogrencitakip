let currentPage = 'dashboard';

const pages = {
  dashboard: { render: renderDashboard, title: 'Anasayfa' },
  students: { render: renderStudents, title: 'Öğrenciler' },
  topics: { render: renderTopics, title: 'Konu Yönetimi' },
  'daily-log': { render: renderDailyLog, title: 'Günlük Takip' },
  'weekly-plan': { render: renderWeeklyPlan, title: 'Haftalık Planlama' },
  reports: { render: renderReports, title: 'Aylık Rapor' },
  settings: { render: renderSettings, title: 'Ayarlar' }
};

function navigateTo(page, params = {}) {
  currentPage = page;
  window.location.hash = page;

  const app = document.getElementById('app');
  const pageConfig = pages[page];

  if (pageConfig) {
    document.title = `${pageConfig.title} - Öğrenci Takip`;
    app.innerHTML = `
      <div class="app-container">
        <header class="header">
          <h1>${pageConfig.title}</h1>
        </header>
        <main class="content" id="page-content"></main>
        ${UI.renderNavbar(page)}
      </div>
    `;
    pageConfig.render(document.getElementById('page-content'), params);
  }
}

function initApp() {
  const hash = window.location.hash.slice(1) || 'dashboard';
  navigateTo(hash);

  window.addEventListener('hashchange', () => {
    const newHash = window.location.hash.slice(1) || 'dashboard';
    if (newHash !== currentPage) {
      navigateTo(newHash);
    }
  });

  DB.initDefaultTopics();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').then(reg => {
      console.log('Service Worker registered');
    }).catch(err => {
      console.log('Service Worker registration failed:', err);
    });
  }
}

document.addEventListener('DOMContentLoaded', initApp);