// Основные переменные
let eventsData = null;
let filterOptions = null;
let allEvents = [];
let filteredEvents = [];
let activeFilters = {};
let currentView = 'grid';
let currentPage = 1;
const eventsPerPage = 12;

// DOM элементы
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search');
const toggleFiltersBtn = document.getElementById('toggle-filters');
const filtersPanel = document.getElementById('filters-panel');
const filtersContainer = document.getElementById('filters-container');
const resetFiltersBtn = document.getElementById('reset-filters');
const activeFiltersDisplay = document.getElementById('active-filters-display');
const resultsContainer = document.getElementById('results-container');
const resultsCount = document.getElementById('results-count');
const loadingElement = document.getElementById('loading');
const noResultsElement = document.getElementById('no-results');
const paginationElement = document.getElementById('pagination');
const sortSelect = document.getElementById('sort-select');
const viewButtons = document.querySelectorAll('.view-btn');
const eventModal = document.getElementById('event-modal');
const closeModalBtn = document.querySelector('.btn-close-modal');
const totalEventsElement = document.getElementById('total-events');
const activeFiltersCount = document.getElementById('active-filters');
const lastUpdatedElement = document.getElementById('last-updated');

// Константы
const JSON_DATA_URL = './events_glossary.json';

// Инициализация приложения
document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
    // Показать индикатор загрузки
    showLoading(true);
    
    try {
        // Загружаем данные из JSON файла
        await loadEventsData();
        
        // Инициализируем интерфейс
        initFilters();
        initEventListeners();
        updateActiveFiltersDisplay();
        
        // Первоначальный поиск
        performSearch();
        
        // Скрыть индикатор загрузки
        showLoading(false);
        
    } catch (error) {
        console.error('Ошибка при загрузке данных:', error);
        showLoading(false);
        showError(`Ошибка загрузки базы данных: ${error.message}`);
    }
}

// Загрузка данных из JSON файла
async function loadEventsData() {
    try {
        const response = await fetch(JSON_DATA_URL);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const jsonData = await response.json();
        
        if (!jsonData || !jsonData.events || !jsonData.filterOptions) {
            throw new Error('Неверный формат данных JSON');
        }
        
        eventsData = jsonData.events;
        filterOptions = jsonData.filterOptions;
        
        // Обновляем информацию в интерфейсе
        totalEventsElement.textContent = jsonData.meta.totalConcepts || eventsData.length;
        lastUpdatedElement.textContent = jsonData.meta.lastUpdated || 'Неизвестно';
        
        // Копируем все события
        allEvents = [...eventsData];
        filteredEvents = [...eventsData];
        
        console.log(`Загружено ${eventsData.length} событий, ${Object.keys(filterOptions).length} категорий фильтров`);
        
    } catch (error) {
        console.error('Ошибка загрузки JSON:', error);
        throw error;
    }
}

// Инициализация фильтров
function initFilters() {
    if (!filterOptions) {
        console.warn('Фильтры не загружены');
        return;
    }
    
    filtersContainer.innerHTML = '';
    
    // Маппинг ключей фильтров на иконки
    const filterIcons = {
        'goal': 'fas fa-bullseye',
        'scale': 'fas fa-users',
        'budget': 'fas fa-money-bill-wave',
        'location': 'fas fa-map-marker-alt',
        'energy': 'fas fa-bolt',
        'formality': 'fas fa-user-tie',
        'preparation_time': 'fas fa-clock',
        'audience_age': 'fas fa-user-friends',
        'duration': 'fas fa-hourglass-half',
        'frequency': 'fas fa-calendar-alt',
        'equipment': 'fas fa-tools'
    };
    
    // Создаем группы фильтров для каждой категории
    Object.keys(filterOptions).forEach(filterKey => {
        const filterGroup = filterOptions[filterKey];
        const filterTitle = getFilterTitle(filterKey);
        const filterIcon = filterIcons[filterKey] || 'fas fa-filter';
        
        const filterGroupElement = document.createElement('div');
        filterGroupElement.className = 'filter-group';
        filterGroupElement.innerHTML = `
            <div class="filter-title">
                <i class="${filterIcon}"></i>
                <span>${filterTitle}</span>
            </div>
            <div class="filter-options" data-filter="${filterKey}">
                ${filterGroup.map(option => {
                    // Проверяем наличие иконки в данных
                    const icon = option.icon ? `<span class="filter-icon">${option.icon}</span>` : '';
                    const name = option.name || option.id;
                    
                    return `
                    <div class="filter-option" data-filter="${filterKey}" data-value="${option.id}">
                        ${icon}
                        <span>${name}</span>
                    </div>
                `}).join('')}
            </div>
        `;
        
        filtersContainer.appendChild(filterGroupElement);
    });
    
    // Добавляем обработчики для фильтров
    document.querySelectorAll('.filter-option').forEach(option => {
        option.addEventListener('click', toggleFilter);
    });
}

