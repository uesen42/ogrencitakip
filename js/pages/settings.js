async function renderSettings(container) {
  const defaultDuration = await DB.getSetting('defaultDuration') || 60;
  const weekStartDay = await DB.getSetting('weekStartDay') || 1;
  const theme = await DB.getSetting('theme') || 'light';

  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <span class="card-title">Genel Ayarlar</span>
      </div>

      <div class="form-group">
        <label class="form-label">Varsayılan Ders Süresi (dakika)</label>
        <input type="number" class="form-input" id="settingDuration" value="${defaultDuration}" min="5" max="300">
      </div>

      <div class="form-group">
        <label class="form-label">Hafta Başlangıç Günü</label>
        <select class="form-select" id="settingWeekStart">
          <option value="1" ${weekStartDay == 1 ? 'selected' : ''}>Pazartesi</option>
          <option value="0" ${weekStartDay == 0 ? 'selected' : ''}>Pazar</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Tema</label>
        <select class="form-select" id="settingTheme">
          <option value="light" ${theme === 'light' ? 'selected' : ''}>Açık Tema</option>
          <option value="dark" ${theme === 'dark' ? 'selected' : ''}>Koyu Tema</option>
        </select>
      </div>

      <button class="btn btn-primary btn-block" onclick="saveSettings()">
        ${UI.createIcon('check', 16)} Ayarları Kaydet
      </button>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">Veri Yönetimi</span>
      </div>

      <div style="display: grid; gap: 12px;">
        <button class="btn btn-outline btn-block" onclick="exportData()">
          ${UI.createIcon('download', 16)} Verileri Dışa Aktar (JSON)
        </button>
        <button class="btn btn-outline btn-block" onclick="importData()">
          ${UI.createIcon('upload', 16)} Veri İçe Aktar
        </button>
        <button class="btn btn-danger btn-block" onclick="resetData()">
          ${UI.createIcon('trash', 16)} Tüm Verileri Sıfırla
        </button>
      </div>

      <input type="file" id="importFile" accept=".json" style="display: none;" onchange="handleImport(event)">
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">Hakkında</span>
      </div>
      <div style="font-size: 14px; color: #6B7280; line-height: 1.6;">
        <p style="margin: 0 0 8px 0;"><strong>Öğrenci Takip</strong> v1.0</p>
        <p style="margin: 0 0 8px 0;">TYT/AYT/LGS öğrenci takip uygulaması</p>
        <p style="margin: 0;">Veriler cihazınızda yerel olarak saklanır.</p>
      </div>
    </div>
  `;
}

async function saveSettings() {
  const defaultDuration = parseInt(document.getElementById('settingDuration').value);
  const weekStartDay = parseInt(document.getElementById('settingWeekStart').value);
  const theme = document.getElementById('settingTheme').value;

  await DB.setSetting('defaultDuration', defaultDuration);
  await DB.setSetting('weekStartDay', weekStartDay);
  await DB.setSetting('theme', theme);

  UI.showToast('Ayarlar kaydedildi');
}

async function exportData() {
  const data = {
    students: await DB.getStudents(),
    topics: await DB.getTopics(),
    studentTopics: await db.studentTopics.toArray(),
    studyLogs: await db.studyLogs.toArray(),
    weeklyPlans: await db.weeklyPlans.toArray(),
    exportDate: new Date().toISOString()
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ogrenci-takip-${DateUtils.today()}.json`;
  a.click();
  URL.revokeObjectURL(url);

  UI.showToast('Veriler dışa aktarıldı');
}

function importData() {
  document.getElementById('importFile').click();
}

async function handleImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    const confirmed = await UI.confirm('Mevcut verilerin üzerine yazılacak. Devam etmek istiyor musunuz?');
    if (!confirmed) return;

    await db.transaction('rw', db.students, db.topics, db.studentTopics, db.studyLogs, db.weeklyPlans, async () => {
      await db.students.clear();
      await db.topics.clear();
      await db.studentTopics.clear();
      await db.studyLogs.clear();
      await db.weeklyPlans.clear();

      if (data.students) await db.students.bulkAdd(data.students);
      if (data.topics) await db.topics.bulkAdd(data.topics);
      if (data.studentTopics) await db.studentTopics.bulkAdd(data.studentTopics);
      if (data.studyLogs) await db.studyLogs.bulkAdd(data.studyLogs);
      if (data.weeklyPlans) await db.weeklyPlans.bulkAdd(data.weeklyPlans);
    });

    UI.showToast('Veriler içe aktarıldı');
    navigateTo('settings');
  } catch (error) {
    UI.showToast('Hata: Geçersiz dosya formatı');
  }

  event.target.value = '';
}

async function resetData() {
  const confirmed = await UI.confirm('TÜM VERİLER SİLİNECEK! Bu işlem geri alınamaz. Devam etmek istiyor musunuz?');
  if (!confirmed) return;

  const doubleConfirm = await UI.confirm('Emin misiniz? Tüm öğrenci, konu ve kayıt verileri silinecektir.');
  if (!doubleConfirm) return;

  await db.transaction('rw', db.students, db.topics, db.studentTopics, db.studyLogs, db.weeklyPlans, async () => {
    await db.students.clear();
    await db.topics.clear();
    await db.studentTopics.clear();
    await db.studyLogs.clear();
    await db.weeklyPlans.clear();
  });

  await DB.initDefaultTopics();
  UI.showToast('Tüm veriler sıfırlandı');
  navigateTo('dashboard');
}