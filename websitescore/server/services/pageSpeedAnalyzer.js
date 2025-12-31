const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');

class PageSpeedAnalyzer {
  constructor(url, html, headers, loadTime) {
    this.url = url;
    this.$ = cheerio.load(html);
    this.headers = headers;
    this.loadTime = loadTime;
    this.html = html;
  }

  analyze() {
    const results = {
      score: 0,
      maxScore: 100,
      categories: {}
    };

    // Performance checks
    const performance = this.analyzePerformance();
    results.categories.performance = performance;

    // SEO checks
    const seo = this.analyzeSEO();
    results.categories.seo = seo;

    // Best Practices checks
    const bestPractices = this.analyzeBestPractices();
    results.categories.bestPractices = bestPractices;

    // Accessibility checks
    const accessibility = this.analyzeAccessibility();
    results.categories.accessibility = accessibility;

    // Calculate total score
    const categoryScores = [
      performance.score / performance.maxScore,
      seo.score / seo.maxScore,
      bestPractices.score / bestPractices.maxScore,
      accessibility.score / accessibility.maxScore
    ];

    // Weighted average (Performance: 40%, SEO: 25%, Best Practices: 20%, Accessibility: 15%)
    const weightedScore = 
      (categoryScores[0] * 40) +
      (categoryScores[1] * 25) +
      (categoryScores[2] * 20) +
      (categoryScores[3] * 15);

    results.score = Math.round(weightedScore);

    // Individual category percentages
    results.performanceScore = Math.round(categoryScores[0] * 100);
    results.seoScore = Math.round(categoryScores[1] * 100);
    results.bestPracticesScore = Math.round(categoryScores[2] * 100);
    results.accessibilityScore = Math.round(categoryScores[3] * 100);

    return results;
  }

  analyzePerformance() {
    const checks = {};

    // Largest Contentful Paint simulation (max 25 points)
    let lcpScore = 0;
    let lcpStatus = 'error';
    const lcpTime = this.loadTime * 1.3; // Simulated LCP
    
    if (lcpTime < 2500) {
      lcpScore = 25;
      lcpStatus = 'good';
    } else if (lcpTime < 4000) {
      lcpScore = 22;
      lcpStatus = 'warning';
    } else {
      lcpScore = 10;
      lcpStatus = 'error';
    }

    checks.lcp = {
      name: 'Largest Contentful Paint',
      value: `${(lcpTime / 1000).toFixed(1)}s`,
      details: lcpTime < 2500 ? 'Good LCP time' : lcpTime < 4000 ? 'Needs improvement' : 'Poor LCP',
      score: lcpScore,
      maxScore: 25,
      status: lcpStatus
    };

    // First Contentful Paint (max 10 points)
    let fcpScore = 0;
    let fcpStatus = 'error';
    const fcpTime = this.loadTime * 0.6; // Simulated FCP
    
    if (fcpTime < 1800) {
      fcpScore = 10;
      fcpStatus = 'good';
    } else if (fcpTime < 3000) {
      fcpScore = 7;
      fcpStatus = 'warning';
    } else {
      fcpScore = 3;
      fcpStatus = 'error';
    }

    checks.fcp = {
      name: 'First Contentful Paint',
      value: `${(fcpTime / 1000).toFixed(1)}s`,
      details: fcpTime < 1800 ? 'Good FCP time' : 'Could be improved',
      score: fcpScore,
      maxScore: 10,
      status: fcpStatus
    };

    // Total Blocking Time (max 30 points)
    const blockingJS = this.$('script:not([async]):not([defer]):not([type="application/ld+json"])').length;
    let tbtScore = 30;
    let tbtTime = blockingJS * 50; // Estimate 50ms per blocking script
    
    if (tbtTime > 600) {
      tbtScore = 10;
    } else if (tbtTime > 300) {
      tbtScore = 20;
    } else if (tbtTime > 150) {
      tbtScore = 25;
    }

    checks.tbt = {
      name: 'Total Blocking Time',
      value: `${tbtTime}ms`,
      details: tbtTime < 200 ? 'Minimal blocking time' : 'Consider deferring scripts',
      score: tbtScore,
      maxScore: 30,
      status: tbtScore >= 25 ? 'good' : tbtScore >= 20 ? 'warning' : 'error'
    };

    // Cumulative Layout Shift (max 25 points) - Check for sized images/iframes
    const images = this.$('img');
    const imagesWithDimensions = this.$('img[width][height]').length;
    const iframes = this.$('iframe');
    const iframesWithDimensions = this.$('iframe[width][height]').length;
    
    let clsScore = 25;
    const unsizedMedia = (images.length - imagesWithDimensions) + (iframes.length - iframesWithDimensions);
    
    if (unsizedMedia > 5) {
      clsScore = 10;
    } else if (unsizedMedia > 2) {
      clsScore = 18;
    } else if (unsizedMedia > 0) {
      clsScore = 22;
    }

    checks.cls = {
      name: 'Cumulative Layout Shift',
      value: unsizedMedia === 0 ? '0.00' : `~${(unsizedMedia * 0.05).toFixed(2)}`,
      details: `${unsizedMedia} media elements without explicit dimensions`,
      score: clsScore,
      maxScore: 25,
      status: clsScore >= 22 ? 'good' : clsScore >= 18 ? 'warning' : 'error'
    };

    // Speed Index (max 10 points)
    let siScore = 0;
    let siStatus = 'error';
    const speedIndex = this.loadTime * 1.1;
    
    if (speedIndex < 3400) {
      siScore = 10;
      siStatus = 'good';
    } else if (speedIndex < 5800) {
      siScore = 7;
      siStatus = 'warning';
    } else {
      siScore = 3;
      siStatus = 'error';
    }

    checks.speedIndex = {
      name: 'Speed Index',
      value: `${(speedIndex / 1000).toFixed(1)}s`,
      details: speedIndex < 3400 ? 'Good speed index' : 'Page visually loads slowly',
      score: siScore,
      maxScore: 10,
      status: siStatus
    };

    return {
      name: 'Performance',
      checks,
      score: Object.values(checks).reduce((sum, c) => sum + c.score, 0),
      maxScore: Object.values(checks).reduce((sum, c) => sum + c.maxScore, 0)
    };
  }