// Получение читаемого названия фильтра
function getFilterTitle(filterKey) {
    const titles = {
        'goal': 'ЦЕЛЬ',
        'scale': 'МАСШТАБ',
        'budget': 'БЮДЖЕТ',
        'location': 'МЕСТО ПРОВЕДЕНИЯ',
        'energy': 'ЭНЕРГЕТИКА',
        'formality': 'ФОРМАЛЬНОСТЬ',
        'preparation_time': 'ВРЕМЯ ПОДГОТОВКИ',
        'audience_age': 'ВОЗРАСТ АУДИТОРИИ',
        'duration': 'ПРОДОЛЖИТЕЛЬНОСТЬ',
        'frequency': 'ЧАСТОТА',
        'equipment': 'ОБОРУДОВАНИЕ'
    };
    
    return titles[filterKey] || filterKey.toUpperCase();
}

// Инициализация обработчиков событий
function initEventListeners() {
    // Поиск
    searchInput.addEventListener('input', debounce(performSearch, 300));
    clearSearchBtn.addEventListener('click', clearSearch);
    
    // Фильтры
    toggleFiltersBtn.addEventListener('click', toggleFiltersPanel);
    resetFiltersBtn.addEventListener('click', resetAllFilters);
    
    // Вид отображения
    sortSelect.addEventListener('change', performSearch);
    viewButtons.forEach(btn => {
        btn.addEventListener('click', () => switchView(btn.dataset.view));
    });
    
    // Модальное окно
    closeModalBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        if (e.target === eventModal) closeModal();
    });
    
    // Закрытие модального окна по ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
    
    // Обработка изменений размера окна для адаптивности
    window.addEventListener('resize', debounce(handleResize, 250));
}

// Обработка изменения размера окна
function handleResize() {
    // При сужении экрана автоматически скрываем фильтры
    if (window.innerWidth < 768 && !filtersPanel.classList.contains('collapsed')) {
        filtersPanel.classList.add('collapsed');
    }
}

// Переключение видимости панели фильтров
function toggleFiltersPanel() {
    filtersPanel.classList.toggle('collapsed');
    const icon = toggleFiltersBtn.querySelector('.fa-chevron-down, .fa-chevron-up');
    
    if (icon.classList.contains('fa-chevron-down')) {
        icon.classList.replace('fa-chevron-down', 'fa-chevron-up');
    } else {
        icon.classList.replace('fa-chevron-up', 'fa-chevron-down');
    }
}

