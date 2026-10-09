// Конфигурация Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAjgi-BcwOFdJGk7bRYbgd_qY5SZA8LKXQ",
    authDomain: "my-planner-app-fac52.firebaseapp.com",
    projectId: "my-planner-app-fac52",
    storageBucket: "my-planner-app-fac52.firebasestorage.app",
    messagingSenderId: "468551163681",
    appId: "1:468551163681:web:f72634848fa18dc358e860",
    measurementId: "G-198RJNQCZB"
};

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Состояние приложения
let currentUser = null;
let events = [];
let currentDate = new Date();
let currentView = 'day'; 
let miniCalendarDate = new Date();

document.addEventListener('DOMContentLoaded', () => {
    initHourSelect();
    setupAuthListeners();
    setupAppListeners();
});

// Отслеживание авторизации
function setupAuthListeners() {
    const googleBtn = document.getElementById('google-login-btn');
    const logoutBtn = document.getElementById('logout-btn');

    googleBtn.addEventListener('click', () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider).catch(error => {
            console.error("Ошибка входа:", error);
            alert("Не удалось войти через Google.");
        });
    });

    logoutBtn.addEventListener('click', () => {
        auth.signOut();
    });

    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            document.getElementById('auth-screen').style.display = 'none';
            document.getElementById('app-container').style.display = 'flex';
            
            // Отображение данных профиля
            document.getElementById('user-name').textContent = user.displayName || 'Пользователь';
            const avatar = document.getElementById('user-avatar');
            if (user.photoURL) {
                avatar.src = user.photoURL;
                avatar.style.display = 'block';
            }

            // Загрузка задач текущего пользователя из базы данных
            loadUserEvents();
        } else {
            currentUser = null;
            events = [];
            document.getElementById('app-container').style.display = 'none';
            document.getElementById('auth-screen').style.display = 'flex';
        }
    });
}

// Загрузка задач из Firestore (только те, у которых userId === текущий пользователь)
function loadUserEvents() {
    db.collection("events")
      .where("userId", "==", currentUser.uid)
      .onSnapshot(snapshot => {
          events = [];
          snapshot.forEach(doc => {
              events.push({ id: doc.id, ...doc.data() });
          });
          render();
      }, error => {
          console.error("Ошибка загрузки задач:", error);
      });
}

// Заполнение селекта часов в модалке (00:00 - 23:00)
function initHourSelect() {
    const hourSelect = document.getElementById('event-hour');
    hourSelect.innerHTML = '';
    for (let i = 0; i < 24; i++) {
        const hourStr = i.toString().padStart(2, '0') + ':00';
        const option = document.createElement('option');
        option.value = i;
        option.textContent = hourStr;
        hourSelect.appendChild(option);
    }
}

// Установка слушателей интерфейса
function setupAppListeners() {
    document.getElementById('prev-btn').addEventListener('click', () => changeDate(-1));
    document.getElementById('next-btn').addEventListener('click', () => changeDate(1));
    document.getElementById('today-btn').addEventListener('click', () => {
        currentDate = new Date();
        render();
    });

    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentView = e.target.dataset.view;
            render();
        });
    });

    document.getElementById('mini-prev').addEventListener('click', () => {
        miniCalendarDate.setMonth(miniCalendarDate.getMonth() - 1);
        renderMiniCalendar();
    });
    document.getElementById('mini-next').addEventListener('click', () => {
        miniCalendarDate.setMonth(miniCalendarDate.getMonth() + 1);
        renderMiniCalendar();
    });

    const modal = document.getElementById('event-modal');
    document.getElementById('new-task-btn').addEventListener('click', () => openModalForCreate());
    document.getElementById('close-modal').addEventListener('click', () => modal.classList.remove('open'));
    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('open');
    });

    document.getElementById('event-form').addEventListener('submit', (e) => {
        e.preventDefault();
        saveEvent();
    });

    document.getElementById('delete-event-btn').addEventListener('click', () => {
        deleteEvent();
    });

    document.querySelectorAll('.cat-filter').forEach(checkbox => {
        checkbox.addEventListener('change', () => renderSchedule());
    });
}

function changeDate(direction) {
    if (currentView === 'day') {
        currentDate.setDate(currentDate.getDate() + direction);
    } else if (currentView === 'week') {
        currentDate.setDate(currentDate.getDate() + (direction * 7));
    } else if (currentView === 'month') {
        currentDate.setMonth(currentDate.getMonth() + direction);
    }
    render();
}

function render() {
    updateHeaderTitle();
    renderMiniCalendar();
    renderSchedule();
}