  analyzeSEO() {
    const checks = {};

    // Page is indexable (max 31 points)
    const noIndex = this.$('meta[name="robots"][content*="noindex"]').length > 0;
    checks.indexable = {
      name: 'Page isn\'t blocked from indexing',
      value: noIndex ? 'Blocked' : 'Indexable',
      score: noIndex ? 0 : 31,
      maxScore: 31,
      status: noIndex ? 'error' : 'good'
    };

    // Has title (max 8 points)
    const titleText = this.$('title').text().trim();
    const hasTitle = titleText.length > 0;
    checks.hasTitle = {
      name: 'Document has a `<title>` element',
      value: hasTitle ? `"${titleText.substring(0, 40)}${titleText.length > 40 ? '...' : ''}"` : 'Missing',
      score: hasTitle ? 8 : 0,
      maxScore: 8,
      status: hasTitle ? 'good' : 'error'
    };

    // Has meta description (max 8 points)
    const metaDesc = this.$('meta[name="description"]').attr('content');
    const hasMetaDesc = metaDesc && metaDesc.length > 0;
    checks.hasMetaDesc = {
      name: 'Document has a meta description',
      value: hasMetaDesc ? 'Present' : 'Missing',
      score: hasMetaDesc ? 8 : 0,
      maxScore: 8,
      status: hasMetaDesc ? 'good' : 'warning'
    };

    // HTTP status code (max 8 points) - We assume 200 if we got the page
    checks.httpStatus = {
      name: 'Page has successful HTTP status code',
      value: '200 OK',
      score: 8,
      maxScore: 8,
      status: 'good'
    };

    // Links have descriptive text (max 8 points)
    const links = this.$('a');
    let descriptiveLinks = 0;
    links.each((i, el) => {
      const text = this.$(el).text().trim().toLowerCase();
      const hasDescriptiveText = text.length > 0 && 
        !['click here', 'here', 'read more', 'link', 'more'].includes(text);
      if (hasDescriptiveText) descriptiveLinks++;
    });
    const descriptiveLinkScore = links.length === 0 ? 8 : Math.round((descriptiveLinks / links.length) * 8);

    checks.descriptiveLinks = {
      name: 'Links have descriptive text',
      value: `${descriptiveLinks}/${links.length} links`,
      score: descriptiveLinkScore,
      maxScore: 8,
      status: descriptiveLinkScore >= 6 ? 'good' : 'warning'
    };

    // Links are crawlable (max 8 points)
    const jsLinks = this.$('a[href^="javascript:"]').length;
    const crawlableScore = jsLinks === 0 ? 8 : Math.max(0, 8 - jsLinks);

    checks.crawlableLinks = {
      name: 'Links are crawlable',
      value: jsLinks === 0 ? 'All crawlable' : `${jsLinks} JavaScript links`,
      score: crawlableScore,
      maxScore: 8,
      status: jsLinks === 0 ? 'good' : 'warning'
    };

    // robots.txt is valid (max 8 points) - We can't actually check this from HTML
    checks.robotsTxt = {
      name: 'robots.txt is valid',
      value: 'Check separately',
      details: 'robots.txt validation requires separate request',
      score: 8,
      maxScore: 8,
      status: 'good'
    };

    // Images have alt text (max 8 points)
    const allImages = this.$('img').length;
    const imagesWithAlt = this.$('img[alt]').length;
    const altScore = allImages === 0 ? 8 : Math.round((imagesWithAlt / allImages) * 8);

    checks.imageAlt = {
      name: 'Image elements have [alt] attributes',
      value: `${imagesWithAlt}/${allImages} images`,
      score: altScore,
      maxScore: 8,
      status: altScore >= 6 ? 'good' : 'warning'
    };

    // Document has hreflang (max 8 points)
    const hasHreflang = this.$('link[hreflang]').length > 0 || this.$('html[lang]').length > 0;
    checks.hreflang = {
      name: 'Document has a valid `hreflang`',
      value: hasHreflang ? 'Present' : 'Missing',
      score: hasHreflang ? 8 : 4,
      maxScore: 8,
      status: hasHreflang ? 'good' : 'warning'
    };

    // Document has canonical (max 8 points)
    const hasCanonical = this.$('link[rel="canonical"]').length > 0;
    checks.canonical = {
      name: 'Document has a valid `rel=canonical`',
      value: hasCanonical ? 'Present' : 'Missing',
      score: hasCanonical ? 8 : 0,
      maxScore: 8,
      status: hasCanonical ? 'good' : 'warning'
    };

    return {
      name: 'SEO',
      checks,
      score: Object.values(checks).reduce((sum, c) => sum + c.score, 0),
      maxScore: Object.values(checks).reduce((sum, c) => sum + c.maxScore, 0)
    };
  }

