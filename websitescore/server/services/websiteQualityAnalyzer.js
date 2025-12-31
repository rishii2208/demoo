const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');

class WebsiteQualityAnalyzer {
  constructor(url, html, headers, additionalData = {}) {
    this.url = url;
    this.$ = cheerio.load(html);
    this.headers = headers;
    this.html = html;
    this.parsedUrl = new URL(url);
    this.robotsTxt = additionalData.robotsTxt || null;
    this.sitemap = additionalData.sitemap || null;
    this.llmsTxt = additionalData.llmsTxt || null;
  }

  analyze() {
    const results = {
      score: 0,
      maxScore: 100,
      categories: {}
    };

    // Site Quality checks
    const siteQuality = this.analyzeSiteQuality();
    results.categories.siteQuality = siteQuality;

    // Content Quality checks
    const contentQuality = this.analyzeContentQuality();
    results.categories.contentQuality = contentQuality;

    // Open Graph checks
    const openGraph = this.analyzeOpenGraph();
    results.categories.openGraph = openGraph;

    // Twitter Cards checks
    const twitterCards = this.analyzeTwitterCards();
    results.categories.twitterCards = twitterCards;

    // Technical SEO checks
    const technicalSeo = this.analyzeTechnicalSeo();
    results.categories.technicalSeo = technicalSeo;

    // Crawlability checks
    const crawlability = this.analyzeCrawlability();
    results.categories.crawlability = crawlability;

    // Calculate total score
    const allChecks = [
      ...Object.values(siteQuality.checks),
      ...Object.values(contentQuality.checks),
      ...Object.values(openGraph.checks),
      ...Object.values(twitterCards.checks),
      ...Object.values(technicalSeo.checks),
      ...Object.values(crawlability.checks)
    ];

    const earnedPoints = allChecks.reduce((sum, check) => sum + check.score, 0);
    const maxPoints = allChecks.reduce((sum, check) => sum + check.maxScore, 0);
    
    results.score = Math.round((earnedPoints / maxPoints) * 100);

    return results;
  }

  analyzeSiteQuality() {
    const checks = {};

    // Title check (max 20 points)
    const title = this.$('title').text().trim();
    const titleLength = title.length;
    let titleScore = 0;
    let titleStatus = 'error';
    
    if (titleLength >= 30 && titleLength <= 60) {
      titleScore = 20;
      titleStatus = 'good';
    } else if (titleLength > 0 && titleLength < 30) {
      titleScore = 16;
      titleStatus = 'warning';
    } else if (titleLength > 60) {
      titleScore = 12;
      titleStatus = 'warning';
    }

    checks.title = {
      name: 'Title',
      value: title || 'Missing',
      details: `${titleLength} chars (ideal 30-60)`,
      score: titleScore,
      maxScore: 20,
      status: titleStatus
    };

    // Meta Description check (max 15 points)
    const metaDesc = this.$('meta[name="description"]').attr('content') || '';
    const metaDescLength = metaDesc.length;
    let metaDescScore = 0;
    let metaDescStatus = 'error';

    if (metaDescLength >= 120 && metaDescLength <= 160) {
      metaDescScore = 15;
      metaDescStatus = 'good';
    } else if (metaDescLength > 0 && metaDescLength < 120) {
      metaDescScore = 10;
      metaDescStatus = 'warning';
    } else if (metaDescLength > 160) {
      metaDescScore = 8;
      metaDescStatus = 'warning';
    }

    checks.metaDescription = {
      name: 'Meta Description',
      value: metaDesc || 'Missing',
      details: `${metaDescLength} chars (ideal 120-160)`,
      score: metaDescScore,
      maxScore: 15,
      status: metaDescStatus
    };

    // Favicon check (max 5 points)
    const favicon = this.$('link[rel="icon"], link[rel="shortcut icon"], link[rel*="icon"]').attr('href');
    const faviconScore = favicon ? 5 : 0;
    
    checks.favicon = {
      name: 'Favicon',
      value: favicon ? 'Present' : 'Missing',
      details: favicon || 'No favicon found',
      score: faviconScore,
      maxScore: 5,
      status: favicon ? 'good' : 'error'
    };

    // Viewport meta check (max 5 points)
    const viewport = this.$('meta[name="viewport"]').attr('content');
    const viewportScore = viewport ? 5 : 0;

    checks.viewport = {
      name: 'Viewport Meta',
      value: viewport ? 'Present' : 'Missing',
      details: viewport || 'No viewport meta tag',
      score: viewportScore,
      maxScore: 5,
      status: viewport ? 'good' : 'error'
    };

    // Headings structure check (max 5 points)
    const h1Count = this.$('h1').length;
    const hasH1 = h1Count === 1;
    const headingsScore = hasH1 ? 5 : (h1Count > 1 ? 3 : 0);

    checks.headings = {
      name: 'Headings',
      value: `${h1Count} H1 tag(s)`,
      details: hasH1 ? 'Good - single H1' : (h1Count > 1 ? 'Multiple H1 tags (not recommended)' : 'Missing H1 tag'),
      score: headingsScore,
      maxScore: 5,
      status: hasH1 ? 'good' : 'warning'
    };

    return {
      name: 'Site Quality',
      checks,
      score: Object.values(checks).reduce((sum, c) => sum + c.score, 0),
      maxScore: Object.values(checks).reduce((sum, c) => sum + c.maxScore, 0)
    };
  }

