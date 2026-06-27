const db = new Dexie('OgrenciTakip');

db.version(1).stores({
  students: '++id, name, examType, active, createdAt',
  topics: '++id, subject, examCategory, name, order',
  studentTopics: '++id, studentId, topicId, isAssigned, completedAt',
  studyLogs: '++id, studentId, topicId, date, durationMinutes, notes, createdAt',
  weeklyPlans: '++id, studentId, weekStart, notes, createdAt',
  settings: 'key, value'
});

const DB = {
  async addStudent(student) {
    return await db.students.add({
      ...student,
      active: true,
      createdAt: new Date().toISOString()
    });
  },

  async updateStudent(id, updates) {
    return await db.students.update(id, updates);
  },

  async deleteStudent(id) {
    await db.studentTopics.where('studentId').equals(id).delete();
    await db.studyLogs.where('studentId').equals(id).delete();
    await db.weeklyPlans.where('studentId').equals(id).delete();
    return await db.students.delete(id);
  },

  async getStudents() {
    return await db.students.toArray();
  },

  async getStudent(id) {
    return await db.students.get(id);
  },

  async getActiveStudents() {
    return await db.students.where('active').equals(1).toArray();
  },

  async addTopic(topic) {
    return await db.topics.add(topic);
  },

  async updateTopic(id, updates) {
    return await db.topics.update(id, updates);
  },

  async deleteTopic(id) {
    await db.studentTopics.where('topicId').equals(id).delete();
    await db.studyLogs.where('topicId').equals(id).delete();
    return await db.topics.delete(id);
  },

  async getTopics() {
    return await db.topics.toArray();
  },

  async getTopicsByCategory(examCategory) {
    return await db.topics.where('examCategory').equals(examCategory).toArray();
  },

  async assignTopicToStudent(studentId, topicId, isAssigned = true) {
    const val = isAssigned ? 1 : 0;
    const existing = await db.studentTopics
      .where({ studentId, topicId })
      .first();

    if (existing) {
      return await db.studentTopics.update(existing.id, { isAssigned: val });
    } else {
      return await db.studentTopics.add({
        studentId,
        topicId,
        isAssigned: val,
        completedAt: null
      });
    }
  },

  async getStudentTopics(studentId) {
    const records = await db.studentTopics
      .where('studentId')
      .equals(studentId)
      .toArray();

    const topicIds = records.map(r => r.topicId);
    const topics = topicIds.length > 0
      ? await db.topics.where('id').anyOf(topicIds).toArray()
      : [];

    return records.map(r => ({
      ...r,
      topic: topics.find(t => t.id === r.topicId)
    }));
  },

  async getAssignedTopics(studentId) {
    const records = await db.studentTopics
      .where('studentId')
      .equals(studentId)
      .toArray();

    const assigned = records.filter(r => r.isAssigned === 1 || r.isAssigned === true);

    const topicIds = assigned.map(r => r.topicId);
    const topics = topicIds.length > 0
      ? await db.topics.where('id').anyOf(topicIds).toArray()
      : [];

    return assigned.map(r => ({
      ...r,
      topic: topics.find(t => t.id === r.topicId)
    }));
  },

  async completeTopic(studentId, topicId) {
    const existing = await db.studentTopics
      .where({ studentId, topicId })
      .first();

    if (existing) {
      return await db.studentTopics.update(existing.id, {
        completedAt: new Date().toISOString()
      });
    }
  },

  async addStudyLog(log) {
    return await db.studyLogs.add({
      ...log,
      createdAt: new Date().toISOString()
    });
  },

  async updateStudyLog(id, updates) {
    return await db.studyLogs.update(id, updates);
  },

  async deleteStudyLog(id) {
    return await db.studyLogs.delete(id);
  },

  async getStudyLogsByDate(date) {
    return await db.studyLogs.where('date').equals(date).toArray();
  },

  async getStudyLogsByStudent(studentId) {
    return await db.studyLogs.where('studentId').equals(studentId).toArray();
  },

  async getStudyLogsByWeek(weekStart) {
    const startDate = new Date(weekStart);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    return await db.studyLogs
      .where('date')
      .between(startStr, endStr, true, false)
      .toArray();
  },

  async getStudyLogsByMonth(year, month) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    return await db.studyLogs
      .where('date')
      .between(startDate, endDate, true, true)
      .toArray();
  },

  async addWeeklyPlan(plan) {
    const existing = await db.weeklyPlans
      .where({ studentId: plan.studentId, weekStart: plan.weekStart })
      .first();

    if (existing) {
      return await db.weeklyPlans.update(existing.id, plan);
    } else {
      return await db.weeklyPlans.add({
        ...plan,
        createdAt: new Date().toISOString()
      });
    }
  },

  async getWeeklyPlan(studentId, weekStart) {
    return await db.weeklyPlans
      .where({ studentId, weekStart })
      .first();
  },

  async getWeeklyPlansByWeek(weekStart) {
    return await db.weeklyPlans
      .where('weekStart')
      .equals(weekStart)
      .toArray();
  },

  async getSetting(key) {
    const record = await db.settings.get(key);
    return record ? record.value : null;
  },

  async setSetting(key, value) {
    return await db.settings.put({ key, value });
  },

  async initDefaultTopics() {
    const count = await db.topics.count();
    if (count === 0 && typeof DEFAULT_TOPICS !== 'undefined') {
      await db.topics.bulkAdd(DEFAULT_TOPICS);
    }
  }
};