// Переключение фильтра
function toggleFilter(event) {
    const filterElement = event.currentTarget;
    const filterType = filterElement.dataset.filter;
    const filterValue = filterElement.dataset.value;
    
    // Инициализируем массив фильтров для этого типа, если его еще нет
    if (!activeFilters[filterType]) {
        activeFilters[filterType] = [];
    }
    
    // Проверяем, активен ли уже этот фильтр
    const filterIndex = activeFilters[filterType].indexOf(filterValue);
    
    if (filterIndex === -1) {
        // Добавляем фильтр
        activeFilters[filterType].push(filterValue);
        filterElement.classList.add('active');
    } else {
        // Удаляем фильтр
        activeFilters[filterType].splice(filterIndex, 1);
        filterElement.classList.remove('active');
        
        // Удаляем тип фильтра, если массив пуст
        if (activeFilters[filterType].length === 0) {
            delete activeFilters[filterType];
        }
    }
    
    // Обновляем отображение активных фильтров
    updateActiveFiltersDisplay();
    
    // Выполняем поиск с новыми фильтрами
    performSearch();
}

// Обновление отображения активных фильтров
function updateActiveFiltersDisplay() {
    // Считаем общее количество активных фильтров
    let totalActiveFilters = 0;
    Object.keys(activeFilters).forEach(filterType => {
        totalActiveFilters += activeFilters[filterType].length;
    });
    
    // Обновляем счетчик
    activeFiltersCount.textContent = totalActiveFilters;
    
    // Очищаем контейнер
    activeFiltersDisplay.innerHTML = '';
    
    // Если фильтров нет, показываем сообщение
    if (totalActiveFilters === 0) {
        activeFiltersDisplay.innerHTML = `
            <div class="no-active-filters">
                <i class="fas fa-info-circle"></i>
                <span>Используйте фильтры для уточнения поиска</span>
            </div>
        `;
        return;
    }
    
    // Добавляем каждый активный фильтр
    Object.keys(activeFilters).forEach(filterType => {
        activeFilters[filterType].forEach(filterValue => {
            // Находим название фильтра
            const filterOption = filterOptions[filterType]?.find(opt => opt.id === filterValue);
            if (filterOption) {
                const filterElement = document.createElement('div');
                filterElement.className = 'active-filter';
                
                // Добавляем иконку, если она есть
                const icon = filterOption.icon ? `<span class="active-filter-icon">${filterOption.icon}</span>` : '';
                const name = filterOption.name || filterValue;
                
                filterElement.innerHTML = `
                    ${icon}
                    <span>${name}</span>
                    <i class="fas fa-times" data-filter="${filterType}" data-value="${filterValue}"></i>
                `;
                
                // Добавляем обработчик для удаления
                const removeBtn = filterElement.querySelector('i');
                removeBtn.addEventListener('click', removeActiveFilter);
                
                activeFiltersDisplay.appendChild(filterElement);
            }
        });
    });
}

// Удаление активного фильтра
function removeActiveFilter(event) {
    const filterType = event.target.dataset.filter;
    const filterValue = event.target.dataset.value;
    
    // Удаляем из активных фильтров
    if (activeFilters[filterType]) {
        const filterIndex = activeFilters[filterType].indexOf(filterValue);
        if (filterIndex !== -1) {
            activeFilters[filterType].splice(filterIndex, 1);
            
            // Удаляем тип фильтра, если массив пуст
            if (activeFilters[filterType].length === 0) {
                delete activeFilters[filterType];
            }
        }
    }
    
    // Обновляем UI фильтра
    const filterOption = document.querySelector(`.filter-option[data-filter="${filterType}"][data-value="${filterValue}"]`);
    if (filterOption) {
        filterOption.classList.remove('active');
    }
    
    // Обновляем отображение активных фильтров
    updateActiveFiltersDisplay();
    
    // Выполняем поиск
    performSearch();
}

// Сброс всех фильтров
function resetAllFilters() {
    // Очищаем активные фильтры
    activeFilters = {};
    
    // Сбрасываем UI фильтров
    document.querySelectorAll('.filter-option.active').forEach(option => {
        option.classList.remove('active');
    });
    
    // Очищаем поле поиска
    searchInput.value = '';
    
    // Обновляем отображение активных фильтров
    updateActiveFiltersDisplay();
    
    // Выполняем поиск
    performSearch();
}