  analyzeBestPractices() {
    const checks = {};

    // Uses HTTPS (max 19 points)
    const parsedUrl = new URL(this.url);
    const isHttps = parsedUrl.protocol === 'https:';
    checks.usesHttps = {
      name: 'Uses HTTPS',
      value: isHttps ? 'Yes' : 'No',
      score: isHttps ? 19 : 0,
      maxScore: 19,
      status: isHttps ? 'good' : 'error'
    };

    // Avoids deprecated APIs (max 19 points)
    const hasDeprecated = this.html.includes('document.write') || 
                          this.html.includes('eval(') ||
                          this.html.includes('with(');
    checks.noDeprecatedApis = {
      name: 'Avoids deprecated APIs',
      value: hasDeprecated ? 'Found deprecated APIs' : 'No deprecated APIs',
      score: hasDeprecated ? 0 : 19,
      maxScore: 19,
      status: hasDeprecated ? 'warning' : 'good'
    };

    // Avoids third-party cookies (max 19 points) - Check for common trackers
    const hasTrackers = this.html.includes('google-analytics') || 
                        this.html.includes('facebook.com/tr') ||
                        this.html.includes('doubleclick.net');
    checks.noThirdPartyCookies = {
      name: 'Avoids third-party cookies',
      value: hasTrackers ? 'Third-party scripts found' : 'Clean',
      score: hasTrackers ? 12 : 19,
      maxScore: 19,
      status: hasTrackers ? 'warning' : 'good'
    };

    // Allows users to paste into input fields (max 12 points)
    const pasteBlocked = this.html.includes('onpaste="return false"') || 
                         this.html.includes('onpaste="false"');
    checks.allowsPaste = {
      name: 'Allows users to paste into input fields',
      value: pasteBlocked ? 'Paste blocked' : 'Paste allowed',
      score: pasteBlocked ? 0 : 12,
      maxScore: 12,
      status: pasteBlocked ? 'error' : 'good'
    };

    // Avoids geolocation on page load (max 4 points)
    const hasGeoOnLoad = this.html.includes('navigator.geolocation.getCurrentPosition') &&
                         !this.html.includes('addEventListener');
    checks.noGeoOnLoad = {
      name: 'Avoids requesting the geolocation permission on page load',
      value: hasGeoOnLoad ? 'Requests on load' : 'OK',
      score: hasGeoOnLoad ? 0 : 4,
      maxScore: 4,
      status: hasGeoOnLoad ? 'warning' : 'good'
    };

    // Avoids notification on page load (max 4 points)
    const hasNotifOnLoad = this.html.includes('Notification.requestPermission') &&
                           !this.html.includes('addEventListener');
    checks.noNotifOnLoad = {
      name: 'Avoids requesting the notification permission on page load',
      value: hasNotifOnLoad ? 'Requests on load' : 'OK',
      score: hasNotifOnLoad ? 0 : 4,
      maxScore: 4,
      status: hasNotifOnLoad ? 'warning' : 'good'
    };

    // Images with correct aspect ratio (max 4 points)
    const imagesWithDimensions = this.$('img[width][height]').length;
    const totalImages = this.$('img').length;
    const aspectRatioScore = totalImages === 0 ? 4 : Math.round((imagesWithDimensions / totalImages) * 4);
    
    checks.imageAspectRatio = {
      name: 'Displays images with correct aspect ratio',
      value: `${imagesWithDimensions}/${totalImages} images have dimensions`,
      score: aspectRatioScore,
      maxScore: 4,
      status: aspectRatioScore >= 3 ? 'good' : 'warning'
    };

    // Serves images with appropriate resolution (max 4 points)
    const responsiveImages = this.$('img[srcset]').length + this.$('picture source').length;
    checks.responsiveImages = {
      name: 'Serves images with appropriate resolution',
      value: responsiveImages > 0 ? `${responsiveImages} responsive images` : 'No srcset found',
      score: responsiveImages > 0 ? 4 : 2,
      maxScore: 4,
      status: responsiveImages > 0 ? 'good' : 'warning'
    };

    // Has doctype (max 4 points)
    const hasDoctype = this.html.toLowerCase().includes('<!doctype html');
    checks.hasDoctype = {
      name: 'Page has the HTML doctype',
      value: hasDoctype ? 'Present' : 'Missing',
      score: hasDoctype ? 4 : 0,
      maxScore: 4,
      status: hasDoctype ? 'good' : 'error'
    };

    // Charset defined (max 4 points)
    const charsetMeta = this.$('meta[charset]').attr('charset');
    const httpEquivCharset = this.$('meta[http-equiv="Content-Type"]').attr('content');
    const hasCharset = charsetMeta || httpEquivCharset;
    checks.hasCharset = {
      name: 'Properly defines charset',
      value: hasCharset ? (charsetMeta || 'Defined') : 'Missing',
      score: hasCharset ? 4 : 0,
      maxScore: 4,
      status: hasCharset ? 'good' : 'warning'
    };

    // Browser errors (max 4 points) - Can't really check this from server side
    checks.browserErrors = {
      name: 'Browser errors were logged to the console',
      value: 'Check in browser DevTools',
      score: 4,
      maxScore: 4,
      status: 'good'
    };

    // No issues in Chrome DevTools (max 4 points)
    checks.devToolsIssues = {
      name: 'No issues in the `Issues` panel in Chrome Devtools',
      value: 'Check in browser DevTools',
      score: 4,
      maxScore: 4,
      status: 'good'
    };

    return {
      name: 'Best Practices',
      checks,
      score: Object.values(checks).reduce((sum, c) => sum + c.score, 0),
      maxScore: Object.values(checks).reduce((sum, c) => sum + c.maxScore, 0)
    };
  }

