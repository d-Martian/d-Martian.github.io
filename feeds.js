/**
 * RSS Feed Aggregator for Monero
 * Improved version with better security, error handling, and performance
 */

// Configuration object for feed limits and settings
const CONFIG = {
  MAX_LISTINGS_PER_FEED: 10,
  PROXY_URL: 'https://rss.xmrdance.trade/proxy',
  MONTHS: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  TELEGRAM_HASHTAGS: ['#selling', '#buying', '#trade', '#service'],
  MARKET_FILTER_REGEX: /WTB|WTS|LTH|AFH/i,
  EVENT_EXPIRY_MS: 86400000, // 24 hours
  MONERICA_SLICE_START: 14,
  MONERICA_SLICE_END: 24
};

// Safe HTML element creation with text content (prevents XSS)
function createSafeLink(href, title, text) {
  try {
    const link = document.createElement('a');
    link.href = href;
    link.title = title;
    link.textContent = text; // Use textContent, not innerHTML
    return link;
  } catch (e) {
    console.error('Error creating link:', e);
    return null;
  }
}

// Add listing to DOM safely
function addListing(item) {
  try {
    if (!item.title || !item.link || !item.market) {
      console.warn('Invalid listing item:', item);
      return;
    }

    const marketElement = document.getElementById(item.market);
    if (!marketElement) {
      console.warn(`Market element not found: ${item.market}`);
      return;
    }

    // Create list item and link safely
    const li = document.createElement('li');
    li.className = 'listing-title';
    
    const link = createSafeLink(item.link, item.title, item.title);
    if (link) {
      li.appendChild(link);
    }

    // Create container div
    const listingEntry = document.createElement('div');
    listingEntry.className = 'single_listing';
    listingEntry.setAttribute('data-timestamp', item.timestamp);
    listingEntry.appendChild(li);

    // Add to DOM
    marketElement.appendChild(listingEntry);

    // Remove loading indicator
    const boxElement = document.getElementById(`${item.market}_box`);
    if (boxElement) {
      boxElement.classList.remove('loading-bg');
    }
  } catch (e) {
    console.error('Error adding listing:', e, item);
  }
}

// Get all marketplace configurations
function getMarketplaces() {
  return [
    { name: 'blockchain_stats', feed: 'https://xmrchain.net/', format: 'scraper' },
    { name: 'blockchain_monthly_txs', feed: 'https://localmonero.co/blocks/stats/transactions/m/12', format: 'scraper' },
    { name: 'price_in_usd', feed: 'https://agoradesk.com/api/v1/moneroaverage/USD', format: 'api' },
    { name: 'price_in_btc', feed: 'https://agoradesk.com/api/v1/moneroaverage/BTC', format: 'api' },
    { name: 'events_calendar', feed: 'https://monero.observer/feed-calendar.xml', format: 'rss' },
    { name: 'monero_observer_news', feed: 'https://monero.observer/feed-mini.xml', format: 'rss' },
    { name: 'revuo_monero', feed: 'https://revuo-xmr.com/atom.xml', format: 'atom' },
    { name: 'monero_talk', feed: 'https://feeds.fireside.fm/monerotalk/rss', format: 'rss' },
    { name: 'monero_research', feed: 'https://moneroresearch.info/index.php?action=rss_RSS_CORE&method=rss20', format: 'rss' },
    { name: 'monero_moon', feed: 'https://www.themoneromoon.com/feed', format: 'rss' },
    { name: 'monero_standard', feed: 'https://localmonero.co/static/rss/the-monero-standard/feed.xml', format: 'rss' },
    { name: 'monero_bounties', feed: 'https://bounties.monero.social/api/v1/posts?view=trending', format: 'api' },
    { name: 'ccs', feed: 'https://ccs.getmonero.org/funding-required/', format: 'scraper' },
    { name: 'monerochan_news', feed: 'https://monerochan.news', format: 'scraper' },
    { name: 'monerochan_forum', feed: 'https://forum.monerochan.news/latest/', format: 'scraper' },
    { name: 'bitejo', feed: 'https://bitejo.com/rss', format: 'rss' },
    { name: 'count_bitejo', feed: 'https://bitejo.com', format: 'scraper' },
    { name: 'monero_market_io', feed: 'https://moneromarket.io', format: 'scraper' },
    { name: 'count_monero_market_io', feed: 'https://moneromarket.io', format: 'scraper' },
    { name: 'accepted_here', feed: 'https://acceptedhere.io/catalog/company/?currency=xmr&', format: 'scraper' },
    { name: 'count_accepted_here', feed: 'https://acceptedhere.io/catalog/currency/xmr/', format: 'scraper' },
    { name: 'monerica', feed: 'https://monerica.com', format: 'scraper' },
    { name: 'count_monerica', feed: 'https://monerica.com', format: 'scraper' },
    { name: 'monero_observer_market', feed: 'https://monero.observer/feed-messages.xml', format: 'rss' },
    { name: 'telegram_monero_market', feed: 'https://tg.i-c-a.su/rss/moneromarket?limit=50', format: 'rss' },
    { name: 'reddit_monero_market', feed: 'https://www.reddit.com/r/moneromarket.rss', format: 'atom' },
    { name: 'twitter_monero', feed: 'https://nitter.net/monero/rss', format: 'rss' },
    { name: 'reddit_monero', feed: 'https://www.reddit.com/r/monero.rss', format: 'atom' }
  ];
}

