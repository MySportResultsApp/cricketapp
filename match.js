document.addEventListener('DOMContentLoaded', function () {
    initMatchPage();
});

async function initMatchPage() {
    const matchId = getQueryParam('id');
    const matchIdBadge = document.getElementById('matchIdBadge');
    const summaryContainer = document.getElementById('matchSummary');
    const statsContainer = document.getElementById('matchStats');

    if (matchIdBadge) {
        matchIdBadge.textContent = matchId ? 'Match ID: ' + matchId : 'Match ID: missing';
    }

    if (!matchId) {
        renderState(summaryContainer, createEmptyState(
            'Match not specified',
            'Open this page from a match card so the page receives a real match id.'
        ));

        renderState(statsContainer, createEmptyState(
            'No stats available',
            'Match stats cannot be loaded because no match id was provided.'
        ));

        return;
    }

    renderState(summaryContainer, createLoaderState(
        'Loading match summary',
        'Getting live cricket match details for match ' + matchId + '.'
    ));

    renderState(statsContainer, createLoaderState(
        'Loading score details',
        'Preparing the available scorecard and match stats.'
    ));

    try {
        const summaryData = await fetchMatchSummary(matchId);

        renderSummaryHero(summaryContainer, summaryData);
        renderInningsTable(statsContainer, summaryData);
        updateMatchPageTitle(summaryData);
    } catch (error) {
        console.error('=MATCH ERROR=', error);

        renderState(summaryContainer, createErrorState(
            'Failed to load match summary',
            'Could not fetch cricket match details for match ' + matchId + '.'
        ));

        renderState(statsContainer, createErrorState(
            'Failed to load match stats',
            'Could not fetch the scorecard or detailed stats for this match.'
        ));
    }
}

function updateMatchPageTitle(summaryData) {
    const title = getSummaryTitle(summaryData);

    if (title) {
        document.title = title + ' | Cricket Live';
    }
}
