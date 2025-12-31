import React, { useState } from 'react';
import { FiZap } from 'react-icons/fi';
import ScoreCircle from './ScoreCircle';

const getScoreColor = (score, maxScore) => {
  const percentage = (score / maxScore) * 100;
  if (percentage >= 70) return 'good';
  if (percentage >= 40) return 'warning';
  return 'error';
};

// Tooltip descriptions for PageSpeed parameters
const parameterDescriptions = {
  // Performance
  'Largest Contentful Paint': 'Time until the largest content element (image/text block) is visible. Target: <2.5s',
  'First Contentful Paint': 'Time until the first content is painted on screen. Target: <1.8s',
  'Total Blocking Time': 'Total time the main thread was blocked, preventing user input. Target: <200ms',
  'Cumulative Layout Shift': 'Measures visual stability - how much the page layout shifts unexpectedly. Target: <0.1',
  'Speed Index': 'How quickly content is visually displayed during page load. Target: <3.4s',
  
  // SEO
  "Page isn't blocked from indexing": 'Whether search engines can index this page.',
  'Document has a `<title>` element': 'Page has a title tag that appears in search results and browser tabs.',
  'Document has a meta description': 'Page has a meta description shown in search result snippets.',
  'Page has successful HTTP status code': 'Server returned a 200 OK status, meaning the page loaded successfully.',
  'Links have descriptive text': 'Links use meaningful text instead of "click here" or "read more".',
  'Links are crawlable': 'Links use valid URLs that search engines can follow.',
  'robots.txt is valid': 'The robots.txt file is properly formatted and accessible.',
  'Image elements have [alt] attributes': 'Images have alternative text for SEO and accessibility.',
  'Document has a valid `hreflang`': 'Page specifies language/region for international SEO.',
  'Document has a valid `rel=canonical`': 'Page has a canonical URL to prevent duplicate content issues.',
  
  // Best Practices
  'Uses HTTPS': 'Site uses secure encrypted connections.',
  'Avoids deprecated APIs': 'Code doesn\'t use outdated methods like document.write() or eval().',
  'Avoids third-party cookies': 'Minimizes tracking scripts that set third-party cookies.',
  'Allows users to paste into input fields': 'Users can paste text into form fields.',
  'Avoids requesting the geolocation permission on page load': 'Doesn\'t ask for location immediately on page load.',
  'Avoids requesting the notification permission on page load': 'Doesn\'t ask for notification permission on load.',
  'Displays images with correct aspect ratio': 'Images have width/height to prevent layout shifts.',
  'Serves images with appropriate resolution': 'Images use srcset for different screen sizes.',
  'Page has the HTML doctype': 'Page declares <!DOCTYPE html> for standards mode.',
  'Properly defines charset': 'Character encoding (usually UTF-8) is specified.',
  'Browser errors were logged to the console': 'Check browser DevTools for JavaScript errors.',
  'No issues in the `Issues` panel in Chrome Devtools': 'Chrome DevTools shows no issues.',
  
  // Accessibility
  '`[aria-*]` attributes match their roles': 'ARIA attributes are appropriate for their element roles.',
  '`[aria-hidden="true"]` is not present on the document `<body>`': 'Body element is not hidden from screen readers.',
  '`[role]`\'s have all required `[aria-*]` attributes': 'Role elements have all required ARIA attributes.',
  '`[role]` values are valid': 'Role attribute values are valid ARIA roles.',
  '`[aria-*]` attributes have valid values': 'ARIA attribute values are valid.',
  '`[aria-*]` attributes are valid and not misspelled': 'ARIA attributes are spelled correctly.',
  'Buttons have an accessible name': 'Buttons have text or aria-label for screen readers.',
  'Image elements have `[alt]` attributes': 'Images have alternative text descriptions.',
  'Form elements have associated labels': 'Form inputs have labels for accessibility.',
  '`[user-scalable="no"]` is not used in the `<meta name="viewport">` element and the `[maximum-scale]` attribute is not less than 5.': 'Users can zoom the page for accessibility.',
  '`button`, `link`, and `menuitem` elements have accessible names': 'Interactive elements have accessible names.',
  'ARIA attributes are used as specified for the element\'s role': 'ARIA is used correctly for element roles.',
  '`[aria-hidden="true"]` elements do not contain focusable descendents': 'Hidden elements don\'t trap keyboard focus.',
  'Elements use only permitted ARIA attributes': 'ARIA attributes are valid for their elements.',
  'Background and foreground colors do not have a sufficient contrast ratio.': 'Text has enough contrast against background.',
  'Document has a `<title>` element': 'Page has a title for browser tabs and screen readers.',
  '`<html>` element has a `[lang]` attribute': 'Page declares its language for screen readers.',
  '`<html>` element has a valid value for its `[lang]` attribute': 'Language code is valid (e.g., "en", "en-US").',
  'Links are distinguishable without relying on color.': 'Links are visible to colorblind users.',
  'Links have a discernible name': 'Links have meaningful text content.',
  'Lists contain only `<li>` elements and script supporting elements (`<script>` and `<template>`).': 'List structure is valid HTML.',
  'List items (`<li>`) are contained within `<ul>`, `<ol>` or `<menu>` parent elements': 'List items are properly nested.',
  'No element has a `[tabindex]` value greater than 0': 'Tab order follows document order.',
  'Touch targets have sufficient size and spacing.': 'Buttons and links are large enough to tap.',
  'Cells in a `<table>` element that use the `[headers]` attribute refer to table cells within the same table.': 'Table headers are properly associated.',
  'Heading elements appear in a sequentially-descending order': 'Headings follow H1 > H2 > H3 hierarchy.',
  'Document has a main landmark.': 'Page has a <main> element or role="main".'
};