// Safely extract regex group
function safeRegexExec(regex, text, groupIndex = 1) {
  try {
    const match = regex.exec(text);
    return match ? match[groupIndex] : null;
  } catch (e) {
    console.error('Regex execution error:', e);
    return null;
  }
}

// Safely parse JSON
function safeJsonParse(json) {
  try {
    return JSON.parse(json);
  } catch (e) {
    console.error('JSON parse error:', e);
    return null;
  }
}

// Fetch and process a single market feed
async function fetchMarketFeed(market) {
  try {
    const url = `${CONFIG.PROXY_URL}?url=${encodeURIComponent(market.feed)}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`Failed to fetch ${market.name}: ${response.status}`);
      return;
    }

    const xmlText = await response.text();

    switch (market.format) {
      case 'scraper':
        await processScraper(market, xmlText);
        break;
      case 'api':
        await processApi(market, xmlText);
        break;
      case 'rss':
      case 'atom':
        await processFeed(market, xmlText);
        break;
      default:
        console.warn(`Unknown format: ${market.format}`);
    }
  } catch (e) {
    console.error(`Error fetching ${market.name}:`, e);
  }
}

// Process scraper-based data
async function processScraper(market, htmlText) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');

    const handlers = {
      ccs: () => processCcs(doc),
      monerochan_news: () => processMoneroChangNews(doc),
      monerochan_forum: () => processMoneroChangForum(doc),
      monero_market_io: () => processMoneroMarketIo(doc),
      accepted_here: () => processAcceptedHere(doc),
      monerica: () => processMonerica(doc),
      count_monero_market_io: () => updateMoneroMarketCount(doc),
      count_monerica: () => updateMonericaCount(doc),
      count_accepted_here: () => updateAcceptedHereCount(doc),
      count_bitejo: () => updateBitejoCount(doc),
      blockchain_monthly_txs: () => updateBlockchainMonthlyTxs(doc),
      blockchain_stats: () => updateBlockchainStats(doc)
    };

    if (handlers[market.name]) {
      handlers[market.name]();
    }
  } catch (e) {
    console.error(`Error processing scraper for ${market.name}:`, e);
  }
}

// Scraper handlers
function processCcs(doc) {
  const listings = [];
  const ccsList = doc.querySelectorAll('.fund-required a');
  
  ccsList.forEach(el => {
    try {
      const h3 = el.querySelector('h3');
      const funded = el.querySelector('.progress-number-funded');
      const goal = el.querySelector('.progress-number-goal');
      
      if (h3 && funded && goal) {
        const title = `${h3.textContent} - ${funded.textContent}/${goal.textContent} XMR`;
        const link = `https://ccs.getmonero.org/funding-required${el.getAttribute('href')}`;
        listings.push({
          title,
          timestamp: Math.floor(Date.now() / 1000),
          link,
          market: 'ccs'
        });
      }
    } catch (e) {
      console.error('Error processing CCS item:', e);
    }
  });

  displayListings(listings);
}

