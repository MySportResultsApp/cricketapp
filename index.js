document.addEventListener('DOMContentLoaded', function () {
    initHomePage();
});

async function initHomePage() {
    const liveContainer = document.getElementById('liveMatches');
    const upcomingContainer = document.getElementById('upcomingMatches');
    const finishedContainer = document.getElementById('finishedMatches');
    const newsContainer = document.getElementById('newsGrid');

    const liveBadge = document.getElementById('liveCountBadge');
    const dateBadge = document.getElementById('todayDateBadge');

    try {
        // Дата
        const now = new Date();
        dateBadge.textContent = now.toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });

        // ===== MATCHES =====
        const matches = await fetchCurrentMatches();

        const grouped = splitMatchesByStatus(matches);

        const liveMatches = grouped.live || [];
        const upcomingMatches = grouped.upcoming || [];
        const finishedMatches = grouped.finished || [];

        // BADGE
        if (liveMatches.length > 0) {
            liveBadge.textContent = liveMatches.length + ' live match' + (liveMatches.length > 1 ? 'es' : '');
        } else {
            liveBadge.textContent = 'No live matches now';
        }

        // LIVE
        renderMatchCards(
            liveContainer,
            liveMatches,
            'No live matches',
            'There are currently no live cricket matches.'
        );

        // UPCOMING (ограничим, чтобы не было мусора)
        renderMatchCards(
            upcomingContainer,
            upcomingMatches.slice(0, 10),
            'No upcoming matches',
            'No scheduled matches found.'
        );

        // FINISHED (последние)
        renderMatchCards(
            finishedContainer,
            finishedMatches.slice(0, 10),
            'No recent results',
            'No recently finished matches found.'
        );

    } catch (error) {
        console.error('=INDEX MATCH ERROR=', error);

        renderState(liveContainer, createErrorState(
            'Failed to load matches',
            'Could not fetch live cricket data.'
        ));

        renderState(upcomingContainer, createErrorState(
            'Failed to load schedule',
            'Could not fetch upcoming matches.'
        ));

        renderState(finishedContainer, createErrorState(
            'Failed to load results',
            'Could not fetch finished matches.'
        ));
    }

    // ===== NEWS =====
    try {
        const articles = await fetchCricketNews();

        renderArticleCards(
            newsContainer,
            articles.slice(0, 12),
            'No articles',
            'No cricket news available right now.'
        );

    } catch (error) {
        console.error('=INDEX NEWS ERROR=', error);

        renderState(newsContainer, createErrorState(
            'Failed to load news',
            'Could not fetch cricket articles.'
        ));
    }
}