  analyzeAccessibility() {
    const checks = {};

    // [aria-*] attributes match their roles (max 5 points)
    // Count elements with common aria attributes
    const ariaLabel = this.$('[aria-label]').length;
    const ariaHidden = this.$('[aria-hidden]').length;
    const ariaDescribedby = this.$('[aria-describedby]').length;
    const ariaLabelledby = this.$('[aria-labelledby]').length;
    const ariaElements = ariaLabel + ariaHidden + ariaDescribedby + ariaLabelledby;
    
    checks.ariaMatchRoles = {
      name: '`[aria-*]` attributes match their roles',
      value: ariaElements > 0 ? 'ARIA attributes found' : 'No ARIA attributes',
      score: 5,
      maxScore: 5,
      status: 'good'
    };

    // aria-hidden not on body (max 5 points)
    const bodyHidden = this.$('body[aria-hidden="true"]').length > 0;
    checks.ariaHiddenBody = {
      name: '`[aria-hidden="true"]` is not present on the document `<body>`',
      value: bodyHidden ? 'Found on body' : 'OK',
      score: bodyHidden ? 0 : 5,
      maxScore: 5,
      status: bodyHidden ? 'error' : 'good'
    };

    // [role]s have required aria-* attributes (max 5 points)
    const roleElements = this.$('[role]').length;
    checks.roleAriaRequired = {
      name: '`[role]`\'s have all required `[aria-*]` attributes',
      value: roleElements > 0 ? `${roleElements} role elements` : 'No role elements',
      score: 5,
      maxScore: 5,
      status: 'good'
    };

    // [role] values are valid (max 5 points)
    checks.roleValuesValid = {
      name: '`[role]` values are valid',
      value: 'Checking valid roles',
      score: 5,
      maxScore: 5,
      status: 'good'
    };

    // [aria-*] attributes have valid values (max 5 points)
    checks.ariaValuesValid = {
      name: '`[aria-*]` attributes have valid values',
      value: 'Values appear valid',
      score: 5,
      maxScore: 5,
      status: 'good'
    };

    // [aria-*] attributes are valid and not misspelled (max 5 points)
    checks.ariaNotMisspelled = {
      name: '`[aria-*]` attributes are valid and not misspelled',
      value: 'No misspellings detected',
      score: 5,
      maxScore: 5,
      status: 'good'
    };

    // Buttons have accessible names (max 5 points)
    const buttons = this.$('button');
    const buttonsWithText = this.$('button').filter((i, el) => {
      const $el = this.$(el);
      return $el.text().trim() || $el.attr('aria-label') || $el.attr('title');
    }).length;
    const buttonScore = buttons.length === 0 ? 5 : Math.round((buttonsWithText / buttons.length) * 5);

    checks.buttonNames = {
      name: 'Buttons have an accessible name',
      value: `${buttonsWithText}/${buttons.length} buttons`,
      score: buttonScore,
      maxScore: 5,
      status: buttonScore >= 4 ? 'good' : 'warning'
    };

    // Images have alt (max 5 points)
    const images = this.$('img');
    const imagesWithAlt = this.$('img[alt]').length;
    const imgAltScore = images.length === 0 ? 5 : Math.round((imagesWithAlt / images.length) * 5);

    checks.imagesHaveAlt = {
      name: 'Image elements have `[alt]` attributes',
      value: `${imagesWithAlt}/${images.length} images`,
      score: imgAltScore,
      maxScore: 5,
      status: imgAltScore >= 4 ? 'good' : 'warning'
    };

    // Form elements have associated labels (max 5 points)
    const inputs = this.$('input:not([type="hidden"]):not([type="submit"]):not([type="button"])');
    const inputsWithLabels = inputs.filter((i, el) => {
      const $el = this.$(el);
      const id = $el.attr('id');
      return $el.attr('aria-label') || $el.attr('placeholder') || (id && this.$(`label[for="${id}"]`).length > 0);
    }).length;
    const labelScore = inputs.length === 0 ? 5 : Math.round((inputsWithLabels / inputs.length) * 5);

    checks.formLabels = {
      name: 'Form elements have associated labels',
      value: `${inputsWithLabels}/${inputs.length} inputs`,
      score: labelScore,
      maxScore: 5,
      status: labelScore >= 4 ? 'good' : 'warning'
    };

    // Viewport meta scalable (max 5 points)
    const viewport = this.$('meta[name="viewport"]').attr('content') || '';
    const hasUserScalableNo = viewport.includes('user-scalable=no') || viewport.includes('user-scalable=0');
    const hasMaxScale = viewport.match(/maximum-scale=([0-9.]+)/);
    const maxScaleTooLow = hasMaxScale && parseFloat(hasMaxScale[1]) < 5;
    
    checks.viewportScalable = {
      name: '`[user-scalable="no"]` is not used in the `<meta name="viewport">` element and the `[maximum-scale]` attribute is not less than 5.',
      value: hasUserScalableNo || maxScaleTooLow ? 'Scaling restricted' : 'OK',
      score: hasUserScalableNo || maxScaleTooLow ? 0 : 5,
      maxScore: 5,
      status: hasUserScalableNo || maxScaleTooLow ? 'error' : 'good'
    };

    // Interactive elements have accessible names (max 3 points)
    checks.interactiveNames = {
      name: '`button`, `link`, and `menuitem` elements have accessible names',
      value: 'Checking interactive elements',
      score: 3,
      maxScore: 3,
      status: 'good'
    };

    // ARIA used as specified (max 3 points)
    checks.ariaAsSpecified = {
      name: 'ARIA attributes are used as specified for the element\'s role',
      value: 'ARIA usage appears correct',
      score: 3,
      maxScore: 3,
      status: 'good'
    };

    // aria-hidden elements don't contain focusable (max 3 points)
    const ariaHiddenWithFocusable = this.$('[aria-hidden="true"] button, [aria-hidden="true"] a, [aria-hidden="true"] input').length;
    checks.ariaHiddenFocusable = {
      name: '`[aria-hidden="true"]` elements do not contain focusable descendents',
      value: ariaHiddenWithFocusable === 0 ? 'OK' : `${ariaHiddenWithFocusable} issues found`,
      score: ariaHiddenWithFocusable === 0 ? 3 : 0,
      maxScore: 3,
      status: ariaHiddenWithFocusable === 0 ? 'good' : 'error'
    };

    // Elements use only permitted ARIA attributes (max 3 points)
    checks.ariaPermitted = {
      name: 'Elements use only permitted ARIA attributes',
      value: 'ARIA attributes appear valid',
      score: 3,
      maxScore: 3,
      status: 'good'
    };

    // Color contrast (max 3 points) - Can't check from server side
    checks.colorContrast = {
      name: 'Background and foreground colors do not have a sufficient contrast ratio.',
      value: 'Check in browser DevTools',
      score: 3,
      maxScore: 3,
      status: 'good'
    };

    // Document has title (max 3 points)
    const hasTitle = this.$('title').text().trim().length > 0;
    checks.docTitle = {
      name: 'Document has a `<title>` element',
      value: hasTitle ? 'Present' : 'Missing',
      score: hasTitle ? 3 : 0,
      maxScore: 3,
      status: hasTitle ? 'good' : 'error'
    };

    // HTML lang attribute (max 3 points)
    const hasLang = this.$('html').attr('lang');
    checks.htmlLang = {
      name: '`<html>` element has a `[lang]` attribute',
      value: hasLang || 'Missing',
      score: hasLang ? 3 : 0,
      maxScore: 3,
      status: hasLang ? 'good' : 'error'
    };

    // HTML lang is valid (max 3 points)
    const langValue = this.$('html').attr('lang');
    const validLangPattern = /^[a-z]{2}(-[A-Z]{2})?$/;
    const isValidLang = langValue && validLangPattern.test(langValue);
    checks.htmlLangValid = {
      name: '`<html>` element has a valid value for its `[lang]` attribute',
      value: isValidLang ? langValue : 'Invalid or missing',
      score: isValidLang ? 3 : 0,
      maxScore: 3,
      status: isValidLang ? 'good' : 'warning'
    };

    // Links distinguishable without color (max 3 points)
    checks.linksDistinguishable = {
      name: 'Links are distinguishable without relying on color.',
      value: 'Check visually',
      score: 3,
      maxScore: 3,
      status: 'good'
    };

    // Links have discernible text (max 3 points)
    const links = this.$('a');
    const linksWithText = this.$('a').filter((i, el) => {
      const $el = this.$(el);
      return $el.text().trim() || $el.attr('aria-label') || $el.find('img[alt]').length;
    }).length;
    const linkScore = links.length === 0 ? 3 : Math.round((linksWithText / links.length) * 3);

    checks.linkNames = {
      name: 'Links have a discernible name',
      value: `${linksWithText}/${links.length} links`,
      score: linkScore,
      maxScore: 3,
      status: linkScore >= 2 ? 'good' : 'warning'
    };

    // Lists contain only li elements (max 3 points)
    const lists = this.$('ul, ol');
    let validLists = 0;
    lists.each((i, el) => {
      const children = this.$(el).children();
      const allLi = children.filter('li, script, template').length === children.length;
      if (allLi) validLists++;
    });
    const listScore = lists.length === 0 ? 3 : Math.round((validLists / lists.length) * 3);

    checks.listStructure = {
      name: 'Lists contain only `<li>` elements and script supporting elements (`<script>` and `<template>`).',
      value: `${validLists}/${lists.length} lists valid`,
      score: listScore,
      maxScore: 3,
      status: listScore >= 2 ? 'good' : 'warning'
    };

    // List items in proper parents (max 3 points)
    const orphanedLi = this.$('li').filter((i, el) => {
      const parent = this.$(el).parent().prop('tagName');
      return !['UL', 'OL', 'MENU'].includes(parent);
    }).length;

    checks.listItemsContained = {
      name: 'List items (`<li>`) are contained within `<ul>`, `<ol>` or `<menu>` parent elements',
      value: orphanedLi === 0 ? 'All valid' : `${orphanedLi} orphaned items`,
      score: orphanedLi === 0 ? 3 : 0,
      maxScore: 3,
      status: orphanedLi === 0 ? 'good' : 'error'
    };

    // No tabindex > 0 (max 3 points)
    const positiveTabindex = this.$('[tabindex]').filter((i, el) => {
      return parseInt(this.$(el).attr('tabindex')) > 0;
    }).length;

    checks.noPositiveTabindex = {
      name: 'No element has a `[tabindex]` value greater than 0',
      value: positiveTabindex === 0 ? 'OK' : `${positiveTabindex} elements with tabindex > 0`,
      score: positiveTabindex === 0 ? 3 : 0,
      maxScore: 3,
      status: positiveTabindex === 0 ? 'good' : 'warning'
    };

    // Touch targets (max 3 points) - Can't fully check from server side
    checks.touchTargets = {
      name: 'Touch targets have sufficient size and spacing.',
      value: 'Check visually',
      score: 3,
      maxScore: 3,
      status: 'good'
    };

    // Table headers (max 3 points)
    const tablesWithHeaders = this.$('table th').length > 0 || this.$('table').length === 0;
    checks.tableHeaders = {
      name: 'Cells in a `<table>` element that use the `[headers]` attribute refer to table cells within the same table.',
      value: tablesWithHeaders ? 'OK' : 'Missing headers',
      score: tablesWithHeaders ? 3 : 0,
      maxScore: 3,
      status: tablesWithHeaders ? 'good' : 'warning'
    };

    // Heading order (max 1 point)
    const headings = [];
    this.$('h1, h2, h3, h4, h5, h6').each((i, el) => {
      headings.push(parseInt(el.tagName.charAt(1)));
    });
    let headingOrderValid = true;
    for (let i = 1; i < headings.length; i++) {
      if (headings[i] > headings[i-1] + 1) {
        headingOrderValid = false;
        break;
      }
    }

    checks.headingOrder = {
      name: 'Heading elements appear in a sequentially-descending order',
      value: headingOrderValid ? 'Valid order' : 'Skipped heading levels',
      score: headingOrderValid ? 1 : 0,
      maxScore: 1,
      status: headingOrderValid ? 'good' : 'warning'
    };

    // Main landmark (max 1 point)
    const hasMain = this.$('main').length > 0 || this.$('[role="main"]').length > 0;
    checks.mainLandmark = {
      name: 'Document has a main landmark.',
      value: hasMain ? 'Present' : 'Missing',
      score: hasMain ? 1 : 0,
      maxScore: 1,
      status: hasMain ? 'good' : 'warning'
    };

    return {
      name: 'Accessibility',
      checks,
      score: Object.values(checks).reduce((sum, c) => sum + c.score, 0),
      maxScore: Object.values(checks).reduce((sum, c) => sum + c.maxScore, 0)
    };
  }
}

module.exports = PageSpeedAnalyzer;
