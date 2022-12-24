const DOMPARSER = new DOMParser().parseFromString.bind(new DOMParser());

function add_listing(item) {
  item['title'] = item['title'].replace(/[\u00A0-\u9999<>\&]/gim, function(i) {
   return '&#'+i.charCodeAt(0)+';';
  });
  item['link'] = item['link'].replace(/[\u00A0-\u9999<>\&]/gim, function(i) {
   return '&#'+i.charCodeAt(0)+';';
  });
  var listing_entry = document.createElement('div');
  listing_entry.innerHTML += '<li class="listing-title"><a href="'+item['link']+'" title="'+item['title']+'">'+item['title']+'</a></li>';
  listing_entry.setAttribute('data-timestamp', item['timestamp']);
  listing_entry.className = 'single_listing';
  document.getElementById(item['market']).appendChild(listing_entry);
  document.getElementById(item['market']+'_box').classList.remove('loading-bg');
  /* var divList = $('.single_listing');
  divList.sort(function(a, b){
    return $(b).data("timestamp")-$(a).data("timestamp")
  });
  $("#listings_body").html(divList); */
}

function get_marketplaces() {
  var marketplaces = [];
  marketplaces.push({'name': 'blockchain_stats', 'feed': 'https://xmrchain.net/', 'format': 'scraper'});
  marketplaces.push({'name': 'blockchain_monthly_txs', 'feed': 'https://localmonero.co/blocks/stats/transactions/m/12', 'format': 'scraper'});
  marketplaces.push({'name': 'price_in_usd', 'feed': 'https://agoradesk.com/api/v1/moneroaverage/USD', 'format': 'api'});
  marketplaces.push({'name': 'price_in_btc', 'feed': 'https://agoradesk.com/api/v1/moneroaverage/BTC', 'format': 'api'});
  marketplaces.push({'name': 'events_calendar', 'feed': 'https://monero.observer/feed-calendar.xml', 'format': 'rss'});
  marketplaces.push({'name': 'monero_observer_news', 'feed': 'https://monero.observer/feed-mini.xml', 'format': 'rss'});
  marketplaces.push({'name': 'revuo_monero', 'feed': 'https://revuo-xmr.com/atom.xml', 'format': 'atom'});
  marketplaces.push({'name': 'monero_talk', 'feed': 'https://feeds.fireside.fm/monerotalk/rss', 'format': 'rss'});
  marketplaces.push({'name': 'monero_research', 'feed': 'https://moneroresearch.info/index.php?action=rss_RSS_CORE&method=rss20', 'format': 'rss'});
  marketplaces.push({'name': 'monero_moon', 'feed': 'https://www.themoneromoon.com/feed', 'format': 'rss'});
  marketplaces.push({'name': 'monero_standard', 'feed': 'https://localmonero.co/static/rss/the-monero-standard/feed.xml', 'format': 'rss'});
  marketplaces.push({'name': 'monero_bounties', 'feed': 'https://bounties.monero.social/api/v1/posts?view=trending', 'format': 'api'});
  marketplaces.push({'name': 'ccs', 'feed': 'https://ccs.getmonero.org/funding-required/', 'format': 'scraper'});
  marketplaces.push({'name': 'monerochan_news', 'feed': 'https://monerochan.news', 'format': 'scraper'});
  marketplaces.push({'name': 'monerochan_forum', 'feed': 'https://forum.monerochan.news/latest/', 'format': 'scraper'});
  marketplaces.push({'name': 'bitejo', 'feed': 'https://bitejo.com/rss', 'format': 'rss'});
  marketplaces.push({'name': 'count_bitejo', 'feed': 'https://bitejo.com', 'format': 'scraper'});
  marketplaces.push({'name': 'monero_market_io', 'feed': 'https://moneromarket.io', 'format': 'scraper'});
  marketplaces.push({'name': 'count_monero_market_io', 'feed': 'https://moneromarket.io', 'format': 'scraper'});
  marketplaces.push({'name': 'accepted_here', 'feed': 'https://acceptedhere.io/catalog/company/?currency=xmr&', 'format': 'scraper'});
  marketplaces.push({'name': 'count_accepted_here', 'feed': 'https://acceptedhere.io/catalog/currency/xmr/', 'format': 'scraper'});
  marketplaces.push({'name': 'monerica', 'feed': 'https://monerica.com', 'format': 'scraper'});
  marketplaces.push({'name': 'count_monerica', 'feed': 'https://monerica.com', 'format': 'scraper'});
  marketplaces.push({'name': 'monero_observer_market', 'feed': 'https://monero.observer/feed-messages.xml', 'format': 'rss'});
  marketplaces.push({'name': 'telegram_monero_market', 'feed': 'https://tg.i-c-a.su/rss/moneromarket?limit=50', 'format': 'rss'});
  marketplaces.push({'name': 'reddit_monero_market', 'feed': 'https://www.reddit.com/r/moneromarket.rss', 'format': 'atom'});
  marketplaces.push({'name': 'twitter_monero', 'feed': 'https://nitter.net/monero/rss', 'format': 'rss'});
  marketplaces.push({'name': 'reddit_monero', 'feed': 'https://www.reddit.com/r/monero.rss', 'format': 'atom'});
  return marketplaces;
}

