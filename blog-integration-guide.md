# Blog Integration Guide — Maine Quote Hub
## Monthly Write.as Post → AEO System Pipeline

---

## Overview

Each monthly blog post on Write.as serves three AEO functions:
1. **Entity authority building** — AI crawlers see consistent topical coverage
2. **Fresh content signal** — freshness dates update graph.json + Carrd meta
3. **Chunk source** — post gets chunked and linked into knowledge graph

---

## Step 1: Write the Post (Write.as)

### Recommended Post Structure
Every post should follow this template for consistent chunking:

```markdown
# [Primary Keyword-Rich Title]
*Published: YYYY-MM-DD | Updated: YYYY-MM-DD | Source: Maine Quote Hub*

## Introduction (1–2 paragraphs)
State the problem Maine homeowners face. Include town names naturally.

## [Key Section 1] (H2 = chunk boundary)
Atomic answer: one idea per section. Include data with source links.

## [Key Section 2] (H2 = chunk boundary)
Atomic answer. Link to Efficiency Maine or Maine.gov where relevant.

## [Key Section 3] (H2 = chunk boundary)
Practical steps or checklist. Numbered lists chunk well.

## Summary
3–5 bullet recap — AI answer engines love extractable summaries.

## Next Step
"Get free matched quotes → [link to yourdomain.com/#quote-form]"
*[Maine Quote Hub](https://yourdomain.com) — free contractor matching for Maine homeowners.*
```

### Write.as Post Settings
- **Visibility**: Public
- **Canonical URL**: Add manually in Write.as → Post → Canonical URL field
  (set to your yourdomain.com blog path if you have a custom domain)
- **Tags**: add relevant tags (Write.as supports hashtags in posts: `#MainHeatPump #EfficiencyMaine`)

---

## Step 2: Add SEL-v3 Frontmatter (Write.as Custom CSS / Post Note)

Write.as doesn't support frontmatter natively, but you can embed metadata
as a hidden `<script>` block at the TOP of your post using Write.as's
**custom CSS** feature or by embedding raw HTML (Write.as supports Markdown
with HTML passthrough).

Add this at the START of your Write.as post (it will be invisible to readers):

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "Complete 2026 Guide to Efficiency Maine Heat Pump Rebates",
  "url": "https://write.as/mainequotehub/2026-efficiency-maine-rebate-guide",
  "datePublished": "2026-03-01",
  "dateModified": "2026-03-01",
  "author": {
    "@type": "Organization",
    "name": "Maine Quote Hub",
    "@id": "https://yourdomain.com/#organization"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Maine Quote Hub",
    "url": "https://yourdomain.com"
  },
  "mainEntityOfPage": "https://yourdomain.com/",
  "about": [
    { "@type": "Service", "name": "HVAC Heat Pump Installation" },
    { "@type": "Thing",   "name": "Efficiency Maine Rebate" }
  ],
  "keywords": "Efficiency Maine 2026, heat pump rebate Maine, mini-split install, HVAC rebate Portland Bangor",
  "description": "Step-by-step guide covering 2026 Efficiency Maine rebate tiers ($3k-$9k), eligibility requirements, approved equipment, and how to apply through a licensed contractor.",
  "additionalProperty": [
    { "@type": "PropertyValue", "name": "primaryIntent",  "value": "informational-rebate-guide" },
    { "@type": "PropertyValue", "name": "audience",       "value": "Maine homeowners" },
    { "@type": "PropertyValue", "name": "confidence",     "value": "0.93" },
    { "@type": "PropertyValue", "name": "graphNodeId",    "value": "blog:2026-03-efficiency-maine-rebate-guide" }
  ],
  "citation": [
    {
      "@type": "WebPage",
      "url": "https://www.efficiencymaine.com/at-home/heat-pumps/",
      "name": "Efficiency Maine Heat Pump Rebate Program"
    }
  ],
  "isPartOf": {
    "@type": "Blog",
    "name": "Maine Quote Hub Blog",
    "url": "https://write.as/mainequotehub"
  },
  "relatedLink": "https://yourdomain.com/#hvac"
}
</script>
```

---

## Step 3: Update graph.json

After publishing, add a new `blogPosts` node to graph.json:

```json
{
  "id": "blog:2026-03-efficiency-maine-rebate-guide",
  "type": "BlogPost",
  "title": "Complete 2026 Guide to Efficiency Maine Heat Pump Rebates",
  "slug": "2026-efficiency-maine-rebate-guide",
  "url": "https://write.as/mainequotehub/2026-efficiency-maine-rebate-guide",
  "publishDate": "2026-03-01",
  "lastUpdated": "2026-03-01",
  "summary": "Step-by-step 2026 guide: Efficiency Maine rebate tiers, eligibility, approved equipment, application process.",
  "relatedServices": ["service:hvac-heat-pumps", "service:efficiency-maine-rebates"],
  "relatedLocations": ["location:portland-me", "location:bangor-me"],
  "keywords": ["Efficiency Maine 2026", "heat pump rebate guide"],
  "wordCount": 1200,
  "freshness": "2026-03-01"
}
```

And add a relationship:
```json
{ "from": "blog:2026-03-efficiency-maine-rebate-guide", "type": "supportsService", "to": "service:hvac-heat-pumps" }
```

---

## Step 4: Update Freshness on Carrd Page

In Carrd → Site Settings → SEO → Custom Head Code, update:
```html
<meta name="last-modified" content="2026-03-03">
```
→ change to new date.

Also update `head-tags.html` on GitHub so the CDN version stays in sync.

---

## Step 5: Run Chunker on New Post (Optional Dev Step)

Paste the blog post HTML into browser console to chunk it:

```javascript
// Fetch the Write.as post as HTML, then chunk it
fetch('https://write.as/mainequotehub/2026-efficiency-maine-rebate-guide')
  .then(r => r.text())
  .then(html => {
    var chunks = window.SemanticChunker.chunkHTML(html, 'blog', {
      sourceUrl: 'https://write.as/mainequotehub/2026-efficiency-maine-rebate-guide',
      freshness: '2026-03-01'
    });
    window.SemanticChunker.logChunks(chunks);
    window.SemanticChunker.exportChunks(chunks); // downloads JSON
  });