function processMoneroChangNews(doc) {
  const listings = [];
  const newsList = doc.querySelectorAll('a[href*="article"]');
  
  newsList.forEach(el => {
    try {
      const h1 = el.querySelector('h1');
      if (h1 && h1.textContent.trim()) {
        const link = `https://monerochan.news${el.getAttribute('href')}`;
        listings.push({
          title: h1.textContent.trim(),
          timestamp: Math.floor(Date.now() / 1000),
          link,
          market: 'monerochan_news'
        });
      }
    } catch (e) {
      console.error('Error processing Monerochan news item:', e);
    }
  });

  displayListings(listings);
}

function processMoneroChangForum(doc) {
  const listings = [];
  const forumList = doc.querySelectorAll('a.title.raw-topic-link');
  
  forumList.forEach(el => {
    try {
      const title = el.textContent.trim();
      if (title) {
        listings.push({
          title,
          timestamp: Math.floor(Date.now() / 1000),
          link: el.getAttribute('href'),
          market: 'monerochan_forum'
        });
      }
    } catch (e) {
      console.error('Error processing Monerochan forum item:', e);
    }
  });

  displayListings(listings);
}

function processMoneroMarketIo(doc) {
  const listings = [];
  const marketList = doc.querySelectorAll('a[href*="listing"]');
  
  marketList.forEach(el => {
    try {
      const desc = el.querySelector('.desc');
      const title = desc ? desc.textContent.trim() : '';
      if (title) {
        listings.push({
          title,
          timestamp: Math.floor(Date.now() / 1000),
          link: `https://moneromarket.io${el.getAttribute('href')}`,
          market: 'monero_market_io'
        });
      }
    } catch (e) {
      console.error('Error processing Monero Market item:', e);
    }
  });

  displayListings(listings);
}

function processAcceptedHere(doc) {
  const listings = [];
  const acceptedList = doc.querySelectorAll('.col-lg-7 a[href*="company"]');
  
  acceptedList.forEach(el => {
    try {
      const h5 = el.querySelector('h5');
      const title = h5 ? h5.textContent.trim() : '';
      if (title) {
        listings.push({
          title,
          timestamp: Math.floor(Date.now() / 1000),
          link: el.getAttribute('href'),
          market: 'accepted_here'
        });
      }
    } catch (e) {
      console.error('Error processing Accepted Here item:', e);
    }
  });

  displayListings(listings);
}

function processMonerica(doc) {
  const listings = [];
  const allLinks = doc.querySelectorAll('li a');
  const monericaLinks = Array.from(allLinks).slice(
    CONFIG.MONERICA_SLICE_START,
    CONFIG.MONERICA_SLICE_END
  );
  
  monericaLinks.forEach(el => {
    try {
      const title = el.textContent.trim();
      if (title) {
        listings.push({
          title,
          timestamp: Math.floor(Date.now() / 1000),
          link: el.getAttribute('href'),
          market: 'monerica'
        });
      }
    } catch (e) {
      console.error('Error processing Monerica item:', e);
    }
  });

  displayListings(listings);
}

function updateMoneroMarketCount(doc) {
  try {
    const stats = doc.querySelectorAll('#categories a span');
    let total = 0;
    stats.forEach(el => {
      const num = parseInt(el.textContent.replace(/\D/g, '')) || 0;
      total += num;
    });
    const countEl = document.getElementById('monero_market_count');
    if (countEl) countEl.textContent = total;
  } catch (e) {
    console.error('Error updating monero market count:', e);
  }
}

