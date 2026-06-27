let topicFilterCategory = 'all';
let topicFilterSubject = 'all';

async function renderTopics(container) {
  const topics = await DB.getTopics();
  const categories = [...new Set(topics.map(t => t.examCategory))];
  const subjects = [...new Set(topics.map(t => t.subject))];

  let filtered = topics;
  if (topicFilterCategory !== 'all') {
    filtered = filtered.filter(t => t.examCategory === topicFilterCategory);
  }
  if (topicFilterSubject !== 'all') {
    filtered = filtered.filter(t => t.subject === topicFilterSubject);
  }

  filtered.sort((a, b) => a.examCategory.localeCompare(b.examCategory) || a.subject.localeCompare(b.subject) || a.order - b.order);

  container.innerHTML = `
    <div style="display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap;">
      <select class="form-select" style="flex: 1; min-width: 120px;" onchange="topicFilterCategory=this.value; renderTopics(document.getElementById('page-content'))">
        <option value="all">Tüm Kategoriler</option>
        ${categories.map(cat => `
          <option value="${cat}" ${topicFilterCategory === cat ? 'selected' : ''}>${cat}</option>
        `).join('')}
      </select>
      <select class="form-select" style="flex: 1; min-width: 120px;" onchange="topicFilterSubject=this.value; renderTopics(document.getElementById('page-content'))">
        <option value="all">Tüm Dersler</option>
        ${subjects.map(sub => `
          <option value="${sub}" ${topicFilterSubject === sub ? 'selected' : ''}>${sub}</option>
        `).join('')}
      </select>
    </div>

    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <span style="font-size: 14px; color: #6B7280;">${filtered.length} konu</span>
      <button class="btn btn-primary" onclick="showAddTopicModal()">
        ${UI.createIcon('plus', 16)} Konu Ekle
      </button>
    </div>

    ${filtered.length > 0 ? `
      <div>
        ${filtered.map(topic => `
          <div class="card" style="padding: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="flex: 1;">
                <div style="font-weight: 500; font-size: 15px;">${topic.name}</div>
                <div style="margin-top: 4px;">
                  <span class="badge badge-primary">${topic.examCategory}</span>
                  <span class="badge badge-success" style="margin-left: 4px;">${topic.subject}</span>
                </div>
              </div>
              <div style="display: flex; gap: 8px;">
                <button class="btn btn-outline btn-sm" onclick="showEditTopicModal(${topic.id})" style="padding: 8px;">
                  ${UI.createIcon('edit', 16)}
                </button>
                <button class="btn btn-outline btn-sm" onclick="deleteTopic(${topic.id})" style="padding: 8px; color: var(--danger);">
                  ${UI.createIcon('trash', 16)}
                </button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    ` : UI.renderEmptyState('Bu kategoride konu bulunamadı', 'book')}
  `;
}

function showAddTopicModal() {
  const html = `
    <div style="padding: 20px;">
      <h3 style="margin: 0 0 20px 0; font-size: 18px;">Yeni Konu Ekle</h3>
      
      <div class="form-group">
        <label class="form-label">Sınav Kategorisi</label>
        <select class="form-select" id="topicCategory">
          <option value="TYT">TYT</option>
          <option value="AYT">AYT</option>
          <option value="LGS">LGS</option>
        </select>
      </div>
      
      <div class="form-group">
        <label class="form-label">Ders</label>
        <select class="form-select" id="topicSubject">
          <option value="Matematik">Matematik</option>
          <option value="Geometri">Geometri</option>
          <option value="Fizik">Fizik</option>
          <option value="Kimya">Kimya</option>
          <option value="Biyoloji">Biyoloji</option>
          <option value="Tarih">Tarih</option>
          <option value="Coğrafya">Coğrafya</option>
          <option value="Türkçe">Türkçe</option>
          <option value="Felsefe">Felsefe</option>
        </select>
      </div>
      
      <div class="form-group">
        <label class="form-label">Konu Adı</label>
        <input type="text" class="form-input" id="topicNameInput" placeholder="Örn: Türev, İntegral...">
      </div>
      
      <div style="display: flex; gap: 12px; margin-top: 24px;">
        <button class="btn btn-outline" style="flex: 1;" onclick="UI.closeModal()">İptal</button>
        <button class="btn btn-primary" style="flex: 1;" onclick="handleAddTopic()">Kaydet</button>
      </div>
    </div>
  `;
  
  UI.showModal('Yeni Konu', html);
  
  setTimeout(() => {
    const input = document.getElementById('topicNameInput');
    if (input) input.focus();
  }, 100);
}

async function handleAddTopic() {
  const examCategory = document.getElementById('topicCategory').value;
  const subject = document.getElementById('topicSubject').value;
  const name = document.getElementById('topicNameInput').value.trim();

  if (!name) {
    UI.showToast('Konu adı boş olamaz');
    return;
  }

  const existingTopics = await DB.getTopics();
  const maxOrder = existingTopics
    .filter(t => t.examCategory === examCategory && t.subject === subject)
    .reduce((max, t) => Math.max(max, t.order || 0), 0);

  await DB.addTopic({ examCategory, subject, name, order: maxOrder + 1 });
  UI.closeModal();
  UI.showToast('Konu eklendi');
  renderTopics(document.getElementById('page-content'));
}

async function showEditTopicModal(id) {
  const topic = await DB.topics.get(id);
  if (!topic) return;

  const html = `
    <div style="padding: 20px;">
      <h3 style="margin: 0 0 20px 0; font-size: 18px;">Konu Düzenle</h3>
      
      <div class="form-group">
        <label class="form-label">Sınav Kategorisi</label>
        <select class="form-select" id="editTopicCategory">
          <option value="TYT" ${topic.examCategory === 'TYT' ? 'selected' : ''}>TYT</option>
          <option value="AYT" ${topic.examCategory === 'AYT' ? 'selected' : ''}>AYT</option>
          <option value="LGS" ${topic.examCategory === 'LGS' ? 'selected' : ''}>LGS</option>
        </select>
      </div>
      
      <div class="form-group">
        <label class="form-label">Ders</label>
        <select class="form-select" id="editTopicSubject">
          <option value="Matematik" ${topic.subject === 'Matematik' ? 'selected' : ''}>Matematik</option>
          <option value="Geometri" ${topic.subject === 'Geometri' ? 'selected' : ''}>Geometri</option>
          <option value="Fizik" ${topic.subject === 'Fizik' ? 'selected' : ''}>Fizik</option>
          <option value="Kimya" ${topic.subject === 'Kimya' ? 'selected' : ''}>Kimya</option>
          <option value="Biyoloji" ${topic.subject === 'Biyoloji' ? 'selected' : ''}>Biyoloji</option>
          <option value="Tarih" ${topic.subject === 'Tarih' ? 'selected' : ''}>Tarih</option>
          <option value="Coğrafya" ${topic.subject === 'Coğrafya' ? 'selected' : ''}>Coğrafya</option>
          <option value="Türkçe" ${topic.subject === 'Türkçe' ? 'selected' : ''}>Türkçe</option>
          <option value="Felsefe" ${topic.subject === 'Felsefe' ? 'selected' : ''}>Felsefe</option>
        </select>
      </div>
      
      <div class="form-group">
        <label class="form-label">Konu Adı</label>
        <input type="text" class="form-input" id="editTopicNameInput" value="${topic.name}">
      </div>
      
      <div style="display: flex; gap: 12px; margin-top: 24px;">
        <button class="btn btn-outline" style="flex: 1;" onclick="UI.closeModal()">İptal</button>
        <button class="btn btn-primary" style="flex: 1;" onclick="handleUpdateTopic(${id})">Güncelle</button>
      </div>
    </div>
  `;
  
  UI.showModal('Konu Düzenle', html);
}

async function handleUpdateTopic(id) {
  const examCategory = document.getElementById('editTopicCategory').value;
  const subject = document.getElementById('editTopicSubject').value;
  const name = document.getElementById('editTopicNameInput').value.trim();

  if (!name) {
    UI.showToast('Konu adı boş olamaz');
    return;
  }

  await DB.updateTopic(id, { examCategory, subject, name });
  UI.closeModal();
  UI.showToast('Konu güncellendi');
  renderTopics(document.getElementById('page-content'));
}

async function deleteTopic(id) {
  const confirmed = await UI.confirm('Bu konuyu silmek istediğinize emin misiniz?');
  if (!confirmed) return;

  await DB.deleteTopic(id);
  UI.showToast('Konu silindi');
  renderTopics(document.getElementById('page-content'));
}