function updateHeaderTitle() {
    const titleEl = document.getElementById('current-date-title');
    if (currentView === 'month') {
        const options = { month: 'long', year: 'numeric' };
        titleEl.textContent = currentDate.toLocaleDateString('ru-RU', options);
    } else if (currentView === 'week') {
        const weekDays = getWeekDays(currentDate);
        const first = weekDays[0];
        const last = weekDays[6];
        titleEl.textContent = `${first.getDate()} ${first.toLocaleDateString('ru-RU', { month: 'short' })} — ${last.getDate()} ${last.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}`;
    } else {
        const options = { day: 'numeric', month: 'long', year: 'numeric' };
        titleEl.textContent = currentDate.toLocaleDateString('ru-RU', options);
    }
}

function getWeekDays(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    
    const monday = new Date(d.setDate(diff));
    const weekDays = [];
    
    for (let i = 0; i < 7; i++) {
        const nextDay = new Date(monday);
        nextDay.setDate(monday.getDate() + i);
        weekDays.push(nextDay);
    }
    return weekDays;
}

function renderMiniCalendar() {
    const gridEl = document.getElementById('mini-grid');
    const monthYearEl = document.getElementById('mini-month-year');
    if (!gridEl) return;
    gridEl.innerHTML = '';

    const year = miniCalendarDate.getFullYear();
    const month = miniCalendarDate.getMonth();

    const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    monthYearEl.textContent = `${monthNames[month]} ${year}`;

    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; 
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevTotalDays = new Date(year, month, 0).getDate();

    const todayStr = formatDateString(new Date());
    const selectedStr = formatDateString(currentDate);

    for (let i = firstDayIndex; i > 0; i--) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'mini-day other-month';
        dayDiv.textContent = prevTotalDays - i + 1;
        gridEl.appendChild(dayDiv);
    }

    for (let i = 1; i <= totalDays; i++) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'mini-day';
        dayDiv.textContent = i;

        const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
        
        if (dateStr === todayStr) dayDiv.classList.add('today');
        if (dateStr === selectedStr) dayDiv.classList.add('selected');

        dayDiv.addEventListener('click', () => {
            currentDate = new Date(year, month, i);
            currentView = 'day';
            document.querySelectorAll('.view-btn').forEach(b => {
                b.classList.toggle('active', b.dataset.view === 'day');
            });
            render();
        });

        gridEl.appendChild(dayDiv);
    }
}

function renderSchedule() {
    const container = document.getElementById('schedule-container');
    container.innerHTML = '';

    const activeCategories = Array.from(document.querySelectorAll('.cat-filter:checked')).map(cb => cb.value);

    if (currentView === 'day') {
        const dayViewEl = document.createElement('div');
        dayViewEl.className = 'hourly-view';
        const dateStr = formatDateString(currentDate);

        for (let hour = 0; hour < 24; hour++) {
            const row = document.createElement('div');
            row.className = 'hour-row';

            const label = document.createElement('div');
            label.className = 'hour-label';
            label.textContent = `${hour.toString().padStart(2, '0')}:00`;

            const content = document.createElement('div');
            content.className = 'hour-content';
            content.addEventListener('click', () => openModalForCreate(dateStr, hour));

            const hourEvents = events.filter(ev => ev.date === dateStr && ev.hour === hour && activeCategories.includes(ev.category));

            hourEvents.forEach(ev => {
                const card = document.createElement('div');
                card.className = `event-card ${ev.category}`;
                card.innerHTML = `<span class="title">${escapeHTML(ev.title)}</span>`;
                card.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openModalForEdit(ev.id);
                });
                content.appendChild(card);
            });

            row.appendChild(label);
            row.appendChild(content);
            dayViewEl.appendChild(row);
        }
        container.appendChild(dayViewEl);

    } else if (currentView === 'week') {
        const weekGrid = document.createElement('div');
        weekGrid.className = 'week-view-grid';

        const weekDays = getWeekDays(currentDate);
        const todayStr = formatDateString(new Date());
        const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

        weekDays.forEach((dayDate, index) => {
            const dateStr = formatDateString(dayDate);
            const column = document.createElement('div');
            column.className = 'week-column';
            if (dateStr === todayStr) column.classList.add('today');

            const colHeader = document.createElement('div');
            colHeader.className = 'week-column-header';
            colHeader.textContent = `${dayNames[index]}, ${dayDate.getDate()} ${dayDate.toLocaleDateString('ru-RU', { month: 'short' })}`;
            column.appendChild(colHeader);

            const colBody = document.createElement('div');
            colBody.className = 'week-column-body';
            colBody.addEventListener('click', () => openModalForCreate(dateStr, 9));

            const dayEvents = events.filter(ev => ev.date === dateStr && activeCategories.includes(ev.category));
            dayEvents.sort((a, b) => a.hour - b.hour);

            dayEvents.forEach(ev => {
                const card = document.createElement('div');
                card.className = `event-card ${ev.category}`;
                card.innerHTML = `<span class="title">${ev.hour.toString().padStart(2, '0')}:00 - ${escapeHTML(ev.title)}</span>`;
                card.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openModalForEdit(ev.id);
                });
                colBody.appendChild(card);
            });

            column.appendChild(colBody);
            weekGrid.appendChild(column);
        });

        container.appendChild(weekGrid);

    } else if (currentView === 'month') {
        const monthGrid = document.createElement('div');
        monthGrid.className = 'month-view-grid';

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const totalDays = new Date(year, month + 1, 0).getDate();
        const todayStr = formatDateString(new Date());

        for (let i = 1; i <= totalDays; i++) {
            const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
            const cell = document.createElement('div');
            cell.className = 'month-cell';
            if (dateStr === todayStr) cell.classList.add('today');

            const cellHeader = document.createElement('div');
            cellHeader.className = 'month-cell-header';
            cellHeader.textContent = i;
            cell.appendChild(cellHeader);

            const dayEvents = events.filter(ev => ev.date === dateStr && activeCategories.includes(ev.category));
            dayEvents.forEach(ev => {
                const badge = document.createElement('div');
                badge.className = `event-card ${ev.category}`;
                badge.style.padding = '2px 6px';
                badge.style.fontSize = '0.75rem';
                badge.innerHTML = `<span class="title">${ev.hour.toString().padStart(2, '0')}:00 - ${escapeHTML(ev.title)}</span>`;
                badge.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openModalForEdit(ev.id);
                });
                cell.appendChild(badge);
            });

            cell.addEventListener('click', () => {
                currentDate = new Date(year, month, i);
                currentView = 'day';
                document.querySelectorAll('.view-btn').forEach(b => {
                    b.classList.toggle('active', b.dataset.view === 'day');
                });
                render();
            });

            monthGrid.appendChild(cell);
        }
        container.appendChild(monthGrid);
    }
}

