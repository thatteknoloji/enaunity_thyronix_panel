/**
 * LinkSlash Server AI Analyze — calls /api/linkslash/ai/analyze
 */
var LinkSlashServerAI = (function() {
  async function analyzeLink(payload) {
    var resp = await fetch('/api/linkslash/ai/analyze', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    var json = await resp.json();
    if (!resp.ok || !json.success) {
      throw new Error(json.error || 'AI analiz başarısız');
    }
    return json.data;
  }

  function mergeToLocalLink(link, data) {
    if (!link || !data) return link;
    var analysis = data.analysis || {};
    link.summary = data.aiSummary || analysis.summary || link.summary;
    link.aiAnalysis = analysis;
    link.aiAnalyzedAt = data.analyzedAt || new Date().toISOString();
    if (data.aiTags && data.aiTags.length && (!link.tags || !link.tags.length)) {
      link.tags = data.aiTags.slice(0, 8);
    }
    return link;
  }

  function renderAnalysisHtml(analysis, status) {
    if (!analysis) return '<p class="text-muted">Sonuç yok</p>';
    var html = '';
    if (status === 'provider_missing') {
      html += '<p class="ai-status-warn">⚠️ Sunucu AI sağlayıcısı yok — kural tabanlı fallback kullanıldı.</p>';
    }
    if (analysis.summary) {
      html += '<div class="ai-block"><h4>Özet</h4><p>' + escapeHtml(analysis.summary) + '</p></div>';
    }
    if (analysis.tags && analysis.tags.length) {
      html += '<div class="ai-block"><h4>Etiketler</h4><p>' + analysis.tags.map(function(t) {
        return '<span class="tag">' + escapeHtml(t) + '</span>';
      }).join(' ') + '</p></div>';
    }
    if (analysis.categorySuggestion) {
      html += '<div class="ai-block"><h4>Kategori önerisi</h4><p>' + escapeHtml(analysis.categorySuggestion) + '</p></div>';
    }
    if (analysis.contentIdeas && analysis.contentIdeas.length) {
      html += '<div class="ai-block"><h4>İçerik fikirleri</h4><ul>' + analysis.contentIdeas.map(function(i) {
        return '<li>' + escapeHtml(i) + '</li>';
      }).join('') + '</ul></div>';
    }
    if (analysis.seoBrief) {
      html += '<div class="ai-block"><h4>SEO Brief</h4><p><strong>' + escapeHtml(analysis.seoBrief.title || '') + '</strong></p>';
      if (analysis.seoBrief.keywords && analysis.seoBrief.keywords.length) {
        html += '<p>' + analysis.seoBrief.keywords.map(function(k) { return escapeHtml(k); }).join(', ') + '</p>';
      }
      html += '</div>';
    }
    if (analysis.socialDrafts) {
      html += '<div class="ai-block"><h4>Sosyal taslaklar</h4>';
      if (analysis.socialDrafts.x) html += '<p><strong>X:</strong> ' + escapeHtml(analysis.socialDrafts.x) + '</p>';
      if (analysis.socialDrafts.linkedin) html += '<p><strong>LinkedIn:</strong> ' + escapeHtml(analysis.socialDrafts.linkedin) + '</p>';
      if (analysis.socialDrafts.instagram) html += '<p><strong>IG:</strong> ' + escapeHtml(analysis.socialDrafts.instagram) + '</p>';
      html += '</div>';
    }
    return html;
  }

  return {
    analyzeLink: analyzeLink,
    mergeToLocalLink: mergeToLocalLink,
    renderAnalysisHtml: renderAnalysisHtml
  };
})();
