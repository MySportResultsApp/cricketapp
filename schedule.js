document.addEventListener('DOMContentLoaded', function () {
    initSchedulePage();
});

function initSchedulePage() {
    const dateInput = document.getElementById('scheduleDateInput');
    const loadButton = document.getElementById('loadScheduleButton');
    const todayButton = document.getElementById('todayScheduleButton');

    const selectedDateBadge = document.getElementById('selectedDateBadge');
    const scheduleCountBadge = document.getElementById('scheduleCountBadge');
    const matchesContainer = document.getElementById('scheduleMatches');

    const queryDate = getQueryParam('date');
    const initialDate = getInitialScheduleDate(queryDate);

    dateInput.value = initialDate;
    updateScheduleBadges(initialDate, 0, false);

    loadButton.addEventListener('click', function () {
        loadScheduleForDate(dateInput.value);
    });

    todayButton.addEventListener('click', function () {
        const today = formatDateInputValue(new Date());
        dateInput.value = today;
        loadScheduleForDate(today);
    });

    dateInput.addEventListener('change', function () {
        loadScheduleForDate(dateInput.value);
    });

    loadScheduleForDate(initialDate);
}

function getInitialScheduleDate(queryDate) {
    if (queryDate && /^\d{4}-\d{2}-\d{2}$/.test(queryDate)) {
        return queryDate;
    }

    return formatDateInputValue(new Date());
}

function updateScheduleBadges(dateString, count, loaded) {
    const selectedDateBadge = document.getElementById('selectedDateBadge');
    const scheduleCountBadge = document.getElementById('scheduleCountBadge');

    if (selectedDateBadge) {
        selectedDateBadge.textContent = formatDisplayDate(dateString);
    }

    if (scheduleCountBadge) {
        if (!loaded) {
            scheduleCountBadge.textContent = 'Checking matches...';
        } else if (count === 0) {
            scheduleCountBadge.textContent = 'No matches found';
        } else if (count === 1) {
            scheduleCountBadge.textContent = '1 match found';
        } else {
            scheduleCountBadge.textContent = count + ' matches found';
        }
    }
}

async function loadScheduleForDate(dateString) {
    const matchesContainer = document.getElementById('scheduleMatches');

    if (!dateString) {
        renderState(matchesContainer, createEmptyState(
            'No date selected',
            'Please choose a date to load cricket matches.'
        ));
        updateScheduleBadges(formatDateInputValue(new Date()), 0, true);
        return;
    }

    updateScheduleBadges(dateString, 0, false);
    renderState(matchesContainer, createLoaderState(
        'Loading schedule',
        'Getting cricket matches for ' + formatDisplayDate(dateString) + '.'
    ));

    try {
        const matches = await fetchMatchesByDate(dateString);
        const sortedMatches = sortMatchesByDate(matches);

        updateScheduleBadges(dateString, sortedMatches.length, true);

        renderMatchCards(
            matchesContainer,
            sortedMatches,
            'No matches for this date',
            'The current feed returned no cricket matches for ' + formatDisplayDate(dateString) + '.'
        );

        updateSchedulePageUrl(dateString);
    } catch (error) {
        console.error('=SCHEDULE ERROR=', error);

        updateScheduleBadges(dateString, 0, true);

        renderState(matchesContainer, createErrorState(
            'Failed to load schedule',
            'Could not fetch cricket matches for ' + formatDisplayDate(dateString) + '.'
        ));
    }
}

function updateSchedulePageUrl(dateString) {
    if (!window.history || !window.history.replaceState) {
        return;
    }

    const url = new URL(window.location.href);
    url.searchParams.set('date', dateString);
    window.history.replaceState({}, '', url.toString());
}
