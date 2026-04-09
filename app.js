const CRICKET_API = {
    scoreboard: [
        'https://site.api.espn.com/apis/site/v2/sports/cricket/scoreboard',
        'https://site.api.espn.com/apis/site/v2/sports/cricket/scoreboard?limit=100'
    ],
    summary: [
        'https://site.api.espn.com/apis/site/v2/sports/cricket/summary?event={EVENT_ID}'
    ],
    news: [
        'https://site.api.espn.com/apis/site/v2/sports/cricket/news'
    ]
};

const APP_CONFIG = {
    requestTimeoutMs: 16000,
    recentDaysBack: 3,
    upcomingDaysForward: 5
};

function buildUrl(base, params) {
    const url = new URL(base);

    if (params && typeof params === 'object') {
        Object.keys(params).forEach(function (key) {
            const value = params[key];

            if (value !== undefined && value !== null && value !== '') {
                url.searchParams.set(key, value);
            }
        });
    }

    return url.toString();
}

async function fetchJsonWithTimeout(url, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(function () {
        controller.abort();
    }, timeoutMs || APP_CONFIG.requestTimeoutMs);

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            },
            signal: controller.signal
        });

        if (!response.ok) {
            throw new Error('Request failed with status ' + response.status);
        }

        return await response.json();
    } finally {
        clearTimeout(timer);
    }
}

