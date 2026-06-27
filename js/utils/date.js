const DateUtils = {
  today() {
    return new Date().toISOString().split('T')[0];
  },

  formatDate(date) {
    if (typeof date === 'string') date = new Date(date);
    return date.toISOString().split('T')[0];
  },

  formatDisplay(date) {
    if (typeof date === 'string') date = new Date(date);
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    return date.toLocaleDateString('tr-TR', options);
  },

  formatShort(date) {
    if (typeof date === 'string') date = new Date(date);
    return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
  },

  getDayName(date) {
    if (typeof date === 'string') date = new Date(date);
    return date.toLocaleDateString('tr-TR', { weekday: 'long' });
  },

  getWeekStart(date) {
    if (typeof date === 'string') date = new Date(date);
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return this.formatDate(d);
  },

  getWeekEnd(weekStart) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 6);
    return this.formatDate(d);
  },

  getWeekDays(weekStart) {
    const days = [];
    const d = new Date(weekStart);
    for (let i = 0; i < 7; i++) {
      days.push({
        date: this.formatDate(d),
        dayName: this.getDayName(d),
        dayShort: d.toLocaleDateString('tr-TR', { weekday: 'short' }),
        dayNum: d.getDate(),
        isToday: this.formatDate(d) === this.today()
      });
      d.setDate(d.getDate() + 1);
    }
    return days;
  },

  getMonthDays(year, month) {
    const days = [];
    const date = new Date(year, month - 1, 1);
    while (date.getMonth() === month - 1) {
      days.push(this.formatDate(date));
      date.setDate(date.getDate() + 1);
    }
    return days;
  },

  formatMinutes(minutes) {
    if (!minutes) return '0 dk';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins} dk`;
    if (mins === 0) return `${hours} sa`;
    return `${hours} sa ${mins} dk`;
  },

  minutesToHours(minutes) {
    return (minutes / 60).toFixed(1);
  },

  addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return this.formatDate(d);
  },

  getMonthName(month) {
    const months = [
      'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ];
    return months[month - 1];
  },

  getCurrentMonth() {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }
};