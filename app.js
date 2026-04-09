const NEWS_SOURCES = [
    {
        key: 'espncricinfo',
        title: 'ESPNcricinfo',
        url: 'https://www.espncricinfo.com/rss/content/story/feeds/0.xml'
    },
    {
        key: 'bbc-cricket',
        title: 'BBC Sport Cricket',
        url: 'https://feeds.bbci.co.uk/sport/cricket/rss.xml'
    }
];

const REQUEST_CONFIG = {
    timeoutMs: 18000,
    imageEnrichLimit: 8,
    localCacheKey: 'cricket_news_cache_v1',
    localCacheTtlMs: 10 * 60 * 1000
};

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

function createLoaderState(title, text) {
    return `
        <div class="state-box">
            <div class="loader"></div>
            <div class="state-title">${escapeHtml(title || 'Loading')}</div>
            <div class="state-text">${escapeHtml(text || 'Please wait while news is loading.')}</div>
        </div>
    `;
}

function createEmptyState(title, text) {
    return `
        <div class="state-box">
            <div class="state-title">${escapeHtml(title || 'Nothing found')}</div>
            <div class="state-text">${escapeHtml(text || 'No articles were found.')}</div>
        </div>
    `;
}

function createErrorState(title, text) {
    return `
        <div class="state-box">
            <div class="state-title">${escapeHtml(title || 'Failed to load')}</div>
            <div class="state-text">${escapeHtml(text || 'Could not load the source feed.')}</div>
        </div>
    `;
}

function renderState(container, html) {
    if (!container) {
        return;
    }

    container.innerHTML = html;
}

function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
}

function setActiveNav() {
    const page = window.location.pathname.split('/').pop() || 'index.html';
    const links = document.querySelectorAll('[data-nav]');

    links.forEach(function (link) {
        const href = link.getAttribute('href') || '';
        link.classList.toggle('active', href === page);
    });
}

function normalizeText(value) {
    if (!value) {
        return '';
    }

    return String(value).replace(/\s+/g, ' ').trim();
}

function stripHtml(html) {
    if (!html) {
        return '';
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString('<div>' + html + '</div>', 'text/html');
    return normalizeText(doc.body.textContent || '');
}

function decodeHtmlEntities(value) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(value || '', 'text/html');
    return doc.documentElement.textContent || '';
}

function safeArrayFromNodeList(nodeList) {
    return Array.prototype.slice.call(nodeList || []);
}

function getStorageCache() {
    try {
        const raw = localStorage.getItem(REQUEST_CONFIG.localCacheKey);

        if (!raw) {
            return {};
        }

        return JSON.parse(raw);
    } catch (error) {
        return {};
    }
}

function setStorageCache(data) {
    try {
        localStorage.setItem(REQUEST_CONFIG.localCacheKey, JSON.stringify(data));
    } catch (error) {
    }
}

function getCachedFeed(sourceKey) {
    const cache = getStorageCache();
    const entry = cache[sourceKey];

    if (!entry || !entry.savedAt || !entry.articles) {
        return null;
    }

    if (Date.now() - entry.savedAt > REQUEST_CONFIG.localCacheTtlMs) {
        return null;
    }

    return entry.articles;
}

function setCachedFeed(sourceKey, articles) {
    const cache = getStorageCache();

    cache[sourceKey] = {
        savedAt: Date.now(),
        articles: articles
    };

    setStorageCache(cache);
}

function timeoutPromise(ms) {
    return new Promise(function (_, reject) {
        setTimeout(function () {
            reject(new Error('Request timeout'));
        }, ms);
    });
}

async function fetchTextWithTimeout(url) {
    const request = fetch(url, {
        method: 'GET',
        headers: {
            'Accept': 'text/plain, application/xml, text/xml, text/html, */*'
        }
    }).then(function (response) {
        if (!response.ok) {
            throw new Error('Request failed with status ' + response.status);
        }

        return response.text();
    });

    return await Promise.race([
        request,
        timeoutPromise(REQUEST_CONFIG.timeoutMs)
    ]);
}