const InfoIcon = ({ description }) => (
  <span className="info-icon-wrapper">
    <svg className="info-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"></circle>
      <path d="M12 16v-4"></path>
      <path d="M12 8h.01"></path>
    </svg>
    <span className="info-tooltip">{description}</span>
  </span>
);

const PageSpeedCard = ({ data }) => {
  const colorClass = getScoreColor(data.score, data.maxScore);
  const [copied, setCopied] = useState(false);

  // Count checks by status
  const allChecks = Object.values(data.categories).flatMap(cat => Object.values(cat.checks));
  const goodCount = allChecks.filter(c => c.status === 'good').length;
  const warningCount = allChecks.filter(c => c.status === 'warning').length;
  const errorCount = allChecks.filter(c => c.status === 'error').length;

  // Generate LLM prompt
  const generateLLMPrompt = () => {
    const issues = allChecks.filter(c => c.status !== 'good');
    const goodChecks = allChecks.filter(c => c.status === 'good');
    
    let prompt = `# PageSpeed Analysis Report\n\n`;
    prompt += `**Overall Score: ${data.score}/100**\n\n`;
    prompt += `## Category Scores\n`;
    prompt += `- Performance: ${data.performanceScore}/100\n`;
    prompt += `- SEO: ${data.seoScore}/100\n`;
    prompt += `- Best Practices: ${data.bestPracticesScore}/100\n`;
    prompt += `- Accessibility: ${data.accessibilityScore}/100\n\n`;
    
    prompt += `## Summary\n`;
    prompt += `- [PASS] Passed: ${goodCount} checks\n`;
    prompt += `- [WARN] Warnings: ${warningCount} checks\n`;
    prompt += `- [FAIL] Failed: ${errorCount} checks\n\n`;

    if (issues.length > 0) {
      prompt += `## Issues Found\n\n`;
      issues.forEach((check, i) => {
        const statusIcon = check.status === 'error' ? '[FAIL]' : '[WARN]';
        prompt += `${i + 1}. ${statusIcon} **${check.name}**: ${check.value}\n`;
        if (check.details) prompt += `   - Details: ${check.details}\n`;
        prompt += `   - Points: ${check.score}/${check.maxScore}\n\n`;
      });

      prompt += `## Strategy to Achieve 100/100 Score\n\n`;
      prompt += `Please help me fix the following performance and optimization issues:\n\n`;
      
      issues.forEach((check, i) => {
        prompt += `### ${i + 1}. Fix: ${check.name}\n`;
        prompt += `- Current state: ${check.value}\n`;
        prompt += `- Points to gain: ${check.maxScore - check.score} points\n`;
        
        // Add specific recommendations
        if (check.name.includes('Response Time') || check.name.includes('Server')) {
          prompt += `- Recommendation: Optimize server response time by using caching, CDN, and efficient backend code.\n`;
        } else if (check.name.includes('HTML') && check.name.includes('Size')) {
          prompt += `- Recommendation: Minify HTML, remove unnecessary whitespace and comments.\n`;
        } else if (check.name.includes('Lazy Loading')) {
          prompt += `- Recommendation: Add loading="lazy" attribute to images below the fold.\n`;
        } else if (check.name.includes('Render Blocking')) {
          prompt += `- Recommendation: Use async/defer for scripts, inline critical CSS, load non-critical CSS asynchronously.\n`;
        } else if (check.name.includes('Resource Hints')) {
          prompt += `- Recommendation: Add preconnect, prefetch, and preload hints for critical resources.\n`;
        } else if (check.name.includes('Compression')) {
          prompt += `- Recommendation: Enable gzip or Brotli compression on your server.\n`;
        } else if (check.name.includes('Cache')) {
          prompt += `- Recommendation: Implement proper cache headers (Cache-Control, ETag) for static assets.\n`;
        } else if (check.name.includes('Third-Party')) {
          prompt += `- Recommendation: Audit and remove unnecessary third-party scripts, load them asynchronously.\n`;
        } else if (check.name.includes('index') || check.name.includes('Indexable')) {
          prompt += `- Recommendation: Remove noindex directive if you want the page to be searchable.\n`;
        } else if (check.name.includes('title')) {
          prompt += `- Recommendation: Add a descriptive <title> tag to your page.\n`;
        } else if (check.name.includes('meta description')) {
          prompt += `- Recommendation: Add a compelling meta description tag.\n`;
        } else if (check.name.includes('alt')) {
          prompt += `- Recommendation: Add descriptive alt attributes to all images for accessibility.\n`;
        } else if (check.name.includes('HTTPS')) {
          prompt += `- Recommendation: Install SSL certificate and redirect HTTP to HTTPS.\n`;
        } else if (check.name.includes('doctype')) {
          prompt += `- Recommendation: Ensure <!DOCTYPE html> is at the very top of your HTML.\n`;
        } else if (check.name.includes('charset')) {
          prompt += `- Recommendation: Add <meta charset="UTF-8"> in your HTML head.\n`;
        } else if (check.name.includes('lang')) {
          prompt += `- Recommendation: Add lang attribute to HTML element: <html lang="en">.\n`;
        } else if (check.name.includes('button') || check.name.includes('Button')) {
          prompt += `- Recommendation: Add text content or aria-label to all buttons.\n`;
        } else if (check.name.includes('link') || check.name.includes('Link')) {
          prompt += `- Recommendation: Ensure all links have descriptive text content.\n`;
        } else if (check.name.includes('label') || check.name.includes('Label')) {
          prompt += `- Recommendation: Associate form inputs with labels using for/id or aria-label.\n`;
        } else if (check.name.includes('ARIA')) {
          prompt += `- Recommendation: Implement ARIA attributes properly for better accessibility.\n`;
        } else {
          prompt += `- Recommendation: Review and implement best practices for ${check.name.toLowerCase()}.\n`;
        }
        prompt += `\n`;
      });
    }

    if (goodChecks.length > 0) {
      prompt += `## What's Already Working Well\n\n`;
      goodChecks.forEach(check => {
        prompt += `- ${check.name}: ${check.value} (${check.score}/${check.maxScore})\n`;
      });
    }

    prompt += `\n---\n`;
    prompt += `Please provide specific code examples and step-by-step instructions to fix each issue listed above, focusing on performance optimization and web best practices.`;
    
    return prompt;
  };

  const handleCopy = async () => {
    const prompt = generateLLMPrompt();
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="section-card">
      <div className="section-header">
        <div className="section-title">
          <span className="section-icon"><FiZap size={24} /></span>
          <h3>PageSpeed</h3>
        </div>
        <div className="section-header-right">
          <button className="copy-llm-btn" onClick={handleCopy} title="Copy this prompt to improve this section">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            {copied ? 'Copied!' : 'Copy to LLM'}
          </button>
          <div className="status-counts">
            <span className="status-count good">● {goodCount}</span>
            <span className="status-count warning">● {warningCount}</span>
            <span className="status-count error">● {errorCount}</span>
          </div>
          <div className="section-score">
            <span className={`score score-${colorClass}`}>{data.score}</span>
            <span className="max">/{data.maxScore}</span>
          </div>
        </div>
      </div>
      <div className="section-content">
        {/* Mini score circles for subcategories */}
        <div className="pagespeed-scores">
          <ScoreCircle score={data.performanceScore} label="Performance" />
          <ScoreCircle score={data.seoScore} label="SEO" />
          <ScoreCircle score={data.bestPracticesScore} label="Best Practices" />
          <ScoreCircle score={data.accessibilityScore} label="Accessibility" />
        </div>

        {/* Detailed checks */}
        {Object.entries(data.categories).map(([key, category]) => (
          <div key={key} className="category">
            <h4 className="category-title">{category.name}</h4>
            <div className="checks-list">
              {Object.entries(category.checks).map(([checkKey, check]) => (
                <div key={checkKey} className="check-item">
                  <div className="check-info">
                    <div className="check-name">
                      <span className={`status-dot ${check.status}`}></span>
                      {check.name}
                      <InfoIcon description={parameterDescriptions[check.name] || `Information about ${check.name}`} />
                    </div>
                    <div className="check-value" title={check.value}>
                      {check.details || check.value}
                    </div>
                  </div>
                  <span className="check-score">{check.score}/{check.maxScore}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PageSpeedCard;
