// Состояние приложения
let currentDate = new Date();
let currentView = 'day'; // 'day', 'week', 'month'
let miniCalendarDate = new Date();

// Загрузка событий из localStorage или дефолтные пустые данные
let events = JSON.parse(localStorage.getItem('my_planner_events')) || [];

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    initHourSelect();
    setupEventListeners();
    render();
});

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

// Установка слушателей событий
function setupEventListeners() {
    // Навигация по датам
    document.getElementById('prev-btn').addEventListener('click', () => changeDate(-1));
    document.getElementById('next-btn').addEventListener('click', () => changeDate(1));
    document.getElementById('today-btn').addEventListener('click', () => {
        currentDate = new Date();
        render();
    });

    // Переключение режимов (День / Месяц)
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentView = e.target.dataset.view;
            render();
        });
    });

    // Мини-календарь навигация
    document.getElementById('mini-prev').addEventListener('click', () => {
        miniCalendarDate.setMonth(miniCalendarDate.getMonth() - 1);
        renderMiniCalendar();
    });
    document.getElementById('mini-next').addEventListener('click', () => {
        miniCalendarDate.setMonth(miniCalendarDate.getMonth() + 1);
        renderMiniCalendar();
    });

    // Модальное окно
    const modal = document.getElementById('event-modal');
    document.getElementById('new-task-btn').addEventListener('click', () => openModalForCreate());
    document.getElementById('close-modal').addEventListener('click', () => modal.classList.remove('open'));
    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('open');
    });

    // Отправка формы события
    document.getElementById('event-form').addEventListener('submit', (e) => {
        e.preventDefault();
        saveEvent();
    });

    // Удаление события
    document.getElementById('delete-event-btn').addEventListener('click', () => {
        deleteEvent();
    });

    // Фильтры категорий
    document.querySelectorAll('.cat-filter').forEach(checkbox => {
        checkbox.addEventListener('change', () => renderSchedule());
    });
}

// Изменение даты в зависимости от вида
function changeDate(direction) {
    if (currentView === 'day') {
        currentDate.setDate(currentDate.getDate() + direction);
    } else if (currentView === 'month') {
        currentDate.setMonth(currentDate.getMonth() + direction);
    }
    render();
}

// Главная функция рендеринга
function render() {
    updateHeaderTitle();
    renderMiniCalendar();
    renderSchedule();
}

// Обновление заголовка даты
function updateHeaderTitle() {
    const titleEl = document.getElementById('current-date-title');
    if (currentView === 'month') {
        const options = { month: 'long', year: 'numeric' };
        titleEl.textContent = currentDate.toLocaleDateString('ru-RU', options);
    } else {
        const options = { day: 'numeric', month: 'long', year: 'numeric' };
        titleEl.textContent = currentDate.toLocaleDateString('ru-RU', options);
    }
}

// Рендеринг мини-календаря в сайдбаре
function renderMiniCalendar() {
    const gridEl = document.getElementById('mini-grid');
    const monthYearEl = document.getElementById('mini-month-year');
    gridEl.innerHTML = '';

    const year = miniCalendarDate.getFullYear();
    const month = miniCalendarDate.getMonth();

    const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    monthYearEl.textContent = `${monthNames[month]} ${year}`;

    // Первый день месяца и количество дней
    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Пн = 0
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevTotalDays = new Date(year, month, 0).getDate();

    const todayStr = new Date().toISOString().split('T')[0];
    const selectedStr = currentDate.toISOString().split('T')[0];

    // Дни предыдущего месяца
    for (let i = firstDayIndex; i > 0; i--) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'mini-day other-month';
        dayDiv.textContent = prevTotalDays - i + 1;
        gridEl.appendChild(dayDiv);
    }

    // Дни текущего месяца
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

// Рендеринг расписания (почасовой день или месяц)
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

            // Фильтруем события на этот час и день
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

// Модальное окно: открытие для создания
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

// Модальное окно: открытие для редактирования
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

// Сохранение события
function saveEvent() {
    const id = document.getElementById('event-id').value;
    const title = document.getElementById('event-title').value.trim();
    const date = document.getElementById('event-date').value;
    const hour = parseInt(document.getElementById('event-hour').value);
    const category = document.getElementById('event-category').value;
    const desc = document.getElementById('event-desc').value.trim();

    if (!title || !date) return;

    if (id) {
        // Редактирование существующего
        events = events.map(ev => ev.id === id ? { ...ev, title, date, hour, category, desc } : ev);
    } else {
        // Создание нового
        const newEv = {
            id: '_' + Math.random().toString(36).substr(2, 9),
            title,
            date,
            hour,
            category,
            desc
        };
        events.push(newEv);
    }

    localStorage.setItem('my_planner_events', JSON.stringify(events));
    document.getElementById('event-modal').classList.remove('open');
    render();
}

// Удаление события
function deleteEvent() {
    const id = document.getElementById('event-id').value;
    if (!id) return;

    events = events.filter(ev => ev.id !== id);
    localStorage.setItem('my_planner_events', JSON.stringify(events));
    document.getElementById('event-modal').classList.remove('open');
    render();
}

// Утилита для формата даты YYYY-MM-DD
function formatDateString(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Безопасный вывод текста (защита от XSS)
function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}