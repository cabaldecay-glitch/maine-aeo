/**
 * Knowledge Graph Traversal — Maine Quote Hub
 * ═══════════════════════════════════════════════════════════════
 * Loads graph.json and provides query API.
 * Works client-side (CORS-permissive CDN host) or Node.js.
 *
 * Usage after graph loads:
 *   G.getServicesByLocation('portland')
 *   G.getLocationsByService('hvac-heat-pumps')
 *   G.getFAQsForService('roofing-storm')
 *   G.getBlogPostsForService('hvac-heat-pumps')
 *   G.getRebateForService('hvac-heat-pumps')
 *   G.getContractorsForLocation('bangor')
 *   G.findNode('service:hvac-heat-pumps')
 *   G.getRelated('service:hvac-heat-pumps', 'hasRebate')
 */

(function() {
  'use strict';

  var GRAPH_URL = 'https://cdn.jsdelivr.net/gh/cabaldecay-glitch/maine-aeo@main/graph.json';
  // Alternative: same-origin path if hosted on same server
  // var GRAPH_URL = '/graph.json';

  var _graph = null;

  // ── Index builder (called once after load) ────────────────────
  function buildIndices(graph) {
    var idx = {
      byId: {},         // id → node object
      relFrom: {},      // fromId → [relationship objects]
      relTo: {}         // toId  → [relationship objects]
    };

    // Flatten all node arrays into byId index
    var allNodeArrays = [
      graph.nodes.services,
      graph.nodes.rebates,
      graph.nodes.locations,
      graph.nodes.faqs,
      graph.nodes.blogPosts,
      graph.nodes.contractorPartners
    ];

    allNodeArrays.forEach(function(arr) {
      (arr || []).forEach(function(node) {
        idx.byId[node.id] = node;
      });
    });

    // Index relationships
    (graph.relationships || []).forEach(function(rel) {
      if (!idx.relFrom[rel.from]) idx.relFrom[rel.from] = [];
      if (!idx.relTo[rel.to])     idx.relTo[rel.to]     = [];
      idx.relFrom[rel.from].push(rel);
      idx.relTo[rel.to].push(rel);
    });

    return idx;
  }

  // ── Core query helpers ────────────────────────────────────────
  function G_findNode(id) {
    if (!_graph) return null;
    return _graph._idx.byId[id] || null;
  }

  function G_getRelated(fromId, relType) {
    if (!_graph) return [];
    var rels = (_graph._idx.relFrom[fromId] || [])
      .filter(function(r) { return !relType || r.type === relType; });
    return rels.map(function(r) { return _graph._idx.byId[r.to]; })
               .filter(Boolean);
  }

  function G_getRelatedReverse(toId, relType) {
    if (!_graph) return [];
    var rels = (_graph._idx.relTo[toId] || [])
      .filter(function(r) { return !relType || r.type === relType; });
    return rels.map(function(r) { return _graph._idx.byId[r.from]; })
               .filter(Boolean);
  }

  // ── Public Query API ──────────────────────────────────────────
  window.G = {

    /**
     * Load graph from URL or inject pre-loaded data.
     * Calls callback(graph) when ready.
     */
    load: function(urlOrData, callback) {
      if (typeof urlOrData === 'object') {
        // Pre-loaded (e.g., bundled inline)
        _graph = urlOrData;
        _graph._idx = buildIndices(_graph);
        console.log('[Graph] Loaded inline. Nodes:', Object.keys(_graph._idx.byId).length);
        if (callback) callback(_graph);
        return;
      }
      var url = urlOrData || GRAPH_URL;
      fetch(url)
        .then(function(r) { return r.json(); })
        .then(function(data) {
          _graph = data;
          _graph._idx = buildIndices(_graph);
          console.log('[Graph] Loaded from', url, '| Nodes:', Object.keys(_graph._idx.byId).length);
          if (callback) callback(_graph);
        })
        .catch(function(err) {
          console.error('[Graph] Load failed:', err);
        });
    },

    /** Find any node by full ID string (e.g., "service:hvac-heat-pumps") */
    findNode: G_findNode,

    /** Get nodes related FROM a given node, optionally filtered by rel type */
    getRelated: G_getRelated,

    /**
     * Get all services available in a location (by name fragment or ID).
     * Example: G.getServicesByLocation('portland') or G.getServicesByLocation('location:portland-me')
     */
    getServicesByLocation: function(locationQuery) {
      if (!_graph) return [];
      var locId = locationQuery.startsWith('location:') ? locationQuery
        : 'location:' + locationQuery.toLowerCase().replace(/\s+/g, '-') + '-me';
      return G_getRelatedReverse(locId, 'availableIn');
    },

    /**
     * Get all locations where a service is available.
     * Example: G.getLocationsByService('hvac-heat-pumps')
     */
    getLocationsByService: function(serviceQuery) {
      if (!_graph) return [];
      var svcId = serviceQuery.startsWith('service:') ? serviceQuery
        : 'service:' + serviceQuery;
      return G_getRelated(svcId, 'availableIn');
    },

    /**
     * Get FAQs related to a service.
     * Example: G.getFAQsForService('roofing-storm')
     */
    getFAQsForService: function(serviceQuery) {
      if (!_graph) return [];
      var svcId = serviceQuery.startsWith('service:') ? serviceQuery
        : 'service:' + serviceQuery;
      return (_graph.nodes.faqs || []).filter(function(faq) {
        return faq.relatedService === svcId;
      });
    },

    /**
     * Get blog posts supporting a service.
     */
    getBlogPostsForService: function(serviceQuery) {
      if (!_graph) return [];
      var svcId = serviceQuery.startsWith('service:') ? serviceQuery
        : 'service:' + serviceQuery;
      return G_getRelatedReverse(svcId, 'supportsService');
    },

    /**
     * Get rebate info for a service.
     */
    getRebateForService: function(serviceQuery) {
      if (!_graph) return null;
      var svcId = serviceQuery.startsWith('service:') ? serviceQuery
        : 'service:' + serviceQuery;
      var rebates = G_getRelated(svcId, 'hasRebate');
      return rebates.length ? rebates[0] : null;
    },

    /**
     * Get contractors for a location.
     */
    getContractorsForLocation: function(locationQuery) {
      if (!_graph) return [];
      var locId = locationQuery.startsWith('location:') ? locationQuery
        : 'location:' + locationQuery.toLowerCase().replace(/\s+/g, '-') + '-me';
      return (_graph.nodes.contractorPartners || []).filter(function(c) {
        return c.townsServed && c.townsServed.indexOf(locId) !== -1;
      });
    },

    /**
     * Generate a plain-English service summary for a location.
     * Useful for injecting location-specific hidden text.
     */
    getLocationSummary: function(locationQuery) {
      var services = this.getServicesByLocation(locationQuery);
      var locNode = G_findNode(
        locationQuery.startsWith('location:') ? locationQuery
        : 'location:' + locationQuery.toLowerCase().replace(/\s+/g, '-') + '-me'
      );
      if (!locNode) return 'Services available in Maine.';
      var serviceNames = services.map(function(s) { return s.name; }).join(' and ');
      return 'Maine Quote Hub provides ' + serviceNames + ' quote matching in ' +
        locNode.name + ', ' + locNode.county + ' County, Maine (ZIP: ' +
        (locNode.zipExamples || []).join(', ') + ').';
    },

    /**
     * Get all location nodes.
     */
    getAllLocations: function() {
      return _graph ? (_graph.nodes.locations || []) : [];
    },

    /**
     * Get all service nodes.
     */
    getAllServices: function() {
      return _graph ? (_graph.nodes.services || []) : [];
    },

    /**
     * Dump entire graph to console (dev helper).
     */
    debug: function() {
      console.log('[Graph]', _graph);
      console.log('[Graph] Index keys:', Object.keys((_graph && _graph._idx && _graph._idx.byId) || {}));
    }
  };

  // ── Tier 4: inject graph context as hidden JSON-LD ─────────────
  // Called by aeo-bootstrap.js when Tier 4 is active
  window.injectGraphSummary = function() {
    if (!window.AEO || !window.AEO.shouldEnrich(4)) return;
    if (!_graph) {
      console.warn('[Graph] Not loaded yet — graph summary not injected');
      return;
    }

    var services = window.G.getAllServices();
    var locations = window.G.getAllLocations();

    var graphSchema = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": "Maine Quote Hub — Knowledge Graph Summary",
      "description": "Entity graph for AI answer engine consumption. Services available across Maine locations.",
      "numberOfItems": services.length + locations.length,
      "itemListElement": services.map(function(svc, i) {
        var svcLocations = window.G.getLocationsByService(svc.id);
        return {
          "@type": "ListItem",
          "position": i + 1,
          "item": {
            "@type": "Service",
            "name": svc.name,
            "description": svc.description,
            "areaServed": svcLocations.map(function(loc) {
              return { "@type": "City", "name": loc.name, "containedInPlace": { "@type": "State", "name": "Maine" }};
            })
          }
        };
      })
    };

    window.AEO.injectJsonLd('aeo-graph-summary', graphSchema);
    console.log('[Graph] Tier-4 graph summary injected');
  };

})();
