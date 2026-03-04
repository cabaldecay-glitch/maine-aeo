/**
 * Semantic Chunking Engine — SEL-v3
 * Maine Quote Hub
 * ═══════════════════════════════════════════════════════════════
 * Walks the DOM (or accepts raw HTML string) and splits content
 * into semantic units anchored at heading boundaries.
 *
 * Each chunk output:
 * {
 *   id:           "chunk-001"           -- sequential, stable per session
 *   contentType:  "landing"|"blog"|"faq"
 *   title:        "Section Heading"
 *   bodyText:     "Full text content..."
 *   approxTokens: 87                    -- estimate (chars/4)
 *   metadata: {
 *     sourceUrl:    "https://yourdomain.com/"
 *     section:      "HVAC Heat Pumps"
 *     fingerprint:  "sha256:abc123..."  -- SHA-256 of bodyText
 *     freshness:    "2026-03-03"
 *     lastUpdated:  "2026-03-03T00:00:00Z"
 *     confidence:   0.9
 *   }
 *   intentSignals: {
 *     primaryIntent: "transactional-lead-gen"
 *     audience:      "Maine homeowners"
 *     purpose:       "capture quote request"
 *   }
 *   citationChain: [ "https://efficiencymaine.com/..." ]
 *   graphLinks:    ["service:hvac-heat-pumps", "location:portland-me"]
 *   relationships: [{ type: "isPartOf", target: "page:home" }]
 * }
 *
 * Usage:
 *   // From live DOM:
 *   var chunks = window.SemanticChunker.chunkDOM(document.body, 'landing');
 *
 *   // From HTML string (blog import):
 *   var chunks = window.SemanticChunker.chunkHTML(htmlString, 'blog', {
 *     sourceUrl: 'https://write.as/mainequotehub/march-2026',
 *     freshness: '2026-03-01'
 *   });
 *
 *   // Log to console for inspection:
 *   window.SemanticChunker.logChunks(chunks);
 */