// Очистка поиска
function clearSearch() {
    searchInput.value = '';
    performSearch();
}

// Переключение вида отображения
function switchView(view) {
    currentView = view;
    
    // Обновляем активную кнопку
    viewButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });
    
    // Изменяем класс контейнера
    resultsContainer.className = `results-container ${view}-view`;
    
    // Перерисовываем результаты
    displayResults();
}

// Выполнение поиска
function performSearch() {
    // Показываем индикатор загрузки
    showLoading(true);
    
    // Фильтрация с задержкой для плавности
    setTimeout(() => {
        // Получаем поисковый запрос
        const searchQuery = searchInput.value.toLowerCase().trim();
        
        // Фильтруем события
        filteredEvents = allEvents.filter(event => {
            // Проверка по поисковому запросу
            const matchesSearch = !searchQuery || 
                (event.name && event.name.toLowerCase().includes(searchQuery)) ||
                (event.definition && event.definition.toLowerCase().includes(searchQuery)) ||
                (event.goal && event.goal.toLowerCase().includes(searchQuery)) ||
                (event.aliases && event.aliases.some(alias => 
                    alias && alias.toLowerCase().includes(searchQuery)
                )) ||
                (event.features && event.features.toLowerCase().includes(searchQuery));
            
            // Проверка по фильтрам
            const matchesFilters = Object.keys(activeFilters).every(filterType => {
                if (!event.filters || !event.filters[filterType]) return false;
                
                const eventFilterValues = event.filters[filterType];
                const activeFilterValues = activeFilters[filterType];
                
                // Проверяем, что хотя бы одно значение фильтра события совпадает с активным фильтром
                return activeFilterValues.some(filterValue => 
                    eventFilterValues.includes(filterValue)
                );
            });
            
            return matchesSearch && matchesFilters;
        });
        
        // Сортировка
        sortEvents();
        
        // Сбрасываем пагинацию
        currentPage = 1;
        
        // Отображаем результаты
        displayResults();
        
        // Скрываем индикатор загрузки
        showLoading(false);
    }, 100);
}

// Сортировка событий
function sortEvents() {
    const sortBy = sortSelect.value;
    
    filteredEvents.sort((a, b) => {
        switch (sortBy) {
            case 'name':
                return (a.name || '').localeCompare(b.name || '');
            case 'id':
                return (a.id || 0) - (b.id || 0);
            case 'relevance':
            default:
                // По релевантности (сначала совпадения в названии, потом в описании)
                const searchQuery = searchInput.value.toLowerCase().trim();
                if (!searchQuery) return (a.id || 0) - (b.id || 0);
                
                const aNameMatch = (a.name || '').toLowerCase().includes(searchQuery);
                const bNameMatch = (b.name || '').toLowerCase().includes(searchQuery);
                
                if (aNameMatch && !bNameMatch) return -1;
                if (!aNameMatch && bNameMatch) return 1;
                
                const aDefinitionMatch = (a.definition || '').toLowerCase().includes(searchQuery);
                const bDefinitionMatch = (b.definition || '').toLowerCase().includes(searchQuery);
                
                if (aDefinitionMatch && !bDefinitionMatch) return -1;
                if (!aDefinitionMatch && bDefinitionMatch) return 1;
                
                return (a.id || 0) - (b.id || 0);
        }
    });
}