document.body.onload = function(){
  var marketplaces = get_marketplaces();
    marketplaces.forEach((market) => {
    var u = market['feed'];
    var t = Math.floor(Date.now() / 1000);
    var url_api = "https://allorigins.bitejo.com/raw?url="+encodeURIComponent(u);
    var url = new URL(url_api);
    fetch(url).then((res) => {
      res.text().then((xml_text) => {
        var listings = [];
        if(market['format'] == 'scraper') {
          var parser = new DOMParser();
          var scraper_doc = parser.parseFromString(xml_text, "text/html");
          if(market['name'] == 'ccs') {
            var ccs_links = $(scraper_doc).find('.fund-required a');
            ccs_links.each(function() {
              var title = $(this).find('h3').text()+' - '+$(this).find('.progress-number-funded').text()+'/'+$(this).find('.progress-number-goal').text()+' XMR';
              var timestamp = (new Date().getTime()/1000);
              var link = 'https://ccs.getmonero.org/funding-required'+$(this).attr('href');
              var listing_details = {"title": title, "timestamp": timestamp, "link": link, "market": market['name']};
              listings.push(listing_details);
            });
            var listings = listings.slice(0, 10);
            listings.forEach((item) => {
              add_listing(item);
            });
          } else if(market['name'] == 'monerochan_news') {
            var ccs_links = $(scraper_doc).find('a[href*="article"]');
            ccs_links.each(function() {
              var title = $(this).find('h1').text();
              var timestamp = (new Date().getTime()/1000);
              var link = 'https://monerochan.news'+$(this).attr('href');
              var listing_details = {"title": title, "timestamp": timestamp, "link": link, "market": market['name']};
              listings.push(listing_details);
            });
            var listings = listings.slice(0, 10);
            listings.forEach((item) => {
              add_listing(item);
            });
          } else if(market['name'] == 'monerochan_forum') {
            var ccs_links = $(scraper_doc).find('a.title.raw-topic-link');
            ccs_links.each(function() {
              var title = $(this).text();
              var timestamp = (new Date().getTime()/1000);
              var link = $(this).attr('href');
              var listing_details = {"title": title, "timestamp": timestamp, "link": link, "market": market['name']};
              listings.push(listing_details);
            });
            var listings = listings.slice(0, 10);
            listings.forEach((item) => {
              add_listing(item);
            });
          } else if(market['name'] == 'monero_market_io') {
            var ccs_links = $(scraper_doc).find('a[href*="listing"]');
            ccs_links.each(function() {
              var title = $(this).find('.desc').text();
              var timestamp = (new Date().getTime()/1000);
              var link = 'https://moneromarket.io'+$(this).attr('href');
              var listing_details = {"title": title, "timestamp": timestamp, "link": link, "market": market['name']};
              if(title) {
                listings.push(listing_details);
              }
            });
            var listings = listings.slice(0, 10);
            listings.forEach((item) => {
              add_listing(item);
            });
          } else if(market['name'] == 'accepted_here') {
            var ccs_links = $(scraper_doc).find('.col-lg-7 a[href*="company"]');
            ccs_links.each(function() {
              var title = $(this).find('h5').text();
              var timestamp = (new Date().getTime()/1000);
              var link = $(this).attr('href');
              var listing_details = {"title": title, "timestamp": timestamp, "link": link, "market": market['name']};
              if(title) {
                listings.push(listing_details);
              }
            });
            var listings = listings.slice(0, 10);
            listings.forEach((item) => {
              add_listing(item);
            });
          } else if(market['name'] == 'monerica') {
            var ccs_links = $(scraper_doc).find('li a');
            var ccs_links = ccs_links.slice(14, 24);
            ccs_links.each(function() {
              var title = $(this).text();
              var timestamp = (new Date().getTime()/1000);
              var link = $(this).attr('href');
              var listing_details = {"title": title, "timestamp": timestamp, "link": link, "market": market['name']};
              listings.push(listing_details);
            });
            var listings = listings.slice(0, 10);
            listings.forEach((item) => {
              add_listing(item);
            });
          } else if(market['name'] == 'count_monero_market_io') {
            var market_stats = $(scraper_doc).find('#categories a span');
            var market_total = 0;
            market_stats.each(function() {
              market_total = market_total + parseInt($(this).text().replace(/\D/g,''));
              $('#monero_market_count').text(market_total);
            });
          } else if(market['name'] == 'count_monerica') {
            var market_stats = $(scraper_doc).find('li a');
            var market_total = 0;
            market_stats.each(function() {
              market_total++;
              $('#monerica_count').text(market_total);
            });
          } else if(market['name'] == 'count_accepted_here') {
            var market_total = $(scraper_doc).find('.currency-stats span:nth-child(2)').text().replace(/\D/g,'');
            $('#accepted_here_count').text(market_total);
          } else if(market['name'] == 'count_bitejo') {
            var market_total = $(scraper_doc).find('a[href*="search/currency/monero"]').find('span').text().replace(/\D/g,'');
            $('#bitejo_count').text(market_total);
          } else if(market['name'] == 'blockchain_monthly_txs') {
            var market_total = $(scraper_doc).find('.data-table tr:nth-child(1) td:nth-child(2)').text().replace(/\D/g,'');
            $('#stats_monthly_txs').text(market_total);
          } else if(market['name'] == 'blockchain_stats') {
            var search_text = $(scraper_doc).text().split('age [h:m:s]')[0].replace(/[\n\r]/g, ' ');
            console.log(search_text);
            var regex_version = new RegExp("GUI (.*?) ", "g");
            var stats_version = regex_version.exec(search_text)[1];
            $('#stats_version').text(stats_version);
            var regex_block_height = new RegExp("as of (.*?) block", "g");
            var stats_block_height = regex_block_height.exec(search_text)[1];
            $('#stats_block_height').text(stats_block_height);
            var regex_hash_rate = new RegExp("Hash rate: (.*?) ", "g");
            var stats_hash_rate = regex_hash_rate.exec(search_text)[1]+' GH/s';
            $('#stats_hash_rate').text(stats_hash_rate);
            var regex_fee = new RegExp("Fee per byte: (.*?) ", "g");
            var stats_fee = regex_fee.exec(search_text)[1]+' XMR';
            $('#stats_fee').text(stats_fee);
            var regex_emission = new RegExp("Monero emission (.*?) is (.*?) ", "g");
            var stats_emission = regex_emission.exec(search_text)[2]+' XMR';
            $('#stats_emission').text(stats_emission);
          }
        } else if(market['format'] == 'api') {
          if(market['name'] == 'monero_bounties') {
            var json_text = JSON.parse(xml_text);
            json_text.forEach((item) => {
              var title = item['title'];
              var timestamp = (new Date().getTime()/1000);
              var link = 'https://bounties.monero.social/posts/'+item['id']+'/'+item['slug'];
              var listing_details = {"title": title, "timestamp": timestamp, "link": link, "market": market['name']};
              listings.push(listing_details);
            });
            var listings = listings.slice(0, 10);
            listings.forEach((item) => {
              add_listing(item);
            });
          } else if(market['name'] == 'price_in_usd') {
            var price_in_usd = JSON.parse(xml_text)['data']['USD']['avg_24h'];
            $('#header_monero_usd_price').text('$'+price_in_usd);
            $('#box_monero_usd_price').text('$'+price_in_usd);
          } else if(market['name'] == 'price_in_btc') {
            var price_in_btc = JSON.parse(xml_text)['data']['BTC']['avg_24h'];
            $('#box_monero_btc_price').text(price_in_btc+' BTC');
          }
        } else {
          var doc = DOMPARSER(xml_text, "text/xml");
          var x2js = new X2JS();
          var json_text = x2js.xml2json(doc);
          if(market['format'] == 'atom') {
            json_text['feed']['entry'].forEach((item) => {
              var title = item['title'];
              var timestamp = (new Date(item['published']).getTime()/1000);
              var link = item['link']['_href'];
              var listing_details = {"title": title, "timestamp": timestamp, "link": link, "market": market['name']};
              listings.push(listing_details);
            });
            var listings = listings.slice(0, 10);
            listings.forEach((item) => {
              add_listing(item);
            });
          } else if(market['format'] == 'rss') {
            json_text['rss']['channel']['item'].forEach((item) => {
              var rss_push_listing = true;
              var title = item['title'];
              if(market['name'] == 'monero_observer_market') {
                if(title.match(/WTB|WTS|LTH|AFH/i) == null) {
                  return;
                }
              }
              if(market['name'] == 'events_calendar') {
                var title_parts = title.split(' scheduled for ');
                var title_text = title_parts[0];
                var title_date_parts = title_parts[1].split(' ');
                var title_date = new Date(title_date_parts[1]+' '+title_date_parts[0]+' '+title_date_parts[2]);
                var now = new Date();
                if((title_date.getTime() + 86400000) < now.getTime()) {
                  return;
                } else {
                  var title_months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                  var title = title_months[title_date.getMonth()]+' '+title_date.getDate()+': '+title_text;
                }
              }
              if(market['name'] == 'telegram_monero_market') {
                var hashtags_search = ['#selling', '#buying', '#trade', '#service'];
                var description_lowercase = item['title']+' '+item['description'];
                var description_lowercase = description_lowercase.toLowerCase();
                if(hashtags_search.some(valid_hashtag => description_lowercase.includes(valid_hashtag))) {
                  var rss_push_listing = true;
                } else {
                  var rss_push_listing = false;
                }
                var clean_description = item['description'].replace(/<[^>]*>?/gm, '').replace(/\#\w\w+\s?/gi, '');
                var title = clean_description.split(' ').slice(0, 10).join(' ')+'…';
              }
              if(market['name'] == 'monero_research') {
                if(listings.some(listing => listing.link == item['link'])) {
                  var rss_push_listing = false;
                } else {
                  var rss_push_listing = true;
                }
              }
              var timestamp = (new Date(item['pubDate']).getTime()/1000);
              var link = item['link'];
              var listing_details = {"title": title, "timestamp": timestamp, "link": link, "market": market['name']};
              if(rss_push_listing) {
                listings.push(listing_details);
              }
            });
            var listings = listings.slice(0, 10);
            listings.forEach((item) => {
              if(item['title']) {
                add_listing(item);
              }
            });
          }
        }
      });
    });
  });
}