  analyzeContentQuality() {
    const checks = {};

    // Word count check (max 5 points)
    const bodyText = this.$('body').text().replace(/\s+/g, ' ').trim();
    const wordCount = bodyText.split(' ').filter(w => w.length > 0).length;
    let wordCountScore = 0;
    let wordCountStatus = 'warning';

    if (wordCount >= 300) {
      wordCountScore = 5;
      wordCountStatus = 'good';
    } else if (wordCount >= 100) {
      wordCountScore = 3;
      wordCountStatus = 'warning';
    }

    checks.wordCount = {
      name: 'Content Length',
      value: `${wordCount} words`,
      details: wordCount >= 300 ? 'Good content length' : 'Consider adding more content (300+ words recommended)',
      score: wordCountScore,
      maxScore: 5,
      status: wordCountStatus
    };

    // Image optimization check (max 4 points)
    const allImages = this.$('img').length;
    const webpImages = this.$('img[src*=".webp"], source[type="image/webp"]').length;
    const pictureElements = this.$('picture').length;
    const optimizedRatio = allImages > 0 ? ((webpImages + pictureElements) / allImages) : 1;
    const imageOptScore = Math.round(optimizedRatio * 4);

    checks.imageOptimization = {
      name: 'Image Optimization',
      value: `${webpImages + pictureElements}/${allImages} optimized`,
      details: 'WebP format and picture elements for responsive images',
      score: imageOptScore,
      maxScore: 4,
      status: imageOptScore >= 3 ? 'good' : (imageOptScore >= 1 ? 'warning' : 'error')
    };

    return {
      name: 'Content Quality',
      checks,
      score: Object.values(checks).reduce((sum, c) => sum + c.score, 0),
      maxScore: Object.values(checks).reduce((sum, c) => sum + c.maxScore, 0)
    };
  }

  analyzeOpenGraph() {
    const checks = {};

    // OG Title (max 5 points)
    const ogTitle = this.$('meta[property="og:title"]').attr('content');
    checks.ogTitle = {
      name: 'OG Title',
      value: ogTitle || 'Missing',
      score: ogTitle ? 5 : 0,
      maxScore: 5,
      status: ogTitle ? 'good' : 'warning'
    };

    // OG Description (max 5 points)
    const ogDesc = this.$('meta[property="og:description"]').attr('content');
    checks.ogDescription = {
      name: 'OG Description',
      value: ogDesc || 'Missing',
      score: ogDesc ? 5 : 0,
      maxScore: 5,
      status: ogDesc ? 'good' : 'warning'
    };

    // OG Image (max 5 points)
    const ogImage = this.$('meta[property="og:image"]').attr('content');
    checks.ogImage = {
      name: 'OG Image',
      value: ogImage || 'Missing',
      score: ogImage ? 5 : 0,
      maxScore: 5,
      status: ogImage ? 'good' : 'warning'
    };

    return {
      name: 'Open Graph',
      checks,
      score: Object.values(checks).reduce((sum, c) => sum + c.score, 0),
      maxScore: Object.values(checks).reduce((sum, c) => sum + c.maxScore, 0)
    };
  }

