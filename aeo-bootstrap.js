/**
 * AEO Bootstrap — Maine Quote Hub
 * ═══════════════════════════════════════════════════════════════
 * Single entry point. Loads all AEO modules in correct order.
 * Host this file + all modules on GitHub → jsDelivr CDN.
 *
 * In Carrd: Site Settings → SEO → Custom Head Code:
 *   <script src="https://cdn.jsdelivr.net/gh/YOUR/maine-aeo@main/aeo-bootstrap.js" defer></script>
 *
 * Or embed inline at page bottom (more reliable in Carrd):
 *   Paste the aeo-bootstrap.js Embed block from carrd-page-structure.html
 *
 * Module load order (sequential, not parallel — each depends on prior):
 *   1. ai-detection.js    → sets window.AEO tier
 *   2. hidden-summaries.js → defines window.AEO_SUMMARIES + injectAllSummaries()
 *   3. semantic-chunker.js → defines window.SemanticChunker
 *   4. graph-traversal.js  → defines window.G + window.injectGraphSummary()
 *   5. Activation          → inject summaries, run chunker, load graph
 */

(function() {
  'use strict';

  // ── Configuration ─────────────────────────────────────────────
  var CONFIG = {
    // Update to your actual GitHub username and repo name
    cdnBase: 'https://cdn.jsdelivr.net/gh/YOUR_GITHUB_USER/maine-aeo@main/',

    // Set to true to skip chunking for human visitors (performance)
    chunkAIOnly: true,

    // Freshness date — update when page content changes
    pageFreshness: '2026-03-03',

    // Source URL for chunk metadata
    pageUrl: window.location.href,

    // Debug mode: set to true to log everything regardless of tier
    debug: false
  };

  // ── Sequential Script Loader ──────────────────────────────────
  function loadScript(filename, callback) {
    var src = CONFIG.cdnBase + filename;
    var s = document.createElement('script');
    s.src = src;
    s.async = false;
    s.onload = function() {
      if (CONFIG.debug) console.log('[AEO Bootstrap] Loaded:', filename);
      if (callback) callback();
    };
    s.onerror = function() {
      console.warn('[AEO Bootstrap] Failed to load:', src);
      // Continue chain even on failure — graceful degradation
      if (callback) callback();
    };
    document.head.appendChild(s);
  }

  // ── Activation (runs after all scripts loaded) ────────────────
  function activate() {
    var tier = window.AEO ? window.AEO.tier : 1;
    var isAI = window.AEO ? window.AEO.isAI : false;

    if (CONFIG.debug || isAI) {
      console.log('[AEO Bootstrap] Activating. Tier:', tier, '| isAI:', isAI);
    }

    // Step A: Inject hidden summaries (Tier 2+)
    if (tier >= 2 && window.injectAllSummaries) {
      window.injectAllSummaries();
    }

    // Step B: Run semantic chunker (Tier 2+ for AI, always if debug)
    var shouldChunk = CONFIG.debug || (tier >= 2 && (!CONFIG.chunkAIOnly || isAI));
    if (shouldChunk && window.SemanticChunker) {
      setTimeout(function() {
        // Slight delay to ensure full DOM painted
        window.AEO_CHUNKS = window.SemanticChunker.chunkDOM(document.body, 'landing', {
          sourceUrl: CONFIG.pageUrl,
          freshness: CONFIG.pageFreshness
        });
        if (CONFIG.debug || tier >= 4) {
          window.SemanticChunker.logChunks(window.AEO_CHUNKS);
        }
      }, 200);
    }

    // Step C: Load knowledge graph (Tier 2+ for AI)
    if (tier >= 2 && window.G) {
      window.G.load(CONFIG.cdnBase + 'graph.json', function() {
        // Tier 4: inject full graph summary as JSON-LD
        if (tier >= 4 && window.injectGraphSummary) {
          window.injectGraphSummary();
        }

        // Tier 3+: inject location-specific context
        if (tier >= 3 && window.AEO) {
          var locations = ['portland', 'bangor', 'augusta', 'lewiston', 'brunswick'];
          locations.forEach(function(loc) {
            var summary = window.G.getLocationSummary(loc);
            window.AEO.injectHidden(
              'aeo-loc-' + loc,
              '<p data-aeo-location="' + loc + '-me">' + summary + '</p>',
              'location-context'
            );
          });
        }

        if (CONFIG.debug) console.log('[AEO Bootstrap] Graph loaded and activated.');
      });
    }

    // Final status log (visible in console for dev/audit)
    if (CONFIG.debug || tier >= 3) {
      console.log('[AEO Bootstrap] Complete. Tier:', tier, '| Bot:', window.AEO && window.AEO.botId);
    }
  }

  // ── Module Load Chain ─────────────────────────────────────────
  // Load ai-detection first — all others depend on window.AEO.tier
  loadScript('ai-detection.js', function() {
    loadScript('hidden-summaries.js', function() {
      loadScript('semantic-chunker.js', function() {
        loadScript('graph-traversal.js', function() {
          activate();
        });
      });
    });
  });

})();