function openModalForCreate(dateStr = null, hour = 9) {
    document.getElementById('modal-title').textContent = 'Добавить событие';
    document.getElementById('event-id').value = '';
    document.getElementById('event-title').value = '';
    document.getElementById('event-desc').value = '';
    document.getElementById('event-date').value = dateStr || formatDateString(currentDate);
    document.getElementById('event-hour').value = hour;
    document.getElementById('event-category').value = 'work';
    document.getElementById('delete-event-btn').style.display = 'none';

    document.getElementById('event-modal').classList.add('open');
}

function openModalForEdit(id) {
    const ev = events.find(item => item.id === id);
    if (!ev) return;

    document.getElementById('modal-title').textContent = 'Редактировать событие';
    document.getElementById('event-id').value = ev.id;
    document.getElementById('event-title').value = ev.title;
    document.getElementById('event-desc').value = ev.desc || '';
    document.getElementById('event-date').value = ev.date;
    document.getElementById('event-hour').value = ev.hour;
    document.getElementById('event-category').value = ev.category;
    document.getElementById('delete-event-btn').style.display = 'block';

    document.getElementById('event-modal').classList.add('open');
}

// Сохранение задачи в Firestore в облако с привязкой к userId
function saveEvent() {
    const id = document.getElementById('event-id').value;
    const title = document.getElementById('event-title').value.trim();
    const date = document.getElementById('event-date').value;
    const hour = parseInt(document.getElementById('event-hour').value);
    const category = document.getElementById('event-category').value;
    const desc = document.getElementById('event-desc').value.trim();

    if (!title || !date || !currentUser) return;

    const eventData = {
        userId: currentUser.uid,
        title,
        date,
        hour,
        category,
        desc
    };

    if (id) {
        db.collection("events").doc(id).update(eventData)
          .then(() => {
              document.getElementById('event-modal').classList.remove('open');
          })
          .catch(err => console.error("Ошибка обновления:", err));
    } else {
        db.collection("events").add(eventData)
          .then(() => {
              document.getElementById('event-modal').classList.remove('open');
          })
          .catch(err => console.error("Ошибка добавления:", err));
    }
}

// Удаление задачи из Firestore
function deleteEvent() {
    const id = document.getElementById('event-id').value;
    if (!id) return;

    db.collection("events").doc(id).delete()
      .then(() => {
          document.getElementById('event-modal').classList.remove('open');
      })
      .catch(err => console.error("Ошибка удаления:", err));
}

function formatDateString(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}