  analyzeTwitterCards() {
    const checks = {};

    // Twitter Card Type (max 3 points)
    const twitterCard = this.$('meta[name="twitter:card"]').attr('content');
    checks.cardType = {
      name: 'Card Type',
      value: twitterCard || 'Missing',
      score: twitterCard ? 3 : 0,
      maxScore: 3,
      status: twitterCard ? 'good' : 'warning'
    };

    // Twitter Title (max 3 points)
    const twitterTitle = this.$('meta[name="twitter:title"]').attr('content');
    checks.twitterTitle = {
      name: 'Twitter Title',
      value: twitterTitle || 'Missing',
      score: twitterTitle ? 3 : 0,
      maxScore: 3,
      status: twitterTitle ? 'good' : 'warning'
    };

    // Twitter Description (max 2 points)
    const twitterDesc = this.$('meta[name="twitter:description"]').attr('content');
    checks.twitterDescription = {
      name: 'Twitter Description',
      value: twitterDesc || 'Missing',
      score: twitterDesc ? 2 : 0,
      maxScore: 2,
      status: twitterDesc ? 'good' : 'warning'
    };

    // Twitter Image (max 2 points)
    const twitterImage = this.$('meta[name="twitter:image"]').attr('content');
    checks.twitterImage = {
      name: 'Twitter Image',
      value: twitterImage || 'Missing',
      score: twitterImage ? 2 : 0,
      maxScore: 2,
      status: twitterImage ? 'good' : 'warning'
    };

    return {
      name: 'Twitter Cards',
      checks,
      score: Object.values(checks).reduce((sum, c) => sum + c.score, 0),
      maxScore: Object.values(checks).reduce((sum, c) => sum + c.maxScore, 0)
    };
  }

  analyzeTechnicalSeo() {
    const checks = {};

    // Canonical URL (max 5 points)
    const canonical = this.$('link[rel="canonical"]').attr('href');
    checks.canonical = {
      name: 'Canonical URL',
      value: canonical || 'Missing',
      score: canonical ? 5 : 0,
      maxScore: 5,
      status: canonical ? 'good' : 'warning'
    };

    // HTML Lang (max 3 points)
    const htmlLang = this.$('html').attr('lang');
    checks.htmlLang = {
      name: 'HTML Lang',
      value: htmlLang || 'Missing',
      score: htmlLang ? 3 : 0,
      maxScore: 3,
      status: htmlLang ? 'good' : 'warning'
    };

    // Character Encoding (max 3 points)
    const charset = this.$('meta[charset]').attr('charset') || 
                    this.$('meta[http-equiv="Content-Type"]').attr('content');
    checks.charset = {
      name: 'Character Encoding',
      value: charset || 'Missing',
      score: charset ? 3 : 0,
      maxScore: 3,
      status: charset ? 'good' : 'warning'
    };

    // Schema.org JSON-LD (max 4 points)
    const jsonLd = this.$('script[type="application/ld+json"]').length > 0;
    checks.schemaJsonLd = {
      name: 'Schema.org JSON-LD',
      value: jsonLd ? 'Present' : 'Missing',
      score: jsonLd ? 4 : 0,
      maxScore: 4,
      status: jsonLd ? 'good' : 'warning'
    };

    return {
      name: 'Technical SEO',
      checks,
      score: Object.values(checks).reduce((sum, c) => sum + c.score, 0),
      maxScore: Object.values(checks).reduce((sum, c) => sum + c.maxScore, 0)
    };
  }

  analyzeCrawlability() {
    const checks = {};

    // robots.txt check (max 4 points)
    const hasRobots = this.robotsTxt !== null && this.robotsTxt !== false;
    checks.robotsTxt = {
      name: 'robots.txt',
      value: hasRobots ? 'Present' : 'Missing',
      details: hasRobots ? 'robots.txt file found' : 'No robots.txt file found',
      score: hasRobots ? 4 : 0,
      maxScore: 4,
      status: hasRobots ? 'good' : 'warning'
    };

    // sitemap.xml check (max 4 points)
    const hasSitemap = this.sitemap !== null && this.sitemap !== false;
    checks.sitemap = {
      name: 'Sitemap',
      value: hasSitemap ? 'Present' : 'Missing',
      details: hasSitemap ? 'sitemap.xml found' : 'No sitemap.xml found',
      score: hasSitemap ? 4 : 0,
      maxScore: 4,
      status: hasSitemap ? 'good' : 'warning'
    };

    // llms.txt check (max 3 points)
    const hasLlmsTxt = this.llmsTxt !== null && this.llmsTxt !== false;
    checks.llmsTxt = {
      name: 'llms.txt',
      value: hasLlmsTxt ? 'Present' : 'Missing',
      details: hasLlmsTxt ? 'LLM usage policy found' : 'Add llms.txt to describe LLM usage policies',
      score: hasLlmsTxt ? 3 : 0,
      maxScore: 3,
      status: hasLlmsTxt ? 'good' : 'error'
    };

    return {
      name: 'Crawlability',
      checks,
      score: Object.values(checks).reduce((sum, c) => sum + c.score, 0),
      maxScore: Object.values(checks).reduce((sum, c) => sum + c.maxScore, 0)
    };
  }
}

module.exports = WebsiteQualityAnalyzer;
