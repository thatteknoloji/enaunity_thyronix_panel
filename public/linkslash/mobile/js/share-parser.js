/**
 * Client-side share text/URL parser (mirrors server mobile-source-type)
 */
var LinkSlashShareParser = (function() {
  var URL_REGEX = /https?:\/\/[^\s<>"')\]]+/gi;

  function extractUrls(text) {
    if (!text) return [];
    var matches = text.match(URL_REGEX) || [];
    var seen = {};
    return matches.map(function(u) { return u.replace(/[.,;:!?)]+$/, ''); }).filter(function(u) {
      if (seen[u]) return false;
      seen[u] = true;
      return true;
    });
  }

  function extractPrimaryUrl(text, html) {
    var fromText = extractUrls(text);
    if (fromText.length) return fromText[0];
    if (html) {
      var hrefMatch = html.match(/href=["'](https?:\/\/[^"']+)["']/i);
      if (hrefMatch && hrefMatch[1]) return hrefMatch[1];
      var fromHtml = extractUrls(html);
      if (fromHtml.length) return fromHtml[0];
    }
    var trimmed = (text || '').trim();
    if (/^https?:\/\//i.test(trimmed)) return trimmed.split(/\s/)[0];
    return '';
  }

  function detectSourceType(url, sharedFrom) {
    if (!url) return sharedFrom && sharedFrom.toLowerCase().includes('whatsapp') ? 'whatsapp' : 'other';
    var lower = url.toLowerCase();
    if (lower.endsWith('.pdf') || lower.indexOf('.pdf?') !== -1) return 'pdf';

    var hostname = '', pathname = '';
    try {
      var parsed = new URL(url);
      hostname = parsed.hostname.replace(/^www\./, '').toLowerCase();
      pathname = parsed.pathname.toLowerCase();
    } catch (_) { return 'web'; }

    if (hostname.indexOf('instagram.com') !== -1) {
      if (pathname.indexOf('/reel/') !== -1 || pathname.indexOf('/reels/') !== -1) return 'instagram_reel';
      if (pathname.indexOf('/p/') !== -1) return 'instagram_post';
      return 'instagram_post';
    }
    if (hostname.indexOf('threads.net') !== -1 || hostname.indexOf('threads.com') !== -1) return 'threads_post';
    if ((hostname === 'x.com' || hostname === 'twitter.com') && pathname.indexOf('/status/') !== -1) return 'tweet';
    if (hostname.indexOf('reddit.com') !== -1) return 'reddit_post';
    if (hostname.indexOf('youtube.com') !== -1 && pathname.indexOf('/shorts/') !== -1) return 'youtube_shorts';
    if (hostname.indexOf('youtube.com') !== -1 && pathname.indexOf('/watch') !== -1) return 'youtube_video';
    if (hostname === 'youtu.be') return 'youtube_video';
    if (hostname.indexOf('linkedin.com') !== -1) return 'linkedin_post';
    if (hostname.indexOf('facebook.com') !== -1 || hostname.indexOf('fb.com') !== -1) return 'facebook_post';
    if (hostname.indexOf('tiktok.com') !== -1) return 'tiktok_video';
    if (hostname === 'github.com' && pathname.split('/').filter(Boolean).length >= 2) return 'github_repo';
    if (hostname.indexOf('medium.com') !== -1 || hostname.indexOf('substack.com') !== -1) return 'article';
    if (hostname.indexOf('docs.google.com') !== -1) return 'google_doc';
    if (hostname.indexOf('notion.so') !== -1 || hostname.indexOf('notion.site') !== -1) return 'notion_page';
    if (sharedFrom && sharedFrom.toLowerCase().indexOf('whatsapp') !== -1) return 'whatsapp';
    if (sharedFrom && sharedFrom.toLowerCase().indexOf('telegram') !== -1) return 'telegram';
    return 'web';
  }

  function formatSourceLabel(type) {
    var map = {
      instagram_post: 'Instagram Post',
      instagram_reel: 'Instagram Reels',
      threads_post: 'Threads',
      tweet: 'X / Twitter',
      reddit_post: 'Reddit',
      youtube_video: 'YouTube Video',
      youtube_shorts: 'YouTube Shorts',
      linkedin_post: 'LinkedIn',
      facebook_post: 'Facebook',
      tiktok_video: 'TikTok',
      github_repo: 'GitHub Repo',
      article: 'Makale',
      google_doc: 'Google Docs',
      notion_page: 'Notion',
      pdf: 'PDF',
      whatsapp: 'WhatsApp',
      telegram: 'Telegram',
      web: 'Web'
    };
    return map[type] || type;
  }

  function parseSharePayload(payload) {
    payload = payload || {};
    var text = payload.text || payload.title || '';
    var html = payload.html || '';
    var url = extractPrimaryUrl(text, html);
    var sharedFrom = payload.sharedFrom || payload.packageName || '';
    var sourceType = detectSourceType(url, sharedFrom);
    var title = payload.title || text.split('\n')[0] || url || 'Paylaşılan içerik';
    return {
      url: url,
      rawText: text,
      title: title.slice(0, 200),
      sourceType: sourceType,
      sharedFrom: sharedFrom,
      sourceLabel: formatSourceLabel(sourceType)
    };
  }

  return {
    extractUrls: extractUrls,
    extractPrimaryUrl: extractPrimaryUrl,
    detectSourceType: detectSourceType,
    formatSourceLabel: formatSourceLabel,
    parseSharePayload: parseSharePayload
  };
})();

if (typeof window !== 'undefined') window.LinkSlashShareParser = LinkSlashShareParser;
