let studentSearchQuery = '';

async function renderStudents(container) {
  const students = await DB.getStudents();
  const filtered = studentSearchQuery
    ? students.filter(s => s.name.toLowerCase().includes(studentSearchQuery.toLowerCase()))
    : students;

  const topics = await DB.getTopics();
  const topicMap = {};
  topics.forEach(t => topicMap[t.id] = t);

  container.innerHTML = `
    <div class="search-box">
      ${UI.createIcon('search')}
      <input type="text" placeholder="Öğrenci ara..." value="${studentSearchQuery}"
             oninput="studentSearchQuery = this.value; renderStudents(document.getElementById('page-content'))">
    </div>

    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <span style="font-size: 14px; color: #6B7280;">${filtered.length} öğrenci</span>
      <button class="btn btn-primary btn-sm" onclick="showAddStudentModal()">
        ${UI.createIcon('plus', 16)} Yeni Öğrenci
      </button>
    </div>

    ${filtered.length > 0 ? `
      <div>
        ${filtered.map(student => `
          <div class="card" style="cursor: pointer;" onclick="showStudentDetail(${student.id})">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div class="list-item-title" style="font-size: 16px;">${student.name}</div>
                <div class="list-item-subtitle">
                  <span class="badge badge-${getExamBadgeColor(student.examType)}">${student.examType}</span>
                  <span style="margin-left: 8px; color: ${student.active ? 'var(--success)' : 'var(--danger)'}">
                    ${student.active ? 'Aktif' : 'Pasif'}
                  </span>
                </div>
              </div>
              <div style="display: flex; gap: 8px;">
                <button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); showEditStudentModal(${student.id})">
                  ${UI.createIcon('edit', 16)}
                </button>
                <button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); deleteStudent(${student.id})" style="color: var(--danger);">
                  ${UI.createIcon('trash', 16)}
                </button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    ` : UI.renderEmptyState('Henüz öğrenci eklenmemiş', 'users')}
  `;
}

function getExamBadgeColor(examType) {
  const colors = {
    'TYT': 'primary',
    'AYT': 'success',
    'LGS': 'warning',
    'KARMA': 'danger'
  };
  return colors[examType] || 'primary';
}

function showAddStudentModal() {
  const content = `
    <form id="studentForm" onsubmit="saveStudent(event)">
      <div class="form-group">
        <label class="form-label">Öğrenci Adı</label>
        <input type="text" class="form-input" id="studentName" required placeholder="Ad Soyad">
      </div>
      <div class="form-group">
        <label class="form-label">Sınav Türü</label>
        <select class="form-select" id="examType" required>
          <option value="TYT">TYT</option>
          <option value="AYT">AYT</option>
          <option value="LGS">LGS</option>
          <option value="KARMA">KARMA (Birden Fazla)</option>
        </select>
      </div>
    </form>
  `;

  const footer = `
    <button class="btn btn-outline" onclick="UI.closeModal()">İptal</button>
    <button class="btn btn-primary" onclick="document.getElementById('studentForm').dispatchEvent(new Event('submit'))">Kaydet</button>
  `;

  UI.showModal('Yeni Öğrenci', content, footer);
}

async function saveStudent(event) {
  event.preventDefault();
  const name = document.getElementById('studentName').value.trim();
  const examType = document.getElementById('examType').value;

  if (!name) return;

  await DB.addStudent({ name, examType });
  UI.closeModal();
  UI.showToast('Öğrenci eklendi');
  renderStudents(document.getElementById('page-content'));
}

async function showEditStudentModal(id) {
  const student = await DB.getStudent(id);
  if (!student) return;

  const content = `
    <form id="editStudentForm" onsubmit="updateStudent(event, ${id})">
      <div class="form-group">
        <label class="form-label">Öğrenci Adı</label>
        <input type="text" class="form-input" id="editStudentName" required value="${student.name}">
      </div>
      <div class="form-group">
        <label class="form-label">Sınav Türü</label>
        <select class="form-select" id="editExamType" required>
          <option value="TYT" ${student.examType === 'TYT' ? 'selected' : ''}>TYT</option>
          <option value="AYT" ${student.examType === 'AYT' ? 'selected' : ''}>AYT</option>
          <option value="LGS" ${student.examType === 'LGS' ? 'selected' : ''}>LGS</option>
          <option value="KARMA" ${student.examType === 'KARMA' ? 'selected' : ''}>KARMA</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Durum</label>
        <select class="form-select" id="editStudentActive">
          <option value="1" ${student.active ? 'selected' : ''}>Aktif</option>
          <option value="0" ${!student.active ? 'selected' : ''}>Pasif</option>
        </select>
      </div>
    </form>
  `;

  const footer = `
    <button class="btn btn-outline" onclick="UI.closeModal()">İptal</button>
    <button class="btn btn-primary" onclick="document.getElementById('editStudentForm').dispatchEvent(new Event('submit'))">Güncelle</button>
  `;

  UI.showModal('Öğrenci Düzenle', content, footer);
}

async function updateStudent(event, id) {
  event.preventDefault();
  const name = document.getElementById('editStudentName').value.trim();
  const examType = document.getElementById('editExamType').value;
  const active = document.getElementById('editStudentActive').value === '1';

  if (!name) return;

  await DB.updateStudent(id, { name, examType, active });
  UI.closeModal();
  UI.showToast('Öğrenci güncellendi');
  renderStudents(document.getElementById('page-content'));
}

async function deleteStudent(id) {
  const confirmed = await UI.confirm('Bu öğrenciyi silmek istediğinize emin misiniz? Tüm ilişkili veriler silinecektir.');
  if (!confirmed) return;

  await DB.deleteStudent(id);
  UI.showToast('Öğrenci silindi');
  renderStudents(document.getElementById('page-content'));
}

async function showStudentDetail(id) {
  const student = await DB.getStudent(id);
  if (!student) return;

  const assignedTopics = await DB.getAssignedTopics(id);
  const logs = await DB.getStudyLogsByStudent(id);
  const totalMinutes = logs.reduce((sum, log) => sum + log.durationMinutes, 0);

  const topics = await DB.getTopics();
  const categories = [...new Set(topics.map(t => t.examCategory))];

  const content = `
    <div style="margin-bottom: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span class="badge badge-${getExamBadgeColor(student.examType)}">${student.examType}</span>
        <span style="color: ${student.active ? 'var(--success)' : 'var(--danger)'}; font-size: 14px;">
          ${student.active ? 'Aktif' : 'Pasif'}
        </span>
      </div>
      <div style="margin-top: 12px;">
        <div style="font-size: 14px; color: #6B7280;">Toplam Çalışma</div>
        <div style="font-size: 24px; font-weight: 600;">${DateUtils.formatMinutes(totalMinutes)}</div>
      </div>
      <div style="margin-top: 12px;">
        <div style="font-size: 14px; color: #6B7280;">Toplam Kayıt</div>
        <div style="font-size: 24px; font-weight: 600;">${logs.length}</div>
      </div>
    </div>

    <div style="margin-bottom: 16px;">
      <h3 style="font-size: 14px; font-weight: 600; margin-bottom: 12px;">Atanan Konular</h3>
      ${assignedTopics.length > 0 ? `
        <div>
          ${assignedTopics.map(st => `
            <div class="list-item" style="padding: 8px 0;">
              <div class="list-item-content">
                <div class="list-item-title" style="font-size: 13px;">
                  ${st.topic ? `${st.topic.name}` : 'Bilinmeyen'}
                </div>
                <div class="list-item-subtitle">${st.topic ? `${st.topic.examCategory} - ${st.topic.subject}` : ''}</div>
              </div>
              ${st.completedAt ? `
                <span class="badge badge-success">Tamamlandı</span>
              ` : `
                <button class="btn btn-sm btn-outline" onclick="completeStudentTopic(${id}, ${st.topicId})">Tamamla</button>
              `}
            </div>
          `).join('')}
        </div>
      ` : '<p style="color: #6B7280; font-size: 14px;">Henüz konu atanmamış</p>'}
    </div>

    <button class="btn btn-primary btn-block" onclick="UI.closeModal(); navigateTo('students'); showAssignTopicsModal(${id});">
      Konu Ata / Düzenle
    </button>
  `;

  UI.showModal(student.name, content, `
    <button class="btn btn-outline" onclick="UI.closeModal()">Kapat</button>
  `);
}

async function completeStudentTopic(studentId, topicId) {
  await DB.completeTopic(studentId, topicId);
  UI.showToast('Konu tamamlandı olarak işaretlendi');
  UI.closeModal();
  setTimeout(() => showStudentDetail(studentId), 100);
}

async function showAssignTopicsModal(studentId) {
  const student = await DB.getStudent(studentId);
  if (!student) return;

  const allTopics = await DB.getTopics();
  const assignedRecords = await DB.getStudentTopics(studentId);
  const assignedMap = {};
  assignedRecords.forEach(r => assignedMap[r.topicId] = r.isAssigned);

  const categories = [...new Set(allTopics.map(t => t.examCategory))];
  const subjects = [...new Set(allTopics.map(t => t.subject))];

  let selectedCategory = categories[0];

  function renderTopicList() {
    const filtered = allTopics.filter(t => t.examCategory === selectedCategory);
    const topicList = document.getElementById('topicList');
    if (topicList) {
      topicList.innerHTML = filtered.map(topic => `
        <div class="list-item" style="padding: 8px 0;">
          <div class="list-item-content">
            <div class="list-item-title" style="font-size: 13px;">${topic.name}</div>
            <div class="list-item-subtitle">${topic.subject}</div>
          </div>
          <label class="switch">
            <input type="checkbox" ${assignedMap[topic.id] ? 'checked' : ''}
                   onchange="toggleTopicAssignment(${studentId}, ${topic.id}, this.checked)">
            <span class="slider"></span>
          </label>
        </div>
      `).join('');
    }
  }

  const content = `
    <div class="tabs">
      ${categories.map(cat => `
        <button class="tab ${cat === selectedCategory ? 'active' : ''}"
                onclick="selectedCategory='${cat}'; this.parentElement.querySelectorAll('.tab').forEach(t=>t.classList.remove('active')); this.classList.add('active'); renderTopicList();">
          ${cat}
        </button>
      `).join('')}
    </div>
    <div id="topicList"></div>
  `;

  UI.showModal(`${student.name} - Konu Ata`, content, `
    <button class="btn btn-primary" onclick="UI.closeModal(); renderStudents(document.getElementById('page-content'));">Bitti</button>
  `);

  renderTopicList();
}

async function toggleTopicAssignment(studentId, topicId, isAssigned) {
  await DB.assignTopicToStudent(studentId, topicId, isAssigned);
}