function updateMonericaCount(doc) {
  try {
    const count = doc.querySelectorAll('li a').length;
    const countEl = document.getElementById('monerica_count');
    if (countEl) countEl.textContent = count;
  } catch (e) {
    console.error('Error updating monerica count:', e);
  }
}

function updateAcceptedHereCount(doc) {
  try {
    const el = doc.querySelector('.currency-stats span:nth-child(2)');
    if (el) {
      const count = el.textContent.replace(/\D/g, '');
      const countEl = document.getElementById('accepted_here_count');
      if (countEl) countEl.textContent = count;
    }
  } catch (e) {
    console.error('Error updating accepted here count:', e);
  }
}

function updateBitejoCount(doc) {
  try {
    const el = doc.querySelector('a[href*="search/currency/monero"] span');
    if (el) {
      const count = el.textContent.replace(/\D/g, '');
      const countEl = document.getElementById('bitejo_count');
      if (countEl) countEl.textContent = count;
    }
  } catch (e) {
    console.error('Error updating bitejo count:', e);
  }
}

function updateBlockchainMonthlyTxs(doc) {
  try {
    const el = doc.querySelector('.data-table tr:nth-child(1) td:nth-child(2)');
    if (el) {
      const count = el.textContent.replace(/\D/g, '');
      const statsEl = document.getElementById('stats_monthly_txs');
      if (statsEl) statsEl.textContent = count;
    }
  } catch (e) {
    console.error('Error updating blockchain monthly txs:', e);
  }
}

function updateBlockchainStats(doc) {
  try {
    const text = doc.body.textContent.split('age [h:m:s]')[0].replace(/[\n\r]/g, ' ');
    
    const statsMap = {
      stats_version: [/GUI\s+(.*?)\s/, 1, 'text'],
      stats_block_height: [/as of\s+(.*?)\s+block/, 1, 'text'],
      stats_hash_rate: [/Hash rate:\s+(.*?)\s/, 1, ' GH/s'],
      stats_fee: [/Fee per byte:\s+(.*?)\s/, 1, ' XMR'],
      stats_emission: [/Monero emission.*?is\s+(.*?)\s/, 1, ' XMR']
    };

    Object.entries(statsMap).forEach(([elementId, [regex, groupIdx, suffix]]) => {
      const value = safeRegexExec(regex, text, groupIdx);
      if (value) {
        const el = document.getElementById(elementId);
        if (el) {
          el.textContent = suffix === 'text' ? value : value + suffix;
        }
      }
    });
  } catch (e) {
    console.error('Error updating blockchain stats:', e);
  }
}

// Process API-based data
async function processApi(market, jsonText) {
  try {
    const data = safeJsonParse(jsonText);
    if (!data) {
      console.error(`Failed to parse API response for ${market.name}`);
      return;
    }

    if (market.name === 'monero_bounties') {
      const listings = data.slice(0, CONFIG.MAX_LISTINGS_PER_FEED).map(item => ({
        title: item.title,
        timestamp: Math.floor(Date.now() / 1000),
        link: `https://bounties.monero.social/posts/${item.id}/${item.slug}`,
        market: market.name
      }));
      displayListings(listings);
    } else if (market.name === 'price_in_usd') {
      const price = data?.data?.USD?.avg_24h;
      if (price) {
        ['header_monero_usd_price', 'box_monero_usd_price'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.textContent = `$${price}`;
        });
      }
    } else if (market.name === 'price_in_btc') {
      const price = data?.data?.BTC?.avg_24h;
      if (price) {
        const el = document.getElementById('box_monero_btc_price');
        if (el) el.textContent = `${price} BTC`;
      }
    }
  } catch (e) {
    console.error(`Error processing API for ${market.name}:`, e);
  }
}

