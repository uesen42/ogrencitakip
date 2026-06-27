let weeklyPlanWeekStart = DateUtils.getWeekStart(DateUtils.today());

async function renderWeeklyPlan(container) {
  const students = await DB.getStudents();
  const activeStudents = students.filter(s => s.active);
  const weekDays = DateUtils.getWeekDays(weeklyPlanWeekStart);
  const weekEnd = DateUtils.getWeekEnd(weeklyPlanWeekStart);

  const allLogs = await Promise.all(
    weekDays.map(day => DB.getStudyLogsByDate(day.date))
  );

  const allPlans = await DB.getWeeklyPlansByWeek(weeklyPlanWeekStart);
  const topics = await DB.getTopics();
  const topicMap = {};
  topics.forEach(t => topicMap[t.id] = t);
  const studentMap = {};
  students.forEach(s => studentMap[s.id] = s);

  const dayTotals = weekDays.map((day, i) => ({
    ...day,
    totalMinutes: allLogs[i].reduce((sum, log) => sum + log.durationMinutes, 0),
    logCount: allLogs[i].length
  }));

  const weekTotalMinutes = dayTotals.reduce((sum, day) => sum + day.totalMinutes, 0);

  let plannedTotalMinutes = 0;
  allPlans.forEach(p => {
    if (p.plannedTopics) {
      p.plannedTopics.forEach(pt => { plannedTotalMinutes += pt.plannedMinutes || 0; });
    }
  });

  container.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
      <button class="btn btn-outline btn-sm" onclick="changeWeeklyPlanWeek(-1)">
        ${UI.createIcon('chevronLeft', 20)}
      </button>
      <div style="flex: 1; text-align: center;">
        <div style="font-weight: 600; font-size: 14px;">
          ${DateUtils.formatShort(weeklyPlanWeekStart)} - ${DateUtils.formatShort(weekEnd)}
        </div>
      </div>
      <button class="btn btn-outline btn-sm" onclick="changeWeeklyPlanWeek(1)">
        ${UI.createIcon('chevronRight', 20)}
      </button>
    </div>

    <div class="stat-grid" style="grid-template-columns: repeat(2, 1fr); margin-bottom: 16px;">
      <div class="stat-card">
        <div class="stat-value" style="font-size: 20px;">${DateUtils.formatMinutes(plannedTotalMinutes)}</div>
        <div class="stat-label">Planlanan</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="font-size: 20px;">${DateUtils.formatMinutes(weekTotalMinutes)}</div>
        <div class="stat-label">Gerçekleşen</div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">Haftalık Plan Oluştur</span>
      </div>
      <div class="form-group">
        <label class="form-label">Öğrenci</label>
        <select class="form-select" id="planStudent" onchange="loadStudentPlan()">
          <option value="">Öğrenci seçin</option>
          ${activeStudents.map(s => `
            <option value="${s.id}">${s.name} (${s.examType})</option>
          `).join('')}
        </select>
      </div>

      <div id="planDays" style="display: none;">
        ${weekDays.map(day => `
          <div class="form-group" style="background: ${day.isToday ? 'rgba(59, 130, 246, 0.05)' : 'transparent'}; padding: 12px; border-radius: 8px; border: 1px solid ${day.isToday ? 'var(--primary)' : 'var(--border)'};">
            <label class="form-label" style="display: flex; justify-content: space-between;">
              <span>${day.dayName} (${day.dayShort} ${day.dayNum})</span>
              <span style="font-size: 12px; color: #6B7280;" id="planDayTotal_${day.date}">0 dk</span>
            </label>
            <div id="planDayTopics_${day.date}"></div>
            <button type="button" class="btn btn-outline btn-sm" style="margin-top: 8px;" onclick="addPlanTopic('${day.date}')">
              ${UI.createIcon('plus', 14)} Konu Ekle
            </button>
          </div>
        `).join('')}

        <div class="form-group">
          <label class="form-label">Notlar</label>
          <textarea class="form-textarea" id="planNotes" placeholder="Haftalık notlar..."></textarea>
        </div>

        <button class="btn btn-primary btn-block" onclick="handleSaveWeeklyPlan()">
          ${UI.createIcon('check', 16)} Planı Kaydet
        </button>
      </div>
    </div>

    <div class="card" style="margin-top: 16px;">
      <div class="card-header">
        <span class="card-title">Haftalık Görünüm</span>
      </div>
      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>Gün</th>
              <th>Planlanan</th>
              <th>Gerçekleşen</th>
            </tr>
          </thead>
          <tbody>
            ${dayTotals.map(day => {
              let plannedDayMinutes = 0;
              allPlans.forEach(p => {
                if (p.plannedTopics) {
                  p.plannedTopics.forEach(pt => {
                    if (pt.date === day.date) plannedDayMinutes += pt.plannedMinutes || 0;
                  });
                }
              });
              return `
                <tr style="${day.isToday ? 'background: rgba(59, 130, 246, 0.05);' : ''}">
                  <td>
                    <div style="font-weight: ${day.isToday ? '600' : '400'};">${day.dayName}</div>
                    <div style="font-size: 11px; color: #6B7280;">${day.dayShort} ${day.dayNum}</div>
                  </td>
                  <td>
                    <span class="badge badge-primary">${plannedDayMinutes > 0 ? DateUtils.formatMinutes(plannedDayMinutes) : '-'}</span>
                  </td>
                  <td>
                    <span class="badge ${day.totalMinutes > 0 ? 'badge-success' : 'badge-warning'}">
                      ${day.totalMinutes > 0 ? DateUtils.formatMinutes(day.totalMinutes) : '-'}
                    </span>
                  </td>
                </tr>
              `;
            }).join('')}
            <tr style="font-weight: 600; background: #F9FAFB;">
              <td>Toplam</td>
              <td><span class="badge badge-primary">${DateUtils.formatMinutes(plannedTotalMinutes)}</span></td>
              <td><span class="badge badge-success">${DateUtils.formatMinutes(weekTotalMinutes)}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    ${allPlans.length > 0 ? `
      <div class="card" style="margin-top: 16px;">
        <div class="card-header">
          <span class="card-title">Kayıtlı Planlar</span>
        </div>
        ${allPlans.map(p => {
          const student = studentMap[p.studentId];
          const totalPlanned = p.plannedTopics ? p.plannedTopics.reduce((s, pt) => s + (pt.plannedMinutes || 0), 0) : 0;
          return `
            <div class="list-item">
              <div class="list-item-content">
                <div class="list-item-title">${student ? student.name : 'Bilinmeyen'}</div>
                <div class="list-item-subtitle">${p.plannedTopics ? p.plannedTopics.length : 0} konu - ${DateUtils.formatMinutes(totalPlanned)}</div>
              </div>
              <button class="btn btn-outline btn-sm" onclick="loadStudentPlanById(${p.studentId})">Düzenle</button>
            </div>
          `;
        }).join('')}
      </div>
    ` : ''}
  `;
}

function changeWeeklyPlanWeek(delta) {
  const d = new Date(weeklyPlanWeekStart);
  d.setDate(d.getDate() + (delta * 7));
  weeklyPlanWeekStart = DateUtils.formatDate(d);
  renderWeeklyPlan(document.getElementById('page-content'));
}

function loadStudentPlanById(studentId) {
  document.getElementById('planStudent').value = studentId;
  loadStudentPlan();
}

async function loadStudentPlan() {
  const studentId = document.getElementById('planStudent').value;
  if (!studentId) {
    document.getElementById('planDays').style.display = 'none';
    return;
  }

  document.getElementById('planDays').style.display = 'block';

  const plan = await DB.getWeeklyPlan(parseInt(studentId), weeklyPlanWeekStart);
  const weekDays = DateUtils.getWeekDays(weeklyPlanWeekStart);

  weekDays.forEach(day => {
    const dayContainer = document.getElementById(`planDayTopics_${day.date}`);
    if (!dayContainer) return;
    dayContainer.innerHTML = '';

    if (plan && plan.plannedTopics) {
      const dayTopics = plan.plannedTopics.filter(pt => pt.date === day.date);
      dayTopics.forEach(pt => {
        addPlanTopic(day.date, pt.topicId, pt.plannedMinutes);
      });
    }
  });

  if (plan) {
    document.getElementById('planNotes').value = plan.notes || '';
  }
}

let planTopicCounter = 0;

async function addPlanTopic(date, topicId = '', minutes = 30) {
  const studentId = document.getElementById('planStudent').value;
  if (!studentId) return;

  const assignedTopics = await DB.getAssignedTopics(parseInt(studentId));
  const container = document.getElementById(`planDayTopics_${date}`);
  if (!container) return;

  const id = planTopicCounter++;
  const div = document.createElement('div');
  div.style.cssText = 'display: flex; gap: 8px; margin-bottom: 8px; align-items: center;';
  div.id = `planTopic_${id}`;
  div.innerHTML = `
    <select class="form-select" style="flex: 1; padding: 8px; font-size: 13px;" onchange="updatePlanDayTotal('${date}')">
      <option value="">Konu seçin</option>
      ${assignedTopics.map(st => st.topic ? `
        <option value="${st.topicId}" ${st.topicId == topicId ? 'selected' : ''}>
          ${st.topic.name}
        </option>
      ` : '').join('')}
    </select>
    <input type="number" class="form-input" style="width: 70px; padding: 8px; font-size: 13px;" min="5" max="480" value="${minutes}" onchange="updatePlanDayTotal('${date}')">
    <span style="font-size: 12px; color: #6B7280;">dk</span>
    <button type="button" class="btn btn-outline btn-sm" style="padding: 4px; color: var(--danger);" onclick="this.closest('div[style*=flex]').remove(); updatePlanDayTotal('${date}');">
      ${UI.createIcon('trash', 14)}
    </button>
  `;

  container.appendChild(div);
  updatePlanDayTotal(date);
}

function updatePlanDayTotal(date) {
  const container = document.getElementById(`planDayTopics_${date}`);
  if (!container) return;
  const inputs = container.querySelectorAll('input[type="number"]');
  let total = 0;
  inputs.forEach(input => { total += parseInt(input.value) || 0; });
  const el = document.getElementById(`planDayTotal_${date}`);
  if (el) el.textContent = DateUtils.formatMinutes(total);
}

async function handleSaveWeeklyPlan() {
  const studentId = parseInt(document.getElementById('planStudent').value);
  if (!studentId) { UI.showToast('Öğrenci seçin'); return; }

  const weekDays = DateUtils.getWeekDays(weeklyPlanWeekStart);
  const plannedTopics = [];

  weekDays.forEach(day => {
    const container = document.getElementById(`planDayTopics_${day.date}`);
    if (!container) return;
    const selects = container.querySelectorAll('select');
    const inputs = container.querySelectorAll('input[type="number"]');

    selects.forEach((select, i) => {
      if (select.value) {
        plannedTopics.push({
          date: day.date,
          topicId: parseInt(select.value),
          plannedMinutes: parseInt(inputs[i].value) || 30
        });
      }
    });
  });

  const notes = document.getElementById('planNotes').value.trim();

  await DB.addWeeklyPlan({
    studentId,
    weekStart: weeklyPlanWeekStart,
    plannedTopics,
    notes
  });

  UI.showToast('Plan kaydedildi');
  renderWeeklyPlan(document.getElementById('page-content'));
}