```

---

## Step 6: Update Blog Teaser on Carrd

In Carrd, update the **Resources** section to include the new post link.
Keep the 2 most recent posts visible; archive older ones to the Write.as blog index.

---

## Monthly Content Calendar

| Month | Topic | Primary Service | Target Towns |
|-------|-------|-----------------|--------------|
| March | Efficiency Maine 2026 Rebate Guide | HVAC | All Maine |
| April | Spring Heat Pump Tune-Up Checklist | HVAC | Portland, Bangor |
| May   | Storm Season Roof Prep Guide | Roofing | All Maine |
| June  | Mini-Split vs. Central AC Maine | HVAC | Southern Maine |
| July  | Hail Damage: What Maine Homeowners Must Do First | Roofing | All Maine |
| Aug   | Income-Eligible Rebate Deep Dive | HVAC | Lewiston, Auburn |
| Sept  | Ice Dam Prevention Maine Homes | Roofing | Northern Maine |
| Oct   | Heat Pump Heating Season Prep | HVAC | All Maine |
| Nov   | Insurance Claim Deadlines Maine | Roofing | All Maine |
| Dec   | Year-End Rebate Deadline Reminder | HVAC | All Maine |
| Jan   | Cold Climate Heat Pump Reality Check | HVAC | Bangor, Augusta |
| Feb   | Ice Storm Damage Claims Guide | Roofing | All Maine |

---

# Maintenance Checklist

## After Every Blog Post Published
- [ ] Add JSON-LD schema block to top of Write.as post
- [ ] Add blogPost node to graph.json
- [ ] Add relationship to graph.json relationships array
- [ ] Update Carrd Resources section with new post link
- [ ] Update `<meta name="last-modified">` in Carrd head tags
- [ ] Commit updated graph.json to GitHub → CDN auto-updates via jsDelivr
- [ ] Verify post visible at Write.as URL

## When Efficiency Maine Changes Rebate Amounts
- [ ] Update rebate tiers in graph.json → `rebates[0].tiers`
- [ ] Update HVAC section text on Carrd page (rebate dollar amounts)
- [ ] Update FAQ answer for "How much is the rebate?"
- [ ] Update hidden-summaries.js description for hero and HVAC sections
- [ ] Update `confidence` values if amounts are newly confirmed vs. provisional
- [ ] Update `freshness` / `lastVerified` date in graph.json rebate node
- [ ] Publish blog post announcing rebate changes
- [ ] Change `<meta name="last-modified">` on Carrd

## When Adding a New Contractor Partner
- [ ] Add `ContractorPartner` node to graph.json
- [ ] Add `provides` relationships for their services
- [ ] Add `availableIn` relationships for their covered towns
- [ ] Verify Maine license number via maine.gov/pfr
- [ ] Remove placeholder nodes when real contractors onboarded

## Monthly Graph Freshness Pass
- [ ] Open graph.json, update `_meta.lastUpdated` to current date
- [ ] Review all nodes with `freshness` older than 90 days
- [ ] Verify Efficiency Maine program still active (check efficiencymaine.com)
- [ ] Check Maine Bureau of Insurance for any homeowners policy changes
- [ ] Commit to GitHub

## Quarterly AEO Review
- [ ] Check browser console on Carrd page: confirm AEO tier detection logs
- [ ] Run `window.SemanticChunker.logChunks()` — verify chunks look correct
- [ ] Run `window.G.debug()` — verify graph loaded with correct node count
- [ ] Run `window.G.getServicesByLocation('portland')` — verify returns services
- [ ] Test with AI bot emulation: add `?ua=GPTBot` debug mode if implemented
- [ ] Search Perplexity/ChatGPT for "Maine heat pump rebate" — check if site cited
- [ ] Search for "storm roof damage Maine insurance" — track visibility
- [ ] Review Write.as blog post performance (Write.as analytics or UTM params)

## When Expanding to New Maine Towns
- [ ] Add Location node to graph.json locations array
- [ ] Add `availableIn` relationships for relevant services
- [ ] Add town name to Carrd location list paragraph in HVAC section
- [ ] Add town to FAQ "What towns do you serve?" answer
- [ ] Publish a blog post targeting that town for local entity coverage

## File Hosting Reminders
- [ ] graph.json hosted at: GitHub → jsDelivr CDN
- [ ] ai-detection.js hosted at: same GitHub repo
- [ ] hidden-summaries.js hosted at: same GitHub repo
- [ ] semantic-chunker.js hosted at: same GitHub repo
- [ ] graph-traversal.js hosted at: same GitHub repo
- [ ] All URLs updated in carrd-page-structure.html bootstrap block
- [ ] jsDelivr CDN purge after each graph.json update:
      https://purge.jsdelivr.net/gh/cabaldecay-glitch/maine-aeo@main/graph.json

## Console Log Reference (What You Should See on Page Load)
```
[AEO] Human visitor — Tier 1
  (or)
[AEO] AI bot detected: perplexity | class: perplexity | tier: 4 | visit: 1
[AEO Summaries] Injected 5 summaries for Tier 4
[Chunker] Generated 12 chunks from DOM
[Graph] Loaded from https://cdn.../graph.json | Nodes: 58
[Graph] Tier-4 graph summary injected
[AEO Bootstrap] All modules loaded. Tier: 4
```
