document.addEventListener('DOMContentLoaded', function () {
    initNewsPage();
});

let ALL_ARTICLES = [];

async function initNewsPage() {
    const newsContainer = document.getElementById('newsGrid');
    const countBadge = document.getElementById('articlesCountBadge');
    const sourcesBadge = document.getElementById('sourcesBadge');

    const searchInput = document.getElementById('searchInput');
    const clearButton = document.getElementById('clearSearchButton');

    renderState(newsContainer, createLoaderState(
        'Loading news',
        'Fetching cricket articles with images...'
    ));

    try {
        const articles = await fetchCricketNewsFeed();

        // пробуем подтянуть картинки, если где-то нет
        await enrichMissingImages(articles);

        ALL_ARTICLES = articles;

        renderArticleCards(
            newsContainer,
            articles,
            'No articles',
            'No cricket news available right now.'
        );

        updateBadges(countBadge, sourcesBadge, articles);

    } catch (error) {
        console.error('=NEWS ERROR=', error);

        renderState(newsContainer, createErrorState(
            'Failed to load news',
            'Could not fetch cricket articles from feeds.'
        ));

        if (countBadge) {
            countBadge.textContent = 'Load failed';
        }

        if (sourcesBadge) {
            sourcesBadge.textContent = 'Sources unavailable';
        }
    }

    // ===== SEARCH =====
    searchInput.addEventListener('input', function () {
        const query = searchInput.value;

        const filtered = filterArticles(ALL_ARTICLES, query);

        renderArticleCards(
            newsContainer,
            filtered,
            'No results',
            'No articles match your search.'
        );

        if (countBadge) {
            countBadge.textContent = filtered.length + ' result' + (filtered.length !== 1 ? 's' : '');
        }
    });

    clearButton.addEventListener('click', function () {
        searchInput.value = '';

        renderArticleCards(
            newsContainer,
            ALL_ARTICLES,
            'No articles',
            'No cricket news available.'
        );

        if (countBadge) {
            countBadge.textContent = ALL_ARTICLES.length + ' article' + (ALL_ARTICLES.length !== 1 ? 's' : '');
        }
    });
}

function updateBadges(countBadge, sourcesBadge, articles) {
    if (countBadge) {
        countBadge.textContent = articles.length + ' article' + (articles.length !== 1 ? 's' : '');
    }

    if (sourcesBadge) {
        const uniqueSources = [...new Set(articles.map(a => a.sourceName))];
        sourcesBadge.textContent = uniqueSources.join(' • ');
    }
}