async function fetchFirstWorkingJson(urls) {
    let lastError = null;

    for (let i = 0; i < urls.length; i += 1) {
        try {
            return await fetchJsonWithTimeout(urls[i], APP_CONFIG.requestTimeoutMs);
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError || new Error('All endpoints failed');
}

function escapeHtml(value) {
    if (value === null || value === undefined) {
        return '';
    }

    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function formatDateInputValue(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
}

function formatDisplayDate(dateString) {
    if (!dateString) {
        return 'Unknown date';
    }

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
        return dateString;
    }

    return date.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

function formatDisplayTime(dateString) {
    if (!dateString) {
        return '';
    }

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
        return '';
    }

    return date.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatDisplayDateTime(dateString) {
    if (!dateString) {
        return 'Unknown time';
    }

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
        return dateString;
    }

    return date.toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
}

function setActiveNav() {
    const page = window.location.pathname.split('/').pop() || 'index.html';
    const links = document.querySelectorAll('[data-nav]');

    links.forEach(function (link) {
        const target = link.getAttribute('href') || '';
        link.classList.toggle('active', target === page);
    });
}

function createLoaderState(title, text) {
    return `
        <div class="state-box">
            <div class="loader"></div>
            <div class="state-title">${escapeHtml(title || 'Loading')}</div>
            <div class="state-text">${escapeHtml(text || 'Please wait while live cricket data is loading.')}</div>
        </div>
    `;
}

function createEmptyState(title, text) {
    return `
        <div class="state-box">
            <div class="state-title">${escapeHtml(title || 'Nothing here')}</div>
            <div class="state-text">${escapeHtml(text || 'No items were found for this section.')}</div>
        </div>
    `;
}

function createErrorState(title, text) {
    return `
        <div class="state-box">
            <div class="state-title">${escapeHtml(title || 'Failed to load')}</div>
            <div class="state-text">${escapeHtml(text || 'The data source did not respond in time or returned an unexpected result.')}</div>
        </div>
    `;
}

function renderState(container, html) {
    if (!container) {
        return;
    }

    container.innerHTML = html;
}

function normalizeArray(value) {
    if (Array.isArray(value)) {
        return value;
    }

    return [];
}

function getObject(value) {
    if (value && typeof value === 'object') {
        return value;
    }

    return {};
}

function getCompetitorsFromEvent(event) {
    const competition = getPrimaryCompetition(event);
    return normalizeArray(competition.competitors);
}

function getPrimaryCompetition(event) {
    const competitions = normalizeArray(getObject(event).competitions);
    return competitions[0] || {};
}

function getCompetitorTeamName(competitor) {
    const item = getObject(competitor);
    const team = getObject(item.team);

    return (
        team.displayName ||
        team.shortDisplayName ||
        item.displayName ||
        item.shortDisplayName ||
        team.name ||
        'Unknown Team'
    );
}

function getCompetitorShortName(competitor) {
    const item = getObject(competitor);
    const team = getObject(item.team);

    return (
        team.shortDisplayName ||
        item.shortDisplayName ||
        team.abbreviation ||
        team.displayName ||
        item.displayName ||
        'Team'
    );
}

function getCompetitorId(competitor) {
    const item = getObject(competitor);
    const team = getObject(item.team);

    return String(team.id || item.id || '');
}

function getCompetitorScore(competitor) {
    const item = getObject(competitor);
    const score = item.score;

    if (score === null || score === undefined || score === '') {
        return '-';
    }

    return String(score);
}

function getCompetitorRecordText(competitor) {
    const item = getObject(competitor);
    const records = normalizeArray(item.records);

    if (records.length > 0) {
        const first = getObject(records[0]);
        return first.summary || first.displayValue || '';
    }

    return '';
}

function getCompetitorLinescoreText(competitor) {
    const item = getObject(competitor);
    const linescores = normalizeArray(item.linescores);

    if (linescores.length === 0) {
        return '';
    }

    return linescores
        .map(function (part) {
            const current = getObject(part);
            return current.displayValue || current.value || current.shortDisplayValue || '';
        })
        .filter(Boolean)
        .join(' • ');
}

function getStatusDetail(event) {
    const status = getObject(getObject(event).status);
    const type = getObject(status.type);

    return (
        type.detail ||
        status.displayClock ||
        type.shortDetail ||
        type.description ||
        status.type?.name ||
        'Status unavailable'
    );
}

function getStatusState(event) {
    const status = getObject(getObject(event).status);
    const type = getObject(status.type);

    return (
        type.state ||
        type.name ||
        type.description ||
        ''
    ).toLowerCase();
}

function getStatusCategory(event) {
    const state = getStatusState(event);
    const detail = getStatusDetail(event).toLowerCase();

    if (state.includes('in') || state.includes('live') || detail.includes('live') || detail.includes('stumps') || detail.includes('innings break')) {
        return 'live';
    }

    if (state.includes('post') || state.includes('final') || detail.includes('result') || detail.includes('won by') || detail.includes('match drawn') || detail.includes('tied')) {
        return 'finished';
    }

    return 'upcoming';
}

function getEventId(event) {
    return String(getObject(event).id || '');
}

function getEventName(event) {
    const item = getObject(event);

    return (
        item.name ||
        item.shortName ||
        'Cricket Match'
    );
}

function getEventShortName(event) {
    const item = getObject(event);

    return (
        item.shortName ||
        item.name ||
        'Match'
    );
}

function getEventDate(event) {
    return getObject(event).date || '';
}

function getEventLeagueName(event) {
    const competition = getPrimaryCompetition(event);
    const series = getObject(competition.series);
    const league = getObject(getObject(event).league);

    return (
        series.fullName ||
        series.shortName ||
        league.displayName ||
        league.shortName ||
        ''
    );
}

function getEventVenue(event) {
    const competition = getPrimaryCompetition(event);
    const venue = getObject(competition.venue);
    const address = getObject(venue.address);
    const pieces = [];

    if (venue.fullName) {
        pieces.push(venue.fullName);
    }

    if (address.city) {
        pieces.push(address.city);
    }

    if (address.country) {
        pieces.push(address.country);
    }

    return pieces.filter(Boolean).join(', ');
}

function getEventLink(event) {
    const links = normalizeArray(getObject(event).links);
    const first = getObject(links[0]);

    return first.href || '';
}

function getTossText(summaryData) {
    const header = getObject(summaryData.header);
    const competitions = normalizeArray(header.competitions);
    const competition = getObject(competitions[0]);
    const note = normalizeArray(competition.notes)[0] || {};

    return note.headline || note.shortText || '';
}

function getSeriesFromScoreboard(scoreboardData) {
    const events = normalizeArray(getObject(scoreboardData).events);
    const map = new Map();

    events.forEach(function (event) {
        const competition = getPrimaryCompetition(event);
        const series = getObject(competition.series);

        const id = String(series.id || competition.id || getEventId(event) || '');
        const title = series.fullName || series.shortName || getEventLeagueName(event) || 'Cricket Series';

        if (!id || !title) {
            return;
        }

        if (!map.has(id)) {
            map.set(id, {
                id: id,
                title: title,
                shortTitle: series.shortName || title,
                description: getEventVenue(event),
                matchName: getEventShortName(event),
                eventId: getEventId(event),
                date: getEventDate(event)
            });
        }
    });

    return Array.from(map.values())
        .sort(function (a, b) {
            return new Date(a.date).getTime() - new Date(b.date).getTime();
        });
}

function getNewsArticles(newsData) {
    const articles = normalizeArray(getObject(newsData).articles);

    return articles.map(function (article) {
        const item = getObject(article);
        const images = normalizeArray(item.images);
        const links = normalizeArray(item.links);
        const firstLink = getObject(links[0]);

        return {
            id: String(item.id || item.guid || item.headline || Math.random()),
            title: item.headline || item.title || 'Untitled article',
            description: item.description || item.story || '',
            published: item.published || item.lastModified || '',
            byline: item.byline || '',
            link: firstLink.web || item.link || '',
            image: getObject(images[0]).url || ''
        };
    });
}

function normalizeMatchEvent(event) {
    const competitors = getCompetitorsFromEvent(event);
    const first = competitors[0] || {};
    const second = competitors[1] || {};

    return {
        id: getEventId(event),
        name: getEventName(event),
        shortName: getEventShortName(event),
        date: getEventDate(event),
        leagueName: getEventLeagueName(event),
        venue: getEventVenue(event),
        statusText: getStatusDetail(event),
        statusCategory: getStatusCategory(event),
        link: getEventLink(event),
        teamA: {
            id: getCompetitorId(first),
            name: getCompetitorTeamName(first),
            shortName: getCompetitorShortName(first),
            score: getCompetitorScore(first),
            record: getCompetitorRecordText(first),
            linescore: getCompetitorLinescoreText(first)
        },
        teamB: {
            id: getCompetitorId(second),
            name: getCompetitorTeamName(second),
            shortName: getCompetitorShortName(second),
            score: getCompetitorScore(second),
            record: getCompetitorRecordText(second),
            linescore: getCompetitorLinescoreText(second)
        }
    };
}

function getMatchNote(match) {
    const notes = [];

    if (match.leagueName) {
        notes.push(match.leagueName);
    }

    if (match.venue) {
        notes.push(match.venue);
    }

    return notes.join(' • ');
}

function renderMatchCard(match) {
    const statusClass = match.statusCategory || 'upcoming';
    const note = getMatchNote(match);
    const matchTime = formatDisplayDateTime(match.date);

    return `
        <article class="card match-card">
            <div class="card-body">
                <div class="match-top">
                    <div class="match-status ${escapeHtml(statusClass)}">
                        ${statusClass === 'live' ? '<span class="dot-live"></span>' : ''}
                        <span>${escapeHtml(match.statusText)}</span>
                    </div>
                    <div class="match-meta">${escapeHtml(matchTime)}</div>
                </div>

                <div class="teams">
                    <div class="team-row">
                        <div class="team-main">
                            <div class="team-name">${escapeHtml(match.teamA.name)}</div>
                            <div class="team-extra">${escapeHtml(match.teamA.linescore || match.teamA.record || '')}</div>
                        </div>
                        <div class="team-score">${escapeHtml(match.teamA.score)}</div>
                    </div>

                    <div class="team-row">
                        <div class="team-main">
                            <div class="team-name">${escapeHtml(match.teamB.name)}</div>
                            <div class="team-extra">${escapeHtml(match.teamB.linescore || match.teamB.record || '')}</div>
                        </div>
                        <div class="team-score">${escapeHtml(match.teamB.score)}</div>
                    </div>
                </div>

                <div class="match-footer">
                    <div class="match-note">${escapeHtml(note)}</div>
                    <a class="match-link" href="match.html?id=${encodeURIComponent(match.id)}">Match Details</a>
                </div>
            </div>
        </article>
    `;
}

function renderSeriesCard(series) {
    return `
        <article class="card series-card">
            <div class="card-body">
                <div class="series-title">${escapeHtml(series.title)}</div>
                <div class="series-meta">${escapeHtml(formatDisplayDateTime(series.date))}</div>
                <div class="series-desc">${escapeHtml(series.description || series.matchName || 'Current cricket series and event grouping.')}</div>
                <a class="series-link" href="series.html?id=${encodeURIComponent(series.id)}">Open Series</a>
            </div>
        </article>
    `;
}

function renderArticleCard(article) {
    return `
        <article class="card article-card">
            <div class="card-body">
                <div class="article-title">${escapeHtml(article.title)}</div>
                <div class="article-meta">${escapeHtml(formatDisplayDateTime(article.published))}${article.byline ? ' • ' + escapeHtml(article.byline) : ''}</div>
                <div class="article-desc">${escapeHtml(article.description || 'Open the article to read more.')}</div>
                ${article.link ? `<a class="article-link" href="${escapeHtml(article.link)}" target="_blank" rel="noopener noreferrer">Open Article</a>` : ''}
            </div>
        </article>
    `;
}

function renderMatchCards(container, matches, emptyTitle, emptyText) {
    if (!container) {
        return;
    }

    if (!matches || matches.length === 0) {
        renderState(container, createEmptyState(emptyTitle, emptyText));
        return;
    }

    container.innerHTML = matches.map(renderMatchCard).join('');
}

function renderSeriesCards(container, items, emptyTitle, emptyText) {
    if (!container) {
        return;
    }

    if (!items || items.length === 0) {
        renderState(container, createEmptyState(emptyTitle, emptyText));
        return;
    }

    container.innerHTML = items.map(renderSeriesCard).join('');
}

function renderArticleCards(container, items, emptyTitle, emptyText) {
    if (!container) {
        return;
    }

    if (!items || items.length === 0) {
        renderState(container, createEmptyState(emptyTitle, emptyText));
        return;
    }

    container.innerHTML = items.map(renderArticleCard).join('');
}

function sortMatchesByDate(events) {
    return events.slice().sort(function (a, b) {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
}

function splitMatchesByStatus(matches) {
    const result = {
        live: [],
        upcoming: [],
        finished: []
    };

    matches.forEach(function (match) {
        const category = match.statusCategory || 'upcoming';

        if (!result[category]) {
            result.upcoming.push(match);
            return;
        }

        result[category].push(match);
    });

    return result;
}

async function fetchScoreboard(params) {
    const urls = CRICKET_API.scoreboard.map(function (baseUrl) {
        return buildUrl(baseUrl, params || {});
    });

    return await fetchFirstWorkingJson(urls);
}

async function fetchCurrentMatches() {
    const data = await fetchScoreboard({ limit: 100 });
    const events = normalizeArray(getObject(data).events).map(normalizeMatchEvent);
    return sortMatchesByDate(events);
}

async function fetchMatchesByDate(dateString) {
    const data = await fetchScoreboard({
        dates: dateString.replaceAll('-', ''),
        limit: 100
    });

    const events = normalizeArray(getObject(data).events).map(normalizeMatchEvent);
    return sortMatchesByDate(events);
}

async function fetchMatchSummary(eventId) {
    const urls = CRICKET_API.summary.map(function (url) {
        return url.replace('{EVENT_ID}', encodeURIComponent(eventId));
    });

    return await fetchFirstWorkingJson(urls);
}

async function fetchCricketNews() {
    const data = await fetchFirstWorkingJson(CRICKET_API.news);
    return getNewsArticles(data);
}

async function fetchCricketSeries() {
    const data = await fetchScoreboard({ limit: 100 });
    return getSeriesFromScoreboard(data);
}

function getSummaryHeader(summaryData) {
    const header = getObject(summaryData.header);
    const competitions = normalizeArray(header.competitions);
    return getObject(competitions[0]);
}

function getSummaryCompetitors(summaryData) {
    const headerCompetition = getSummaryHeader(summaryData);
    return normalizeArray(headerCompetition.competitors);
}

function normalizeSummaryTeam(competitor) {
    return {
        id: getCompetitorId(competitor),
        name: getCompetitorTeamName(competitor),
        shortName: getCompetitorShortName(competitor),
        score: getCompetitorScore(competitor),
        record: getCompetitorRecordText(competitor),
        linescore: getCompetitorLinescoreText(competitor)
    };
}

function getSummaryStatus(summaryData) {
    const headerCompetition = getSummaryHeader(summaryData);
    const status = getObject(headerCompetition.status);
    const type = getObject(status.type);

    return {
        detail: type.detail || type.shortDetail || type.description || 'Status unavailable',
        category: (type.state || '').toLowerCase()
    };
}

function getSummaryTitle(summaryData) {
    const header = getObject(summaryData.header);

    return header.competition || header.shortName || header.linkText || 'Match Summary';
}

function getSummaryInfo(summaryData) {
    const headerCompetition = getSummaryHeader(summaryData);
    const venue = getObject(headerCompetition.venue);
    const address = getObject(venue.address);
    const series = getObject(headerCompetition.series);
    const notes = normalizeArray(headerCompetition.notes);
    const firstNote = getObject(notes[0]);

    return {
        series: series.fullName || series.shortName || '',
        venue: [venue.fullName, address.city, address.country].filter(Boolean).join(', '),
        date: headerCompetition.date || '',
        format: getObject(headerCompetition.format).abbreviation || getObject(headerCompetition.format).name || '',
        coverage: firstNote.headline || firstNote.summary || ''
    };
}

function renderSummaryHero(container, summaryData) {
    if (!container) {
        return;
    }

    const competitors = getSummaryCompetitors(summaryData);
    const teamA = normalizeSummaryTeam(competitors[0] || {});
    const teamB = normalizeSummaryTeam(competitors[1] || {});
    const status = getSummaryStatus(summaryData);
    const info = getSummaryInfo(summaryData);
    const tossText = getTossText(summaryData);

    container.innerHTML = `
        <section class="card summary-card">
            <div class="summary-top">
                <div>
                    <h1 class="summary-title">${escapeHtml(getSummaryTitle(summaryData))}</h1>
                    <div class="summary-subtitle">${escapeHtml(status.detail)}</div>
                </div>
                <div class="badge ${escapeHtml(status.category.includes('in') ? 'live' : status.category.includes('post') ? 'ok' : 'warn')}">
                    ${escapeHtml(info.format || 'Match')}
                </div>
            </div>

            <div class="info-list">
                <div class="info-item">
                    <div class="info-label">Series</div>
                    <div class="info-value">${escapeHtml(info.series || '—')}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Date</div>
                    <div class="info-value">${escapeHtml(formatDisplayDateTime(info.date) || '—')}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Venue</div>
                    <div class="info-value">${escapeHtml(info.venue || '—')}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Note</div>
                    <div class="info-value">${escapeHtml(tossText || info.coverage || '—')}</div>
                </div>
            </div>

            <div class="score-strip">
                <div class="score-box">
                    <div class="score-box-name">${escapeHtml(teamA.name)}</div>
                    <div class="score-box-value">${escapeHtml(teamA.score)}</div>
                    <div class="score-box-extra">${escapeHtml(teamA.linescore || teamA.record || '')}</div>
                </div>

                <div class="score-box">
                    <div class="score-box-name">${escapeHtml(teamB.name)}</div>
                    <div class="score-box-value">${escapeHtml(teamB.score)}</div>
                    <div class="score-box-extra">${escapeHtml(teamB.linescore || teamB.record || '')}</div>
                </div>
            </div>
        </section>
    `;
}

function getInningsTableRows(summaryData) {
    const boxscore = getObject(summaryData.boxscore);
    const players = normalizeArray(boxscore.players);

    if (players.length > 0) {
        const rows = [];

        players.forEach(function (teamGroup) {
            const team = getObject(teamGroup.team);
            const statistics = normalizeArray(teamGroup.statistics);

            statistics.forEach(function (statBlock) {
                const block = getObject(statBlock);
                const labels = normalizeArray(block.labels);
                const athletes = normalizeArray(block.athletes);

                athletes.forEach(function (athleteRow) {
                    const athleteData = getObject(athleteRow);
                    const athlete = getObject(athleteData.athlete);
                    const stats = normalizeArray(athleteData.stats);

                    rows.push({
                        team: team.displayName || team.shortDisplayName || 'Team',
                        player: athlete.displayName || athlete.shortName || 'Player',
                        role: block.name || block.displayName || '',
                        stats: labels.map(function (label, index) {
                            return label + ': ' + (stats[index] !== undefined ? stats[index] : '-');
                        }).join(' • ')
                    });
                });
            });
        });

        return rows;
    }

    const scoringPlays = normalizeArray(getObject(summaryData.scoringPlays));

    return scoringPlays.map(function (play) {
        const item = getObject(play);
        return {
            team: getObject(item.team).displayName || '',
            player: item.text || item.shortText || 'Play',
            role: item.period ? 'Innings ' + item.period.number : '',
            stats: item.clock ? item.clock.displayValue : ''
        };
    });
}

function renderInningsTable(container, summaryData) {
    if (!container) {
        return;
    }

    const rows = getInningsTableRows(summaryData);

    if (!rows || rows.length === 0) {
        renderState(container, createEmptyState('No detailed stats', 'This match does not expose a scorecard table from the current endpoint.'));
        return;
    }

    container.innerHTML = `
        <div class="table-wrap">
            <table class="table">
                <thead>
                    <tr>
                        <th>Team</th>
                        <th>Player / Item</th>
                        <th>Section</th>
                        <th>Stats</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows.map(function (row) {
                        return `
                            <tr>
                                <td>${escapeHtml(row.team || '')}</td>
                                <td><strong>${escapeHtml(row.player || '')}</strong></td>
                                <td>${escapeHtml(row.role || '')}</td>
                                <td>${escapeHtml(row.stats || '')}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function filterSeriesMatches(matches, seriesId) {
    return matches.filter(function (match) {
        const safeSeriesId = String(seriesId || '');
        return safeSeriesId && (
            String(match.id) === safeSeriesId ||
            String(match.seriesId) === safeSeriesId
        );
    });
}

document.addEventListener('DOMContentLoaded', function () {
    setActiveNav();
});
