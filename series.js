document.addEventListener('DOMContentLoaded', function () {
    initSeriesPage();
});

async function initSeriesPage() {
    const seriesId = getQueryParam('id');
    const modeBadge = document.getElementById('seriesModeBadge');
    const seriesGrid = document.getElementById('seriesGrid');
    const seriesMatches = document.getElementById('seriesMatches');
    const seriesMatchesTitle = document.getElementById('seriesMatchesTitle');
    const seriesMatchesSubtitle = document.getElementById('seriesMatchesSubtitle');

    if (modeBadge) {
        modeBadge.textContent = seriesId ? 'Series mode: selected' : 'Series mode: all series';
    }

    renderState(seriesGrid, createLoaderState(
        'Loading series',
        'Getting current cricket series and tournaments from the live feed.'
    ));

    if (seriesId) {
        renderState(seriesMatches, createLoaderState(
            'Loading series matches',
            'Getting matches for the selected series.'
        ));
    } else {
        renderState(seriesMatches, createEmptyState(
            'Choose a series',
            'Select any series card below to load related matches from the current feed.'
        ));
    }

    try {
        const [seriesItems, matches] = await Promise.all([
            fetchCricketSeries(),
            fetchCurrentMatches()
        ]);

        renderSeriesCards(
            seriesGrid,
            addSeriesLinks(seriesItems),
            'No series found',
            'The current cricket feed did not return any series or tournaments.'
        );

        if (seriesId) {
            const selectedSeries = findSeriesById(seriesItems, seriesId);
            const relatedMatches = getMatchesForSeries(matches, selectedSeries, seriesId);

            if (seriesMatchesTitle) {
                seriesMatchesTitle.textContent = selectedSeries ? selectedSeries.title : 'Series matches';
            }

            if (seriesMatchesSubtitle) {
                seriesMatchesSubtitle.textContent = selectedSeries
                    ? 'Matches found in the current feed for this series'
                    : 'Matches matched by the selected series id';
            }

            renderMatchCards(
                seriesMatches,
                relatedMatches,
                'No matches for this series',
                'The current feed does not show any matches for this series right now.'
            );

            if (modeBadge) {
                if (selectedSeries) {
                    modeBadge.textContent = 'Series: ' + selectedSeries.shortTitle;
                } else {
                    modeBadge.textContent = 'Series ID: ' + seriesId;
                }
            }

            updateSeriesPageTitle(selectedSeries, seriesId);
        } else {
            updateSeriesPageTitle(null, '');
        }
    } catch (error) {
        console.error('=SERIES ERROR=', error);

        renderState(seriesGrid, createErrorState(
            'Failed to load series',
            'Could not fetch cricket series from the current feed.'
        ));

        renderState(seriesMatches, createErrorState(
            'Failed to load series matches',
            'Could not fetch matches for the selected series.'
        ));
    }
}

function addSeriesLinks(seriesItems) {
    return (seriesItems || []).map(function (item) {
        return Object.assign({}, item, {
            link: 'series.html?id=' + encodeURIComponent(item.id)
        });
    });
}

function findSeriesById(seriesItems, seriesId) {
    const safeId = String(seriesId || '');

    return (seriesItems || []).find(function (item) {
        return String(item.id || '') === safeId;
    }) || null;
}

function getMatchesForSeries(matches, selectedSeries, seriesId) {
    const safeSeriesId = String(seriesId || '').toLowerCase();

    const filtered = (matches || []).filter(function (match) {
        const leagueName = String(match.leagueName || '').toLowerCase();
        const matchName = String(match.name || '').toLowerCase();
        const shortName = String(match.shortName || '').toLowerCase();

        if (selectedSeries) {
            const title = String(selectedSeries.title || '').toLowerCase();
            const shortTitle = String(selectedSeries.shortTitle || '').toLowerCase();

            if (title && (leagueName.includes(title) || matchName.includes(title) || shortName.includes(title))) {
                return true;
            }

            if (shortTitle && (leagueName.includes(shortTitle) || matchName.includes(shortTitle) || shortName.includes(shortTitle))) {
                return true;
            }
        }

        return safeSeriesId && (
            leagueName.includes(safeSeriesId) ||
            matchName.includes(safeSeriesId) ||
            shortName.includes(safeSeriesId)
        );
    });

    return sortMatchesByDate(filtered);
}

function renderSeriesCards(container, items, emptyTitle, emptyText) {
    if (!container) {
        return;
    }

    if (!items || items.length === 0) {
        renderState(container, createEmptyState(emptyTitle, emptyText));
        return;
    }

    container.innerHTML = items.map(function (series) {
        const href = series.link || ('series.html?id=' + encodeURIComponent(series.id));

        return `
            <article class="card series-card">
                <div class="card-body">
                    <div class="series-title">${escapeHtml(series.title)}</div>
                    <div class="series-meta">${escapeHtml(formatDisplayDateTime(series.date))}</div>
                    <div class="series-desc">${escapeHtml(series.description || series.matchName || 'Current cricket series and event grouping.')}</div>
                    <a class="series-link" href="${escapeHtml(href)}">Open Series</a>
                </div>
            </article>
        `;
    }).join('');
}

function updateSeriesPageTitle(selectedSeries, seriesId) {
    if (selectedSeries && selectedSeries.title) {
        document.title = selectedSeries.title + ' | Cricket Live';
        return;
    }

    if (seriesId) {
        document.title = 'Series ' + seriesId + ' | Cricket Live';
        return;
    }

    document.title = 'Cricket Series | Cricket Live';
}
