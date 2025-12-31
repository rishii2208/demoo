import React, { useState } from 'react';
import { FiCheckCircle, FiAlertCircle, FiXCircle } from 'react-icons/fi';

const getScoreColor = (score, maxScore) => {
  const percentage = (score / maxScore) * 100;
  if (percentage >= 70) return 'good';
  if (percentage >= 40) return 'warning';
  return 'error';
};

// Tooltip descriptions for each parameter
const parameterDescriptions = {
  // Site Quality
  'Title': 'The main title of your webpage. Appears in browser tabs and search results.',
  'Meta Description': 'A brief summary of your page content. Shown in search engine results below the title.',
  'Favicon': 'The small icon displayed in browser tabs and bookmarks.',
  'Viewport Meta': 'Controls how your page scales on mobile devices. Essential for responsive design.',
  'Headings': 'H1 tags define the main topic of your page. Should have exactly one per page.',
  
  // Content Quality
  'Content Length': 'The amount of text content on your page. More content often ranks better.',
  'Image Optimization': 'Whether images use modern formats like WebP for faster loading.',
  'Link Structure': 'The balance between internal links (your site) and external links (other sites).',
  'Image Sources': 'Checks if all images have valid source URLs.',
  
  // Open Graph
  'OG Title': 'Title shown when your page is shared on Facebook and other platforms.',
  'OG Description': 'Description shown when shared on social media platforms.',
  'OG Image': 'Preview image displayed when your page is shared on social media.',
  
  // Twitter Cards
  'Card Type': 'The layout style for Twitter/X previews (summary, large image, etc.).',
  'Twitter Title': 'Title shown when your page is shared on Twitter/X.',
  'Twitter Description': 'Description shown in Twitter/X card previews.',
  'Twitter Image': 'Image displayed in Twitter/X card previews.',
  
  // Technical SEO
  'Canonical URL': 'Tells search engines the preferred URL for this page to avoid duplicate content.',
  'HTML Lang': 'Specifies the language of your page content for accessibility and SEO.',
  'Character Encoding': 'Defines how text characters are encoded (UTF-8 recommended).',
  'Schema.org JSON-LD': 'Structured data that helps search engines understand your content.',
  
  // Crawlability
  'robots.txt': 'A file that tells search engine crawlers which pages to index.',
  'Sitemap': 'An XML file listing all pages on your site for search engines.',
  'llms.txt': 'A file describing your site\'s AI/LLM usage policies.',
  'Meta Robots': 'Controls whether search engines can index this specific page.',
  
  // Security Headers
  'HTTPS': 'Secure encrypted connection using SSL/TLS. Essential for protecting data in transit.',
  'HTTP Strict Transport Security': 'HSTS forces browsers to only use HTTPS, preventing downgrade attacks.',
  'Content Security Policy': 'CSP prevents XSS and injection attacks by controlling allowed content sources.',
  'Clickjacking Protection': 'X-Frame-Options prevents your site from being embedded in malicious iframes.',
  'MIME Sniffing Protection': 'X-Content-Type-Options prevents browsers from guessing MIME types incorrectly.',
  'XSS Protection Header': 'Legacy X-XSS-Protection header for older browsers without CSP support.',
  'Referrer Policy': 'Controls how much referrer URL information is sent to other sites.',
  'Permissions Policy': 'Restricts which browser features (camera, microphone, etc.) can be used.',
  'Secure Caching': 'Cache-Control settings that prevent sensitive data from being cached.',
  'Cross-Origin Isolation': 'COEP, COOP, CORP headers that enable cross-origin isolation for security.',
  
  // Domain Trust
  'Domain Rating': 'A metric indicating your domain\'s authority and backlink profile (0-100 scale).',
  'Domain Age': 'How long your domain has been registered. Older domains are generally more trusted.',
  'Registrar': 'The company where your domain name is registered (e.g., GoDaddy, Namecheap).',
  'Country': 'The country where the domain/business is registered.',
  
  // Infrastructure
  'Hosting Provider': 'The server/platform hosting your website (Cloudflare, Vercel, AWS, etc.).',
  'CDN Usage': 'Content Delivery Network distributes your content globally for faster loading.',
  'Server Version Hidden': 'Hiding server version prevents attackers from targeting known vulnerabilities.',
  'X-Powered-By Hidden': 'Hiding technology stack (PHP, Express, etc.) reduces attack surface.',
  'Web Application Firewall': 'WAF protects against common web attacks like SQL injection and XSS.',
  
  // Trust Indicators
  'Privacy Policy': 'Legal document explaining how you collect, use, and protect user data. Required by GDPR/CCPA.',
  'Terms of Service': 'Legal agreement between you and users defining rules and guidelines.',
  'Contact Information': 'Email, phone, or contact form for users to reach you. Builds trust.',
  'Cookie Notice': 'GDPR-compliant banner informing users about cookie usage and getting consent.',
  'About Section': 'Information about your company, team, or story. Builds credibility and trust.',
  'Physical Address': 'Business address shows legitimacy and is required for some regulations.',
  'Social Media Presence': 'Links to social profiles show authenticity and provide social proof.',
  'Trust Indicators': 'Trust badges, security seals, and certifications that build confidence.',
  'GDPR Compliance': 'Compliance with EU data protection regulations for user privacy rights.'
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

const SectionCard = ({ title, score, maxScore, categories, icon }) => {
  const colorClass = getScoreColor(score, maxScore);
  const [copied, setCopied] = useState(false);

  // Count checks by status
  const allChecks = Object.values(categories).flatMap(cat => Object.values(cat.checks));
  const goodCount = allChecks.filter(c => c.status === 'good').length;
  const warningCount = allChecks.filter(c => c.status === 'warning').length;
  const errorCount = allChecks.filter(c => c.status === 'error').length;

  // Generate LLM prompt
  const generateLLMPrompt = () => {
    const issues = allChecks.filter(c => c.status !== 'good');
    const goodChecks = allChecks.filter(c => c.status === 'good');
    
    let prompt = `# ${title} Analysis Report\n\n`;
    prompt += `**Current Score: ${score}/100**\n\n`;
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
      prompt += `Please help me fix the following issues on my website:\n\n`;
      
      issues.forEach((check, i) => {
        prompt += `### ${i + 1}. Fix: ${check.name}\n`;
        prompt += `- Current state: ${check.value}\n`;
        prompt += `- Points to gain: ${check.maxScore - check.score} points\n`;
        
        // Add specific recommendations based on check name
        if (check.name.includes('Title')) {
          prompt += `- Recommendation: Create a compelling title between 30-60 characters that includes your main keyword.\n`;
        } else if (check.name.includes('Meta Description')) {
          prompt += `- Recommendation: Write a descriptive meta description between 120-160 characters that summarizes the page content.\n`;
        } else if (check.name.includes('Favicon')) {
          prompt += `- Recommendation: Add a favicon using <link rel="icon" href="/favicon.ico"> in your HTML head.\n`;
        } else if (check.name.includes('Viewport')) {
          prompt += `- Recommendation: Add <meta name="viewport" content="width=device-width, initial-scale=1"> to your HTML head.\n`;
        } else if (check.name.includes('H1') || check.name.includes('Heading')) {
          prompt += `- Recommendation: Ensure your page has exactly one H1 tag that describes the main topic.\n`;
        } else if (check.name.includes('OG') || check.name.includes('Open Graph')) {
          prompt += `- Recommendation: Add Open Graph meta tags for better social media sharing.\n`;
        } else if (check.name.includes('Twitter')) {
          prompt += `- Recommendation: Add Twitter Card meta tags for better Twitter/X sharing.\n`;
        } else if (check.name.includes('Canonical')) {
          prompt += `- Recommendation: Add <link rel="canonical" href="YOUR_URL"> to prevent duplicate content issues.\n`;
        } else if (check.name.includes('Schema') || check.name.includes('JSON-LD')) {
          prompt += `- Recommendation: Add structured data using JSON-LD format for better SEO.\n`;
        } else if (check.name.includes('robots.txt')) {
          prompt += `- Recommendation: Create a robots.txt file in your root directory to guide search engine crawlers.\n`;
        } else if (check.name.includes('Sitemap')) {
          prompt += `- Recommendation: Create and submit a sitemap.xml file to help search engines discover your pages.\n`;
        } else if (check.name.includes('llms.txt')) {
          prompt += `- Recommendation: Create an llms.txt file to define AI/LLM usage policies for your site.\n`;
        } else if (check.name.includes('HTTPS')) {
          prompt += `- Recommendation: Enable HTTPS by installing an SSL certificate on your server.\n`;
        } else if (check.name.includes('HSTS') || check.name.includes('Strict Transport')) {
          prompt += `- Recommendation: Add Strict-Transport-Security header to enforce HTTPS.\n`;
        } else if (check.name.includes('Content Security Policy') || check.name.includes('CSP')) {
          prompt += `- Recommendation: Implement a Content-Security-Policy header to prevent XSS attacks.\n`;
        } else if (check.name.includes('Privacy')) {
          prompt += `- Recommendation: Add a privacy policy page and link to it from your footer.\n`;
        } else if (check.name.includes('Contact')) {
          prompt += `- Recommendation: Add contact information (email, phone, or contact form) to your website.\n`;
        } else if (check.name.includes('Cookie')) {
          prompt += `- Recommendation: Implement a cookie consent banner for GDPR compliance.\n`;
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
    prompt += `Please provide specific code examples and step-by-step instructions to fix each issue listed above.`;
    
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
          <span className="section-icon">{icon}</span>
          <h3>{title}</h3>
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
            <span className={`score score-${colorClass}`}>{score}</span>
            <span className="max">/{maxScore}</span>
          </div>
        </div>
      </div>
      <div className="section-content">
        {Object.entries(categories).map(([key, category]) => (
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
                      {check.value.length > 60 ? check.value.substring(0, 60) + '...' : check.value}
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

export default SectionCard;
