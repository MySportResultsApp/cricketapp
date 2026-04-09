const MLB_API_BASE = 'https://statsapi.mlb.com/api/v1';
const MLB_LIVE_API_BASE = 'https://statsapi.mlb.com/api/v1.1';

function buildUrl(base, path, params = {}) {
    const url = new URL(base + path);
    Object.keys(params).forEach(function (key) {
        const value = params[key];
        if (value !== undefined && value !== null && value !== '') {
            url.searchParams.set(key, value);
        }
    });
    return url.toString();
}

async function fetchJson(url) {
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Accept': 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error('Request failed: ' + response.status);
    }

    return await response.json();
}

function formatDateForApi(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
}

function formatDateForInput(date) {
    return formatDateForApi(date);
}

function formatDisplayDate(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString(undefined, {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatGameTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit'
    });
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

function getTodayDateString() {
    return formatDateForApi(new Date());
}

function getStatusText(game) {
    if (!game || !game.status || !game.status.detailedState) {
        return 'Unknown';
    }

    return game.status.detailedState;
}

function getShortStatusClass(game) {
    const text = getStatusText(game).toLowerCase();

    if (text.includes('final')) {
        return 'final';
    }

    if (text.includes('progress') || text.includes('live') || text.includes('manager challenge') || text.includes('review')) {
        return 'live';
    }

    return 'upcoming';
}

function getAwayTeam(game) {
    if (!game || !game.teams || !game.teams.away) {
        return null;
    }

    return game.teams.away;
}

function getHomeTeam(game) {
    if (!game || !game.teams || !game.teams.home) {
        return null;
    }

    return game.teams.home;
}

function getTeamName(teamBlock) {
    if (!teamBlock || !teamBlock.team || !teamBlock.team.name) {
        return 'Unknown Team';
    }

    return teamBlock.team.name;
}

function getTeamScore(teamBlock) {
    if (!teamBlock) {
        return '-';
    }

    if (typeof teamBlock.score === 'number') {
        return teamBlock.score;
    }

    return '-';
}

async function fetchScheduleByDate(dateString) {
    const url = buildUrl(MLB_API_BASE, '/schedule', {
        sportId: 1,
        date: dateString,
        hydrate: 'team'
    });

    const data = await fetchJson(url);

    if (!data.dates || data.dates.length === 0) {
        return [];
    }

    return data.dates[0].games || [];
}

async function fetchTeams() {
    const url = buildUrl(MLB_API_BASE, '/teams', {
        sportId: 1
    });

    const data = await fetchJson(url);
    return data.teams || [];
}

async function fetchGameLiveData(gamePk) {
    const url = buildUrl(MLB_LIVE_API_BASE, '/game/' + gamePk + '/feed/live');
    return await fetchJson(url);
}

function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
}

function showLoader(container, text = 'Loading...') {
    if (!container) {
        return;
    }

    container.innerHTML = '<div class="loader">' + escapeHtml(text) + '</div>';
}

function showEmpty(container, text = 'Nothing found.') {
    if (!container) {
        return;
    }

    container.innerHTML = '<div class="empty">' + escapeHtml(text) + '</div>';
}

function showError(container, text = 'Failed to load data.') {
    if (!container) {
        return;
    }

    container.innerHTML = '<div class="empty">' + escapeHtml(text) + '</div>';
}

function renderGameCard(game) {
    const awayTeam = getAwayTeam(game);
    const homeTeam = getHomeTeam(game);
    const statusText = getStatusText(game);
    const gameTime = game && game.gameDate ? formatGameTime(game.gameDate) : '';
    const gamePk = game && game.gamePk ? game.gamePk : '';

    return `
        <div class="game-card">
            <div class="game-header">
                <div class="game-status">${escapeHtml(statusText)}</div>
                <div class="game-status">${escapeHtml(gameTime)}</div>
            </div>

            <div class="teams">
                <div class="team">
                    <div class="team-name">${escapeHtml(getAwayTeamNameShort(awayTeam))}</div>
                    <div class="team-score">${escapeHtml(getTeamScore(awayTeam))}</div>
                </div>

                <div class="vs">vs</div>

                <div class="team">
                    <div class="team-name">${escapeHtml(getHomeTeamNameShort(homeTeam))}</div>
                    <div class="team-score">${escapeHtml(getTeamScore(homeTeam))}</div>
                </div>
            </div>

            <a class="button" href="game.html?gamePk=${encodeURIComponent(gamePk)}">Open Game</a>
        </div>
    `;
}

function getAwayTeamNameShort(teamBlock) {
    if (!teamBlock || !teamBlock.team) {
        return 'Away';
    }

    return teamBlock.team.abbreviation || teamBlock.team.name || 'Away';
}

function getHomeTeamNameShort(teamBlock) {
    if (!teamBlock || !teamBlock.team) {
        return 'Home';
    }

    return teamBlock.team.abbreviation || teamBlock.team.name || 'Home';
}

function renderGamesList(container, games) {
    if (!container) {
        return;
    }

    if (!games || games.length === 0) {
        showEmpty(container, 'No games found.');
        return;
    }

    let html = '';

    games.forEach(function (game) {
        html += renderGameCard(game);
    });

    container.innerHTML = html;
}

function renderTeamsList(container, teams) {
    if (!container) {
        return;
    }

    if (!teams || teams.length === 0) {
        showEmpty(container, 'No teams found.');
        return;
    }

    let html = '<div class="team-list">';

    teams.forEach(function (team) {
        html += `
            <div class="team-card">
                <div>${escapeHtml(team.name || 'Unknown Team')}</div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

function renderInnings(linescore) {
    if (!linescore || !linescore.innings || linescore.innings.length === 0) {
        return '<div class="empty">No inning data available.</div>';
    }

    let html = '<div class="innings">';

    linescore.innings.forEach(function (inning) {
        const inningNumber = inning.num !== undefined ? inning.num : '-';
        const awayRuns = inning.away && inning.away.runs !== undefined ? inning.away.runs : '-';
        const homeRuns = inning.home && inning.home.runs !== undefined ? inning.home.runs : '-';

        html += `
            <div class="inning-row">
                <span>Inning ${escapeHtml(inningNumber)}</span>
                <span>Away: ${escapeHtml(awayRuns)}</span>
                <span>Home: ${escapeHtml(homeRuns)}</span>
            </div>
        `;
    });

    html += '</div>';
    return html;
}