(function() {
  'use strict';

  // ── Simple SHA-256 (pure JS, no crypto API dependency) ───────
  // Source: adapted from public domain sha256 implementations
  function sha256(str) {
    function rightRotate(value, amount) {
      return (value >>> amount) | (value << (32 - amount));
    }
    var mathPow = Math.pow;
    var maxWord = mathPow(2, 32);
    var lengthProperty = 'length';
    var i, j;
    var result = '';
    var words = [];
    var asciiBitLength = str[lengthProperty] * 8;

    var hash = [];
    var k = [];
    var primeCounter = k[lengthProperty];
    var isComposite = {};

    for (var candidate = 2; primeCounter < 64; candidate++) {
      if (!isComposite[candidate]) {
        for (i = 0; i < 313; i += candidate) {
          isComposite[i] = candidate;
        }
        hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
        k[primeCounter++] = (mathPow(candidate, 1/3) * maxWord) | 0;
      }
    }

    str += '\x80';
    while (str[lengthProperty] % 64 - 56) str += '\x00';
    for (i = 0; i < str[lengthProperty]; i++) {
      j = str.charCodeAt(i);
      if (j >> 8) return ''; // non-ASCII — skip full hash
      words[i >> 2] |= j << ((3 - i) % 4) * 8;
    }
    words[words[lengthProperty]] = ((asciiBitLength / maxWord) | 0);
    words[words[lengthProperty]] = asciiBitLength;

    for (j = 0; j < words[lengthProperty];) {
      var w = words.slice(j, j += 16);
      var oldHash = hash.slice(0);
      for (i = 0; i < 64; i++) {
        var w15 = w[i - 15], w2 = w[i - 2];
        var a = hash[0], e = hash[4];
        var temp1 = hash[7]
          + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
          + ((e & hash[5]) ^ (~e & hash[6]))
          + k[i]
          + (w[i] = (i < 16) ? w[i] : (
            w[i - 16]
            + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
            + w[i - 7]
            + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
          ) | 0);
        var temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
          + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
        hash = [(temp1 + temp2) | 0].concat(hash);
        hash[4] = (hash[4] + temp1) | 0;
        hash.length = 8;
      }
      hash = hash.map(function(val, idx) { return (val + oldHash[idx]) | 0; });
    }

    hash.forEach(function(val) {
      for (i = 7; i >= 0; i--) {
        result += ((val >>> (i * 4)) & 0xF).toString(16);
      }
    });
    return 'sha256:' + result;
  }

  // ── Intent signal inference from heading text ─────────────────
  var INTENT_MAP = [
    { pattern: /rebate|incentive|savings|discount/i,
      primaryIntent: 'informational-rebate-guide',
      purpose: 'educate on rebates and financial incentives' },
    { pattern: /quote|get started|free|apply|form|submit/i,
      primaryIntent: 'transactional-lead-gen',
      purpose: 'capture quote request' },
    { pattern: /storm|damage|insurance|claim|repair/i,
      primaryIntent: 'transactional-lead-gen',
      purpose: 'capture storm damage claim request' },
    { pattern: /how|what|why|faq|question/i,
      primaryIntent: 'informational-faq',
      purpose: 'resolve homeowner questions and objections' },
    { pattern: /blog|guide|resource|learn|tip/i,
      primaryIntent: 'informational-content-hub',
      purpose: 'build entity authority with supporting content' },
    { pattern: /contractor|partner|network|team/i,
      primaryIntent: 'trust-building',
      purpose: 'establish contractor credibility' },
    { pattern: /town|city|area|portland|bangor|augusta|lewiston/i,
      primaryIntent: 'local-seo',
      purpose: 'assert geographic service coverage' },
  ];

  function inferIntent(text) {
    for (var i = 0; i < INTENT_MAP.length; i++) {
      if (INTENT_MAP[i].pattern.test(text)) {
        return {
          primaryIntent: INTENT_MAP[i].primaryIntent,
          audience: 'Maine homeowners',
          purpose: INTENT_MAP[i].purpose
        };
      }
    }
    return {
      primaryIntent: 'informational-general',
      audience: 'Maine homeowners',
      purpose: 'provide general service information'
    };
  }

  // ── Citation inference from text ──────────────────────────────
  var CITATION_PATTERNS = [
    { pattern: /efficiency maine|efficiencymaine/i,
      url: 'https://www.efficiencymaine.com/at-home/heat-pumps/' },
    { pattern: /insurance|bureau of insurance/i,
      url: 'https://www.maine.gov/pfr/insurance/' },
    { pattern: /storm|nws|national weather/i,
      url: 'https://www.weather.gov/gyx/' },
    { pattern: /licensed|professional license/i,
      url: 'https://www.maine.gov/pfr/professionallicensing/' },
  ];

  function inferCitations(text) {
    var citations = [];
    CITATION_PATTERNS.forEach(function(cp) {
      if (cp.pattern.test(text) && citations.indexOf(cp.url) === -1) {
        citations.push(cp.url);
      }
    });
    return citations;
  }

  // ── Graph link inference from text ────────────────────────────
  var LOCATION_NODES = [
    'portland','bangor','augusta','lewiston','auburn','biddeford',
    'sanford','brunswick','saco','westbrook','south-portland',
    'scarborough','gorham','windham','yarmouth','falmouth',
    'cape-elizabeth','old-orchard-beach','bath','brewer',
    'rockland','ellsworth','presque-isle','calais','machias'
  ];

  function inferGraphLinks(title, body) {
    var links = [];
    var combined = (title + ' ' + body).toLowerCase();

    if (/heat pump|hvac|mini.split|furnace|boiler/i.test(combined))
      links.push('service:hvac-heat-pumps');
    if (/roof|shingle|storm|hail|ice dam|wind damage/i.test(combined))
      links.push('service:roofing-storm');
    if (/rebate|efficiency maine/i.test(combined))
      links.push('service:efficiency-maine-rebates');
    if (/insurance|claim/i.test(combined))
      links.push('service:insurance-claim-assistance');
    if (/faq|question/i.test(combined))
      links.push('content:faq');
    if (/blog|article|post/i.test(combined))
      links.push('content:blog');

    LOCATION_NODES.forEach(function(loc) {
      if (combined.indexOf(loc.replace('-', ' ')) !== -1 ||
          combined.indexOf(loc) !== -1) {
        links.push('location:' + loc + '-me');
      }
    });

    return links;
  }

  // ── DOM Walker ────────────────────────────────────────────────
  // Groups content by heading (h1-h4) boundaries
  function walkDOM(root) {
    var sections = [];
    var current = null;

    // Grab all child nodes of root in document order
    var walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: function(node) {
          var tag = node.tagName.toLowerCase();
          // Accept headings and content elements
          if (/^h[1-4]$/.test(tag) ||
              tag === 'p' || tag === 'li' ||
              tag === 'blockquote' || tag === 'td') {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_SKIP;
        }
      }
    );

    var node;
    while ((node = walker.nextNode())) {
      var tag = node.tagName.toLowerCase();
      if (/^h[1-4]$/.test(tag)) {
        // New section boundary
        if (current && current.bodyParts.length > 0) {
          sections.push(current);
        }
        current = {
          heading: node.textContent.trim(),
          level: parseInt(tag[1]),
          bodyParts: []
        };
      } else if (current) {
        var text = node.textContent.trim();
        if (text.length > 10) { // skip tiny fragments
          current.bodyParts.push(text);
        }
      }
    }
    // Push last section
    if (current && current.bodyParts.length > 0) {
      sections.push(current);
    }

    // Handle pages with no headings (fallback: whole body as one chunk)
    if (sections.length === 0 && root.textContent.trim().length > 0) {
      sections.push({
        heading: document.title || 'Maine Quote Hub',
        level: 1,
        bodyParts: [root.textContent.trim()]
      });
    }

    return sections;
  }

  // ── HTML String Parser ────────────────────────────────────────
  function parseHTML(htmlString) {
    var parser = new DOMParser();
    var doc = parser.parseFromString(htmlString, 'text/html');
    return walkDOM(doc.body);
  }

  // ── Build Chunk Objects ───────────────────────────────────────
  function buildChunks(sections, contentType, options) {
    var opts = options || {};
    var sourceUrl = opts.sourceUrl || window.location.href;
    var freshness = opts.freshness || new Date().toISOString().split('T')[0];
    var confidence = opts.confidence || 0.9;

    return sections.map(function(section, idx) {
      var bodyText = section.bodyParts.join(' ').replace(/\s+/g, ' ').trim();
      var approxTokens = Math.round(bodyText.length / 4);
      var fingerprint = sha256(section.heading + bodyText);
      var intentSignals = inferIntent(section.heading + ' ' + bodyText);
      var citationChain = inferCitations(bodyText);
      var graphLinks = inferGraphLinks(section.heading, bodyText);
      var chunkId = 'chunk-' + String(idx + 1).padStart(3, '0');

      return {
        id: chunkId,
        contentType: contentType || 'landing',
        title: section.heading,
        bodyText: bodyText,
        approxTokens: approxTokens,
        metadata: {
          sourceUrl: sourceUrl,
          section: section.heading,
          headingLevel: section.level,
          approxTokens: approxTokens,
          fingerprint: fingerprint,
          freshness: freshness,
          lastUpdated: freshness + 'T00:00:00Z',
          confidence: confidence
        },
        intentSignals: intentSignals,
        citationChain: citationChain,
        graphLinks: graphLinks,
        relationships: [
          { type: 'isPartOf', target: 'page:home' },
          { type: 'generatedBy', target: 'system:maine-quote-hub-aeo' }
        ]
      };
    });
  }

  // ── Public API ────────────────────────────────────────────────
  window.SemanticChunker = {

    /**
     * Chunk live DOM element.
     * @param {Element} root - DOM element to chunk (default: document.body)
     * @param {string} contentType - "landing" | "blog" | "faq"
     * @param {Object} options - { sourceUrl, freshness, confidence }
     * @returns {Array} chunks
     */
    chunkDOM: function(root, contentType, options) {
      var el = root || document.body;
      var sections = walkDOM(el);
      var chunks = buildChunks(sections, contentType || 'landing', options);
      window.AEO_CHUNKS = chunks; // persist for inspection
      console.log('[Chunker] Generated', chunks.length, 'chunks from DOM');
      return chunks;
    },

    /**
     * Chunk an HTML string (for blog posts imported externally).
     * @param {string} htmlString - raw HTML content
     * @param {string} contentType - "blog"
     * @param {Object} options - { sourceUrl, freshness, confidence }
     * @returns {Array} chunks
     */
    chunkHTML: function(htmlString, contentType, options) {
      var sections = parseHTML(htmlString);
      var chunks = buildChunks(sections, contentType || 'blog', options);
      console.log('[Chunker] Generated', chunks.length, 'chunks from HTML string');
      return chunks;
    },

    /**
     * Pretty-print chunks to browser console for inspection.
     */
    logChunks: function(chunks) {
      (chunks || window.AEO_CHUNKS || []).forEach(function(c) {
        console.group('[Chunk] ' + c.id + ' — ' + c.title);
        console.log('Type:', c.contentType, '| Tokens:', c.approxTokens);
        console.log('Intent:', c.intentSignals.primaryIntent);
        console.log('Graph links:', c.graphLinks.join(', ') || 'none');
        console.log('Citations:', c.citationChain.join(', ') || 'none');
        console.log('Fingerprint:', c.metadata.fingerprint);
        console.groupEnd();
      });
    },

    /**
     * Export chunks as downloadable JSON file (dev helper).
     */
    exportChunks: function(chunks) {
      var data = JSON.stringify(chunks || window.AEO_CHUNKS || [], null, 2);
      var blob = new Blob([data], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'chunks-' + new Date().toISOString().split('T')[0] + '.json';
      a.click();
    }
  };

})();