// Отображение результатов
function displayResults() {
    // Обновляем счетчик результатов
    resultsCount.textContent = filteredEvents.length;
    
    // Показываем/скрываем сообщение "нет результатов"
    if (filteredEvents.length === 0) {
        noResultsElement.style.display = 'block';
        resultsContainer.innerHTML = '';
        paginationElement.style.display = 'none';
        return;
    } else {
        noResultsElement.style.display = 'none';
        paginationElement.style.display = 'flex';
    }
    
    // Рассчитываем пагинацию
    const totalPages = Math.ceil(filteredEvents.length / eventsPerPage);
    const startIndex = (currentPage - 1) * eventsPerPage;
    const endIndex = Math.min(startIndex + eventsPerPage, filteredEvents.length);
    const eventsToShow = filteredEvents.slice(startIndex, endIndex);
    
    // Очищаем контейнер
    resultsContainer.innerHTML = '';
    
    // Создаем карточки событий
    eventsToShow.forEach(event => {
        const eventCard = createEventCard(event);
        resultsContainer.appendChild(eventCard);
    });
    
    // Обновляем пагинацию
    updatePagination(totalPages);
}

// Создание карточки события
function createEventCard(event) {
    const card = document.createElement('div');
    card.className = 'event-card';
    card.dataset.id = event.id;
    
    // Получаем категорию для отображения
    const categoryText = getCategoryText(event.category);
    
    // Безопасное получение данных
    const eventName = event.name || 'Без названия';
    const eventDefinition = event.definition || 'Описание отсутствует';
    const eventAliases = Array.isArray(event.aliases) ? event.aliases : [];
    const eventFilters = event.filters || {};
    
    // Создаем HTML для карточки
    if (currentView === 'grid') {
        // Вид сетки
        card.innerHTML = `
            <div class="event-header">
                <span class="event-id">#${event.id || '?'}</span>
                <div class="event-actions">
                    <button class="btn-details" data-id="${event.id}">
                        <i class="fas fa-info-circle"></i>
                        <span>ДЕТАЛИ</span>
                    </button>
                </div>
            </div>
            <h3 class="event-title">${escapeHtml(eventName)}</h3>
            <div class="event-category">${categoryText}</div>
            <p class="event-definition">${escapeHtml(truncateText(eventDefinition, 120))}</p>
            <div class="event-filters">
                ${Object.keys(eventFilters).slice(0, 3).map(filterType => {
                    const filterValues = eventFilters[filterType]?.slice(0, 3) || [];
                    return filterValues.map(value => {
                        const filterOption = filterOptions[filterType]?.find(opt => opt.id === value);
                        if (filterOption) {
                            const shortName = filterOption.name.split(' ')[0];
                            const icon = filterOption.icon ? `<span class="filter-badge-icon">${filterOption.icon}</span>` : '';
                            return `<div class="filter-badge" title="${filterOption.name}">${icon}${shortName}</div>`;
                        }
                        return '';
                    }).join('');
                }).join('')}
                ${Object.keys(eventFilters).length > 3 ? '<div class="filter-badge">...</div>' : ''}
            </div>
            ${eventAliases.length > 0 ? `
                <div class="event-aliases">
                    <strong>Также известен как:</strong> ${escapeHtml(eventAliases.slice(0, 2).join(', '))}
                    ${eventAliases.length > 2 ? '...' : ''}
                </div>
            ` : ''}
        `;
    } else {
        // Вид списка
        card.innerHTML = `
            <div class="event-header">
                <span class="event-id">#${event.id || '?'}</span>
                <h3 class="event-title">${escapeHtml(eventName)}</h3>
                <div class="event-category">${categoryText}</div>
            </div>
            <p class="event-definition">${escapeHtml(truncateText(eventDefinition, 150))}</p>
            <div class="event-actions">
                <button class="btn-details" data-id="${event.id}">
                    <i class="fas fa-info-circle"></i>
                    <span>ДЕТАЛИ</span>
                </button>
                ${eventAliases.length > 0 ? `
                    <div class="event-aliases">
                        ${escapeHtml(eventAliases.slice(0, 2).join(', '))}
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    // Добавляем обработчик для кнопки деталей
    const detailsBtn = card.querySelector('.btn-details');
    if (detailsBtn) {
        detailsBtn.addEventListener('click', () => showEventDetails(event.id));
    }
    
    return card;
}

// Получение текста категории
function getCategoryText(category) {
    const categories = {
        'promo': 'Промо',
        'social': 'Социальное',
        'business': 'Бизнес',
        'educational': 'Образовательное',
        'cultural': 'Культурное',
        'sports': 'Спорт',
        'ceremonial': 'Церемониальное',
        'online': 'Онлайн',
        'specialized': 'Специализированное'
    };
    
    return categories[category] || category || 'Не указано';
}

// Обновление пагинации
function updatePagination(totalPages) {
    paginationElement.innerHTML = '';
    
    if (totalPages <= 1) {
        paginationElement.style.display = 'none';
        return;
    }
    
    paginationElement.style.display = 'flex';
    
    // Кнопка "Назад"
    const prevButton = document.createElement('button');
    prevButton.className = `pagination-btn ${currentPage === 1 ? 'disabled' : ''}`;
    prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevButton.title = 'Предыдущая страница';
    prevButton.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            displayResults();
            scrollToResults();
        }
    });
    paginationElement.appendChild(prevButton);
    
    // Номера страниц
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // Первая страница
    if (startPage > 1) {
        const firstButton = createPageButton(1);
        paginationElement.appendChild(firstButton);
        
        if (startPage > 2) {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'pagination-ellipsis';
            ellipsis.textContent = '...';
            paginationElement.appendChild(ellipsis);
        }
    }
    
    // Основные страницы
    for (let i = startPage; i <= endPage; i++) {
        const pageButton = createPageButton(i);
        paginationElement.appendChild(pageButton);
    }
    
    // Последняя страница
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'pagination-ellipsis';
            ellipsis.textContent = '...';
            paginationElement.appendChild(ellipsis);
        }
        
        const lastButton = createPageButton(totalPages);
        paginationElement.appendChild(lastButton);
    }
    
    // Кнопка "Вперед"
    const nextButton = document.createElement('button');
    nextButton.className = `pagination-btn ${currentPage === totalPages ? 'disabled' : ''}`;
    nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextButton.title = 'Следующая страница';
    nextButton.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            displayResults();
            scrollToResults();
        }
    });
    paginationElement.appendChild(nextButton);
}