// Process RSS/Atom feeds
async function processFeed(market, xmlText) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');

    // Check for XML parsing errors
    if (doc.getElementsByTagName('parsererror').length > 0) {
      console.error(`XML parse error for ${market.name}`);
      return;
    }

    if (market.format === 'atom') {
      processAtom(market, doc);
    } else {
      processRss(market, doc);
    }
  } catch (e) {
    console.error(`Error processing feed for ${market.name}:`, e);
  }
}

function processAtom(market, doc) {
  try {
    const entries = doc.querySelectorAll('entry');
    const listings = []; 

    entries.forEach(entry => {
      try {
        const title = entry.querySelector('title')?.textContent || '';
        const published = entry.querySelector('published')?.textContent || '';
        const link = entry.querySelector('link')?.getAttribute('href') || '';

        if (title && link) {
          listings.push({
            title,
            timestamp: new Date(published).getTime() / 1000 || Math.floor(Date.now() / 1000),
            link,
            market: market.name
          });
        }
      } catch (e) {
        console.error('Error processing atom entry:', e);
      }
    });

    displayListings(listings);
  } catch (e) {
    console.error(`Error processing atom feed for ${market.name}:`, e);
  }
}

function processRss(market, doc) {
  try {
    const items = doc.querySelectorAll('item');
    const listings = [];

    items.forEach(item => {
      try {
        let title = item.querySelector('title')?.textContent || '';
        const link = item.querySelector('link')?.textContent || '';
        const pubDate = item.querySelector('pubDate')?.textContent || '';

        // Market-specific filtering
        if (market.name === 'monero_observer_market') {
          if (!CONFIG.MARKET_FILTER_REGEX.test(title)) {
            return;
          }
        }

        if (market.name === 'events_calendar') {
          const titleParts = title.split(' scheduled for ');
          if (titleParts.length === 2) {
            const dateStr = titleParts[1];
            const eventDate = new Date(dateStr);
            const now = new Date();
            
            if (eventDate.getTime() + CONFIG.EVENT_EXPIRY_MS < now.getTime()) {
              return; // Event expired
            }
            
            title = `${CONFIG.MONTHS[eventDate.getMonth()]} ${eventDate.getDate()}: ${titleParts[0]}`;
          }
        }

        if (market.name === 'telegram_monero_market') {
          const description = item.querySelector('description')?.textContent || '';
          const fullText = (title + ' ' + description).toLowerCase();
          
          if (!CONFIG.TELEGRAM_HASHTAGS.some(tag => fullText.includes(tag))) {
            return;
          }

          const cleanDesc = description.replace(/<[^>]*>?/gm, '').replace(/#\w+\s?/gi, '');
          title = cleanDesc.split(' ').slice(0, 10).join(' ') + '…';
        }

        if (market.name === 'monero_research') {
          const isDuplicate = listings.some(listing => listing.link === link);
          if (isDuplicate) {
            return;
          }
        }

        if (title && link) {
          listings.push({
            title,
            timestamp: new Date(pubDate).getTime() / 1000 || Math.floor(Date.now() / 1000),
            link,
            market: market.name
          });
        }
      } catch (e) {
        console.error('Error processing RSS item:', e);
      }
    });

    displayListings(listings);
  } catch (e) {
    console.error(`Error processing RSS feed for ${market.name}:`, e);
  }
}

// Display listings on page
function displayListings(listings) {
  try {
    const limited = listings.slice(0, CONFIG.MAX_LISTINGS_PER_FEED);
    limited.forEach(listing => {
      if (listing.title && listing.link) {
        addListing(listing);
      }
    });
  } catch (e) {
    console.error('Error displaying listings:', e);
  }
}

// Initialize on page load
async function initializeFeedAggregator() {
  try {
    const marketplaces = getMarketplaces();
    
    // Fetch all feeds in parallel for better performance
    const promises = marketplaces.map(market => fetchMarketFeed(market));
    
    await Promise.all(promises);
    console.log('Feed aggregation completed');
  } catch (e) {
    console.error('Error initializing feed aggregator:', e);
  }
}

// Start when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeFeedAggregator);
} else {
  initializeFeedAggregator();
}