function buildProxyUrls(targetUrl) {
    return [
        targetUrl,
        'https://api.allorigins.win/raw?url=' + encodeURIComponent(targetUrl),
        'https://api.allorigins.win/get?url=' + encodeURIComponent(targetUrl)
    ];
}

async function fetchFirstWorkingText(urls) {
    let lastError = null;

    for (let i = 0; i < urls.length; i += 1) {
        try {
            const raw = await fetchTextWithTimeout(urls[i]);

            if (urls[i].includes('/get?url=')) {
                const parsed = JSON.parse(raw);

                if (parsed && parsed.contents) {
                    return parsed.contents;
                }
            } else {
                return raw;
            }
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError || new Error('All feed requests failed');
}

async function fetchXmlDocument(url) {
    const text = await fetchFirstWorkingText(buildProxyUrls(url));
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, 'application/xml');

    if (xml.querySelector('parsererror')) {
        throw new Error('Failed to parse XML');
    }

    return xml;
}

function getTagText(parent, selectors) {
    if (!parent) {
        return '';
    }

    for (let i = 0; i < selectors.length; i += 1) {
        const node = parent.querySelector(selectors[i]);

        if (node && node.textContent) {
            return normalizeText(node.textContent);
        }
    }

    return '';
}

function getAttrValue(parent, selectors, attrName) {
    if (!parent) {
        return '';
    }

    for (let i = 0; i < selectors.length; i += 1) {
        const node = parent.querySelector(selectors[i]);

        if (node) {
            const value = node.getAttribute(attrName);

            if (value) {
                return value.trim();
            }
        }
    }

    return '';
}

function parseImageFromHtmlSnippet(snippet) {
    if (!snippet) {
        return '';
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString('<div>' + snippet + '</div>', 'text/html');

    const img = doc.querySelector('img');

    if (img) {
        const src = img.getAttribute('src') || img.getAttribute('data-src');

        if (src) {
            return src.trim();
        }
    }

    return '';
}

function buildArticleId(sourceKey, link, title) {
    return sourceKey + '|' + (link || title || Math.random());
}

function parseRssItems(xml, source) {
    const items = safeArrayFromNodeList(xml.querySelectorAll('item'));

    return items.map(function (item) {
        const title = decodeHtmlEntities(getTagText(item, ['title']));
        const link = getTagText(item, ['link']);
        const published = getTagText(item, ['pubDate', 'published', 'updated']);
        const rawDescription = getTagText(item, ['description', 'content\\:encoded', 'encoded']);
        const sourceName = source.title;

        const image =
            getAttrValue(item, ['media\\:content', 'content'], 'url') ||
            getAttrValue(item, ['media\\:thumbnail', 'thumbnail'], 'url') ||
            getAttrValue(item, ['enclosure'], 'url') ||
            parseImageFromHtmlSnippet(rawDescription);

        const textDescription = stripHtml(rawDescription);

        return {
            id: buildArticleId(source.key, link, title),
            sourceKey: source.key,
            sourceName: sourceName,
            title: title || 'Untitled article',
            link: link || '',
            published: published || '',
            description: textDescription || '',
            image: image || '',
            rawDescription: rawDescription || ''
        };
    }).filter(function (article) {
        return article.title && article.link;
    });
}

function sortArticlesByDate(items) {
    return items.slice().sort(function (a, b) {
        const first = new Date(a.published).getTime();
        const second = new Date(b.published).getTime();

        if (Number.isNaN(first) && Number.isNaN(second)) {
            return 0;
        }

        if (Number.isNaN(first)) {
            return 1;
        }

        if (Number.isNaN(second)) {
            return -1;
        }

        return second - first;
    });
}

function uniqueArticles(items) {
    const used = new Set();
    const result = [];

    items.forEach(function (item) {
        const key = (item.link || '') + '|' + (item.title || '');

        if (used.has(key)) {
            return;
        }

        used.add(key);
        result.push(item);
    });

    return result;
}

async function fetchArticlesFromSource(source) {
    const cached = getCachedFeed(source.key);

    if (cached && cached.length > 0) {
        return cached;
    }

    const xml = await fetchXmlDocument(source.url);
    const articles = parseRssItems(xml, source);

    setCachedFeed(source.key, articles);

    return articles;
}

async function fetchCricketNewsFeed() {
    const results = await Promise.allSettled(
        NEWS_SOURCES.map(function (source) {
            return fetchArticlesFromSource(source);
        })
    );

    const merged = [];
    const errors = [];

    results.forEach(function (result, index) {
        if (result.status === 'fulfilled') {
            merged.push.apply(merged, result.value);
        } else {
            errors.push({
                source: NEWS_SOURCES[index].title,
                error: result.reason
            });
        }
    });

    const items = sortArticlesByDate(uniqueArticles(merged));

    if (items.length === 0) {
        const detail = errors.map(function (entry) {
            return entry.source;
        }).join(', ');

        throw new Error('No feeds available' + (detail ? ': ' + detail : ''));
    }

    return items;
}

function getImageCandidatesFromHtml(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html || '', 'text/html');
    const selectors = [
        'meta[property="og:image"]',
        'meta[name="twitter:image"]',
        'meta[property="twitter:image"]',
        'img'
    ];

    for (let i = 0; i < selectors.length; i += 1) {
        const node = doc.querySelector(selectors[i]);

        if (!node) {
            continue;
        }

        if (node.tagName.toLowerCase() === 'meta') {
            const content = node.getAttribute('content');

            if (content) {
                return content.trim();
            }
        }

        if (node.tagName.toLowerCase() === 'img') {
            const src = node.getAttribute('src') || node.getAttribute('data-src');

            if (src && /^https?:\/\//i.test(src)) {
                return src.trim();
            }
        }
    }

    return '';
}

async function enrichMissingImages(articles) {
    const queue = articles
        .filter(function (article) {
            return !article.image && article.link;
        })
        .slice(0, REQUEST_CONFIG.imageEnrichLimit);

    const jobs = queue.map(async function (article) {
        try {
            const html = await fetchFirstWorkingText(buildProxyUrls(article.link));
            const image = getImageCandidatesFromHtml(html);

            if (image) {
                article.image = image;
            }
        } catch (error) {
        }
    });

    await Promise.allSettled(jobs);
    return articles;
}

function renderArticleCard(article) {
    const imageBlock = article.image
        ? `
            <a href="${escapeHtml(article.link)}" target="_blank" rel="noopener noreferrer" class="article-image-link">
                <img class="article-image" src="${escapeHtml(article.image)}" alt="${escapeHtml(article.title)}" loading="lazy">
            </a>
        `
        : `
            <div class="article-image article-image-placeholder">
                <span>No image</span>
            </div>
        `;

    return `
        <article class="card article-card">
            ${imageBlock}
            <div class="card-body">
                <div class="article-title">${escapeHtml(article.title)}</div>
                <div class="article-meta">
                    ${escapeHtml(article.sourceName)}
                    ${article.published ? ' • ' + escapeHtml(formatDisplayDateTime(article.published)) : ''}
                </div>
                <div class="article-desc">${escapeHtml(article.description || 'Open the article to read more.')}</div>
                <a class="article-link" href="${escapeHtml(article.link)}" target="_blank" rel="noopener noreferrer">Open Article</a>
            </div>
        </article>
    `;
}

function renderArticleCards(container, articles, emptyTitle, emptyText) {
    if (!container) {
        return;
    }

    if (!articles || articles.length === 0) {
        renderState(container, createEmptyState(emptyTitle, emptyText));
        return;
    }

    container.innerHTML = articles.map(renderArticleCard).join('');
}

function filterArticles(items, query) {
    const safeQuery = normalizeText(query).toLowerCase();

    if (!safeQuery) {
        return items.slice();
    }

    return items.filter(function (article) {
        const haystack = [
            article.title,
            article.description,
            article.sourceName
        ].join(' ').toLowerCase();

        return haystack.includes(safeQuery);
    });
}

function getArticleById(items, articleId) {
    return items.find(function (item) {
        return String(item.id) === String(articleId);
    }) || null;
}

document.addEventListener('DOMContentLoaded', function () {
    setActiveNav();
});