// Создание кнопки страницы
function createPageButton(pageNumber) {
    const pageButton = document.createElement('button');
    pageButton.className = `pagination-btn ${pageNumber === currentPage ? 'active' : ''}`;
    pageButton.textContent = pageNumber;
    pageButton.title = `Страница ${pageNumber}`;
    pageButton.addEventListener('click', () => {
        if (pageNumber !== currentPage) {
            currentPage = pageNumber;
            displayResults();
            scrollToResults();
        }
    });
    return pageButton;
}

// Прокрутка к результатам
function scrollToResults() {
    const resultsSection = document.querySelector('.results-section');
    if (resultsSection) {
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Показать детали события
function showEventDetails(eventId) {
    const event = allEvents.find(e => e.id == eventId);
    if (!event) {
        console.error(`Событие с ID ${eventId} не найдено`);
        return;
    }
    
    // Заполняем модальное окно
    document.getElementById('modal-title').textContent = event.name || 'Без названия';
    
    const modalBody = document.querySelector('.modal-body');
    
    // Безопасное получение данных
    const definition = event.definition || 'Описание отсутствует';
    const goal = event.goal || 'Не указана';
    const features = event.features || 'Не указаны';
    const aliases = Array.isArray(event.aliases) ? event.aliases : [];
    const eventFilters = event.filters || {};
    
    modalBody.innerHTML = `
        <div class="modal-section">
            <h3><i class="fas fa-info-circle"></i> ОПРЕДЕЛЕНИЕ</h3>
            <p>${escapeHtml(definition)}</p>
        </div>
        
        <div class="modal-section">
            <h3><i class="fas fa-bullseye"></i> ЦЕЛЬ</h3>
            <p>${escapeHtml(goal)}</p>
        </div>
        
        <div class="modal-section">
            <h3><i class="fas fa-star"></i> ОСОБЕННОСТИ</h3>
            <p>${escapeHtml(features)}</p>
        </div>
        
        <div class="modal-section">
            <h3><i class="fas fa-tags"></i> ФИЛЬТРЫ И ПАРАМЕТРЫ</h3>
            ${Object.keys(eventFilters).length > 0 ? `
                <div class="modal-filters">
                    ${Object.keys(eventFilters).map(filterType => {
                        const filterValues = eventFilters[filterType] || [];
                        const filterTitle = getFilterTitle(filterType);
                        
                        if (filterValues.length === 0) return '';
                        
                        return `
                            <div class="modal-filter-item">
                                <div class="modal-filter-title">${filterTitle}</div>
                                <div class="modal-filter-values">
                                    ${filterValues.map(value => {
                                        const filterOption = filterOptions[filterType]?.find(opt => opt.id === value);
                                        const displayName = filterOption ? filterOption.name : value;
                                        const icon = filterOption?.icon ? `<span class="modal-filter-icon">${filterOption.icon}</span>` : '';
                                        
                                        return `<span class="modal-filter-value">${icon}${escapeHtml(displayName)}</span>`;
                                    }).join('')}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            ` : '<p>Параметры не указаны</p>'}
        </div>
        
        ${aliases.length > 0 ? `
            <div class="modal-section">
                <h3><i class="fas fa-synonym"></i> АЛЬТЕРНАТИВНЫЕ НАЗВАНИЯ</h3>
                <p>${escapeHtml(aliases.join(', '))}</p>
            </div>
        ` : ''}
        
        <div class="modal-section">
            <h3><i class="fas fa-hashtag"></i> ИНФОРМАЦИЯ</h3>
            <p><strong>ID:</strong> ${event.id || 'Не указан'} | <strong>Категория:</strong> ${getCategoryText(event.category)}</p>
            ${event.slug ? `<p><strong>URL-идентификатор:</strong> ${event.slug}</p>` : ''}
        </div>
        
        ${event.relatedEvents && event.relatedEvents.length > 0 ? `
            <div class="modal-section">
                <h3><i class="fas fa-link"></i> СВЯЗАННЫЕ ФОРМАТЫ</h3>
                <p>ID связанных событий: ${event.relatedEvents.join(', ')}</p>
            </div>
        ` : ''}
    `;
    
    // Показываем модальное окно
    eventModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Закрыть модальное окно
function closeModal() {
    eventModal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Показать/скрыть индикатор загрузки
function showLoading(show) {
    loadingElement.style.display = show ? 'flex' : 'none';
    resultsContainer.style.opacity = show ? '0.5' : '1';
}

// Показать ошибку
function showError(message) {
    resultsContainer.innerHTML = `
        <div class="no-results">
            <div class="no-results-icon">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <h3>ОШИБКА ЗАГРУЗКИ</h3>
            <p>${escapeHtml(message)}</p>
            <button id="retry-load" class="btn-details" style="margin-top: 20px;">
                <i class="fas fa-redo"></i>
                <span>ПОВТОРИТЬ ПОПЫТКУ</span>
            </button>
        </div>
    `;
    
    // Добавляем обработчик для повторной попытки
    const retryBtn = document.getElementById('retry-load');
    if (retryBtn) {
        retryBtn.addEventListener('click', () => {
            showLoading(true);
            setTimeout(() => {
                initApp().catch(error => {
                    showError(error.message);
                });
            }, 500);
        });
    }
}

// Утилиты
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Экспорт функций для отладки (опционально)
if (typeof window !== 'undefined') {
    window.EventMatrix = {
        loadEventsData,
        performSearch,
        resetAllFilters,
        showEventDetails,
        getFilteredEvents: () => filteredEvents,
        getActiveFilters: () => activeFilters,
        getAllEvents: () => allEvents
    };
}
