const axios = require('axios');
const https = require('https');
const { URL } = require('url');

class TrustSecurityAnalyzer {
  constructor(url, headers, html = '') {
    this.url = url;
    this.headers = headers;
    this.html = html;
    this.parsedUrl = new URL(url);
  }

  async analyze() {
    const results = {
      score: 0,
      maxScore: 100,
      categories: {}
    };

    // Security Headers checks (includes HTTPS)
    const securityHeaders = this.analyzeSecurityHeaders();
    results.categories.securityHeaders = securityHeaders;

    // Domain Trust checks
    const domainTrust = this.analyzeDomainTrust();
    results.categories.domainTrust = domainTrust;

    // Infrastructure checks
    const infrastructure = this.analyzeInfrastructure();
    results.categories.infrastructure = infrastructure;

    // Trust Indicators checks
    const trustIndicators = this.analyzeTrustIndicators();
    results.categories.trustIndicators = trustIndicators;

    // Calculate total score
    const allChecks = [
      ...Object.values(securityHeaders.checks),
      ...Object.values(domainTrust.checks),
      ...Object.values(infrastructure.checks),
      ...Object.values(trustIndicators.checks)
    ];

    const earnedPoints = allChecks.reduce((sum, check) => sum + check.score, 0);
    const maxPoints = allChecks.reduce((sum, check) => sum + check.maxScore, 0);
    
    results.score = Math.round((earnedPoints / maxPoints) * 100);

    return results;
  }

  analyzeSecurityHeaders() {
    const checks = {};

    // HTTPS check (max 20 points)
    const isHttps = this.parsedUrl.protocol === 'https:';
    checks.https = {
      name: 'HTTPS',
      value: isHttps ? 'Secure connection enabled' : 'Not using HTTPS',
      score: isHttps ? 20 : 0,
      maxScore: 20,
      status: isHttps ? 'good' : 'error'
    };

    // Strict-Transport-Security (HSTS) (max 10 points)
    const hsts = this.headers['strict-transport-security'];
    let hstsScore = 0;
    let hstsDetails = 'Missing';
    if (hsts) {
      hstsScore = 10;
      hstsDetails = hsts;
      // Check for preload and includeSubDomains
      if (!hsts.includes('includeSubDomains')) hstsScore = 7;
      if (!hsts.includes('preload')) hstsScore = Math.min(hstsScore, 8);
    }
    checks.hsts = {
      name: 'HTTP Strict Transport Security',
      value: hsts ? `HSTS: ${hsts.substring(0, 60)}${hsts.length > 60 ? '...' : ''}` : 'Missing',
      details: hstsDetails,
      score: hstsScore,
      maxScore: 10,
      status: hsts ? 'good' : 'warning'
    };

    // Content-Security-Policy (max 10 points)
    const csp = this.headers['content-security-policy'];
    checks.csp = {
      name: 'Content Security Policy',
      value: csp ? 'CSP configured' : 'Missing',
      details: csp ? csp.substring(0, 100) + '...' : 'No CSP header found - vulnerable to XSS',
      score: csp ? 10 : 0,
      maxScore: 10,
      status: csp ? 'good' : 'warning'
    };

    // X-Frame-Options (max 5 points)
    const xFrameOptions = this.headers['x-frame-options'];
    checks.frameProtection = {
      name: 'Clickjacking Protection',
      value: xFrameOptions ? `X-Frame-Options: ${xFrameOptions}` : 'Missing',
      details: xFrameOptions ? 'Protected against clickjacking' : 'Vulnerable to clickjacking attacks',
      score: xFrameOptions ? 5 : 0,
      maxScore: 5,
      status: xFrameOptions ? 'good' : 'warning'
    };

    // X-Content-Type-Options (max 5 points)
    const xContentType = this.headers['x-content-type-options'];
    checks.mimeProtection = {
      name: 'MIME Sniffing Protection',
      value: xContentType ? `X-Content-Type-Options: ${xContentType}` : 'Missing',
      details: xContentType ? 'MIME sniffing prevented' : 'Browser may interpret files incorrectly',
      score: xContentType ? 5 : 0,
      maxScore: 5,
      status: xContentType ? 'good' : 'warning'
    };

    // X-XSS-Protection (max 3 points) - Legacy but still useful
    const xssProtection = this.headers['x-xss-protection'];
    checks.xssProtection = {
      name: 'XSS Protection Header',
      value: xssProtection ? `X-XSS-Protection: ${xssProtection}` : 'Missing',
      details: xssProtection ? 'Legacy XSS filter enabled' : 'Legacy browser protection missing',
      score: xssProtection ? 3 : 0,
      maxScore: 3,
      status: xssProtection ? 'good' : 'warning'
    };

    // Referrer-Policy (max 5 points)
    const referrerPolicy = this.headers['referrer-policy'];
    checks.referrerPolicy = {
      name: 'Referrer Policy',
      value: referrerPolicy ? `Referrer-Policy: ${referrerPolicy}` : 'Missing',
      details: referrerPolicy ? 'Controls referrer information sent' : 'May leak sensitive URL data',
      score: referrerPolicy ? 5 : 0,
      maxScore: 5,
      status: referrerPolicy ? 'good' : 'warning'
    };

    // Permissions-Policy (max 5 points)
    const permissionsPolicy = this.headers['permissions-policy'] || this.headers['feature-policy'];
    checks.permissionsPolicy = {
      name: 'Permissions Policy',
      value: permissionsPolicy ? 'Configured' : 'Missing',
      details: permissionsPolicy ? 'Browser features restricted' : 'No restrictions on browser features',
      score: permissionsPolicy ? 5 : 0,
      maxScore: 5,
      status: permissionsPolicy ? 'good' : 'warning'
    };

    // Cache-Control for security (max 3 points)
    const cacheControl = this.headers['cache-control'];
    const hasSecureCache = cacheControl && (cacheControl.includes('no-store') || cacheControl.includes('private'));
    checks.secureCache = {
      name: 'Secure Caching',
      value: cacheControl ? cacheControl : 'Not configured',
      details: hasSecureCache ? 'Sensitive data not cached publicly' : 'Check if sensitive pages need no-store',
      score: hasSecureCache ? 3 : 1,
      maxScore: 3,
      status: hasSecureCache ? 'good' : 'warning'
    };

    // Cross-Origin headers (max 4 points)
    const coep = this.headers['cross-origin-embedder-policy'];
    const coop = this.headers['cross-origin-opener-policy'];
    const corp = this.headers['cross-origin-resource-policy'];
    const crossOriginCount = (coep ? 1 : 0) + (coop ? 1 : 0) + (corp ? 1 : 0);
    checks.crossOrigin = {
      name: 'Cross-Origin Isolation',
      value: crossOriginCount > 0 ? `${crossOriginCount}/3 policies set` : 'Not configured',
      details: `COEP: ${coep || 'missing'}, COOP: ${coop || 'missing'}, CORP: ${corp || 'missing'}`,
      score: Math.min(4, crossOriginCount * 2),
      maxScore: 4,
      status: crossOriginCount >= 2 ? 'good' : crossOriginCount > 0 ? 'warning' : 'warning'
    };

    return {
      name: 'Security Headers',
      checks,
      score: Object.values(checks).reduce((sum, c) => sum + c.score, 0),
      maxScore: Object.values(checks).reduce((sum, c) => sum + c.maxScore, 0)
    };
  }

  async analyzeSSL() {
    const checks = {};
    
    try {
      if (this.parsedUrl.protocol === 'https:') {
        // Get SSL certificate info
        const sslInfo = await this.getSSLInfo();
        
        // Valid SSL (max 10 points)
        checks.validSsl = {
          name: 'Valid SSL Certificate',
          value: sslInfo.valid ? 'Valid' : 'Invalid',
          details: sslInfo.issuer || 'Could not verify',
          score: sslInfo.valid ? 10 : 0,
          maxScore: 10,
          status: sslInfo.valid ? 'good' : 'error'
        };

        // Days until expiry (max 5 points)
        const daysUntilExpiry = sslInfo.daysRemaining || 0;
        let expiryScore = 0;
        let expiryStatus = 'error';
        
        if (daysUntilExpiry > 30) {
          expiryScore = 5;
          expiryStatus = 'good';
        } else if (daysUntilExpiry > 7) {
          expiryScore = 3;
          expiryStatus = 'warning';
        }

        checks.sslExpiry = {
          name: 'SSL Expiry',
          value: `${daysUntilExpiry} days remaining`,
          score: expiryScore,
          maxScore: 5,
          status: expiryStatus
        };
      } else {
        checks.validSsl = {
          name: 'Valid SSL Certificate',
          value: 'Not applicable (HTTP)',
          score: 0,
          maxScore: 10,
          status: 'error'
        };

        checks.sslExpiry = {
          name: 'SSL Expiry',
          value: 'Not applicable',
          score: 0,
          maxScore: 5,
          status: 'error'
        };
      }
    } catch (error) {
      checks.validSsl = {
        name: 'Valid SSL Certificate',
        value: 'Could not verify',
        score: 0,
        maxScore: 10,
        status: 'warning'
      };

      checks.sslExpiry = {
        name: 'SSL Expiry',
        value: 'Could not verify',
        score: 0,
        maxScore: 5,
        status: 'warning'
      };
    }

    return {
      name: 'SSL/TLS',
      checks,
      score: Object.values(checks).reduce((sum, c) => sum + c.score, 0),
      maxScore: Object.values(checks).reduce((sum, c) => sum + c.maxScore, 0)
    };
  }

  getSSLInfo() {
    return new Promise((resolve) => {
      try {
        const options = {
          hostname: this.parsedUrl.hostname,
          port: 443,
          method: 'GET',
          rejectUnauthorized: false
        };

        const req = https.request(options, (res) => {
          const cert = res.socket.getPeerCertificate();
          
          if (cert && cert.valid_to) {
            const expiryDate = new Date(cert.valid_to);
            const now = new Date();
            const daysRemaining = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
            
            resolve({
              valid: res.socket.authorized !== false,
              issuer: cert.issuer ? cert.issuer.O : 'Unknown',
              daysRemaining,
              validFrom: cert.valid_from,
              validTo: cert.valid_to
            });
          } else {
            resolve({ valid: false, daysRemaining: 0 });
          }
        });

        req.on('error', () => {
          resolve({ valid: false, daysRemaining: 0 });
        });

        req.setTimeout(5000, () => {
          req.destroy();
          resolve({ valid: false, daysRemaining: 0 });
        });

        req.end();
      } catch (error) {
        resolve({ valid: false, daysRemaining: 0 });
      }
    });
  }

  analyzeDomainTrust() {
    const checks = {};

    // Domain Rating (max 25 points)
    checks.domainRating = {
      name: 'Domain Rating',
      value: 'Not available',
      details: 'Third-party API required (Ahrefs, Moz). Connect API for accurate DR score.',
      score: 0,
      maxScore: 25,
      status: 'warning'
    };

    // Domain Age (max 5 points)
    checks.domainAge = {
      name: 'Domain Age',
      value: 'Could not determine',
      details: 'WHOIS lookup required for accurate data',
      score: 0,
      maxScore: 5,
      status: 'warning'
    };

    // Registrar info
    checks.registrar = {
      name: 'Registrar',
      value: 'Could not determine',
      details: 'WHOIS lookup required',
      score: 0,
      maxScore: 0,
      status: 'warning'
    };

    // Country
    checks.country = {
      name: 'Country',
      value: 'Could not determine',
      details: 'WHOIS lookup required',
      score: 0,
      maxScore: 0,
      status: 'warning'
    };

    return {
      name: 'Domain Trust',
      checks,
      score: Object.values(checks).reduce((sum, c) => sum + c.score, 0),
      maxScore: Object.values(checks).reduce((sum, c) => sum + c.maxScore, 0)
    };
  }

  analyzeInfrastructure() {
    const checks = {};

    // Detect CDN/Provider from headers
    const server = this.headers['server'] || '';
    const via = this.headers['via'] || '';
    const cfRay = this.headers['cf-ray'];
    const xVercelId = this.headers['x-vercel-id'];
    const xAmzCfId = this.headers['x-amz-cf-id'];
    const xCache = this.headers['x-cache'] || '';
    const xPoweredBy = this.headers['x-powered-by'] || '';

    let provider = 'Unknown';
    if (cfRay) {
      provider = 'Cloudflare';
    } else if (xVercelId) {
      provider = 'Vercel';
    } else if (xAmzCfId || xCache.includes('cloudfront')) {
      provider = 'AWS CloudFront';
    } else if (server.toLowerCase().includes('nginx')) {
      provider = 'Nginx';
    } else if (server.toLowerCase().includes('apache')) {
      provider = 'Apache';
    } else if (server.toLowerCase().includes('netlify')) {
      provider = 'Netlify';
    } else if (via.includes('google')) {
      provider = 'Google Cloud';
    } else if (server.toLowerCase().includes('microsoft') || server.toLowerCase().includes('iis')) {
      provider = 'Microsoft IIS';
    }

    checks.provider = {
      name: 'Hosting Provider',
      value: provider,
      details: provider !== 'Unknown' ? `Hosted on ${provider}` : 'Could not detect hosting provider',
      score: 0,
      maxScore: 0,
      status: provider !== 'Unknown' ? 'good' : 'warning'
    };

    // CDN Detection (max 5 points)
    const hasCDN = cfRay || xAmzCfId || xCache.includes('HIT') || xCache.includes('cloudfront') || 
                   via.includes('cloudflare') || via.includes('akamai') || via.includes('fastly');
    checks.cdn = {
      name: 'CDN Usage',
      value: hasCDN ? 'CDN detected' : 'No CDN detected',
      details: hasCDN ? 'Content delivered via CDN for better performance' : 'Consider using a CDN',
      score: hasCDN ? 5 : 0,
      maxScore: 5,
      status: hasCDN ? 'good' : 'warning'
    };

    // Server Version Exposure (max 3 points) - Hiding is better for security
    const exposesVersion = server.match(/[\d.]+/) || xPoweredBy.match(/[\d.]+/);
    checks.serverExposure = {
      name: 'Server Version Hidden',
      value: exposesVersion ? 'Version exposed' : 'Version hidden',
      details: exposesVersion ? `Server header reveals: ${server || xPoweredBy}` : 'Server version not exposed',
      score: exposesVersion ? 0 : 3,
      maxScore: 3,
      status: exposesVersion ? 'warning' : 'good'
    };

    // X-Powered-By removal check (max 2 points)
    checks.poweredBy = {
      name: 'X-Powered-By Hidden',
      value: xPoweredBy ? `Exposed: ${xPoweredBy}` : 'Hidden',
      details: xPoweredBy ? 'Technology stack exposed - remove this header' : 'Technology stack not revealed',
      score: xPoweredBy ? 0 : 2,
      maxScore: 2,
      status: xPoweredBy ? 'warning' : 'good'
    };

    // WAF Detection (informational)
    const hasWAF = cfRay || this.headers['x-sucuri-id'] || this.headers['x-cdn'] || 
                   server.toLowerCase().includes('cloudflare') || server.toLowerCase().includes('sucuri');
    checks.waf = {
      name: 'Web Application Firewall',
      value: hasWAF ? 'WAF detected' : 'No WAF detected',
      details: hasWAF ? 'Protected by web application firewall' : 'Consider adding WAF protection',
      score: 0,
      maxScore: 0,
      status: hasWAF ? 'good' : 'warning'
    };

    return {
      name: 'Infrastructure',
      checks,
      score: Object.values(checks).reduce((sum, c) => sum + c.score, 0),
      maxScore: Object.values(checks).reduce((sum, c) => sum + c.maxScore, 0)
    };
  }

  analyzeTrustIndicators() {
    const checks = {};
    const htmlLower = this.html.toLowerCase();

    // Privacy Policy detection (max 4 points)
    const hasPrivacyPolicy = htmlLower.includes('privacy policy') || 
                             htmlLower.includes('privacy-policy') ||
                             htmlLower.includes('/privacy') ||
                             htmlLower.includes('datenschutz');
    checks.privacyPolicy = {
      name: 'Privacy Policy',
      value: hasPrivacyPolicy ? 'Found' : 'Not detected',
      details: hasPrivacyPolicy ? 'Privacy policy link detected' : 'Required for GDPR/CCPA compliance',
      score: hasPrivacyPolicy ? 4 : 0,
      maxScore: 4,
      status: hasPrivacyPolicy ? 'good' : 'warning'
    };

    // Terms of Service detection (max 3 points)
    const hasTerms = htmlLower.includes('terms of service') || 
                     htmlLower.includes('terms-of-service') ||
                     htmlLower.includes('terms and conditions') ||
                     htmlLower.includes('/terms') ||
                     htmlLower.includes('tos');
    checks.termsOfService = {
      name: 'Terms of Service',
      value: hasTerms ? 'Found' : 'Not detected',
      details: hasTerms ? 'Terms of service link detected' : 'Consider adding terms of service',
      score: hasTerms ? 3 : 0,
      maxScore: 3,
      status: hasTerms ? 'good' : 'warning'
    };

    // Contact information detection (max 3 points)
    const hasContact = htmlLower.includes('contact us') || 
                       htmlLower.includes('contact-us') ||
                       htmlLower.includes('/contact') ||
                       htmlLower.includes('mailto:') ||
                       htmlLower.includes('tel:') ||
                       htmlLower.includes('support@') ||
                       htmlLower.includes('info@');
    checks.contactInfo = {
      name: 'Contact Information',
      value: hasContact ? 'Found' : 'Not detected',
      details: hasContact ? 'Contact information available' : 'Add contact info for trust',
      score: hasContact ? 3 : 0,
      maxScore: 3,
      status: hasContact ? 'good' : 'warning'
    };

    // Cookie consent detection (max 3 points)
    const hasCookieConsent = htmlLower.includes('cookie') && 
                             (htmlLower.includes('consent') || 
                              htmlLower.includes('accept') ||
                              htmlLower.includes('policy') ||
                              htmlLower.includes('banner'));
    checks.cookieConsent = {
      name: 'Cookie Notice',
      value: hasCookieConsent ? 'Detected' : 'Not detected',
      details: hasCookieConsent ? 'Cookie consent mechanism found' : 'Required for GDPR compliance',
      score: hasCookieConsent ? 3 : 0,
      maxScore: 3,
      status: hasCookieConsent ? 'good' : 'warning'
    };

    // About section (max 2 points)
    const hasAbout = htmlLower.includes('about us') ||
                     htmlLower.includes('about-us') ||
                     htmlLower.includes('/about') ||
                     htmlLower.includes('our team') ||
                     htmlLower.includes('our story') ||
                     htmlLower.includes('who we are');
    checks.aboutSection = {
      name: 'About Section',
      value: hasAbout ? 'Found' : 'Not detected',
      details: hasAbout ? 'About information available' : 'Add about section for credibility',
      score: hasAbout ? 2 : 0,
      maxScore: 2,
      status: hasAbout ? 'good' : 'warning'
    };

    // Physical Address (max 2 points)
    const hasAddress = htmlLower.includes('address') ||
                       this.html.match(/\d{5}/) || // ZIP code
                       htmlLower.includes('street') ||
                       htmlLower.includes('suite') ||
                       htmlLower.includes('floor');
    checks.physicalAddress = {
      name: 'Physical Address',
      value: hasAddress ? 'Detected' : 'Not found',
      details: hasAddress ? 'Physical address information found' : 'Consider adding business address',
      score: hasAddress ? 2 : 0,
      maxScore: 2,
      status: hasAddress ? 'good' : 'warning'
    };

    // Social Media Links (max 2 points)
    const hasSocial = htmlLower.includes('twitter.com') ||
                      htmlLower.includes('facebook.com') ||
                      htmlLower.includes('linkedin.com') ||
                      htmlLower.includes('instagram.com') ||
                      htmlLower.includes('youtube.com') ||
                      htmlLower.includes('x.com');
    checks.socialMedia = {
      name: 'Social Media Presence',
      value: hasSocial ? 'Links found' : 'Not detected',
      details: hasSocial ? 'Social media links present' : 'Add social proof for credibility',
      score: hasSocial ? 2 : 0,
      maxScore: 2,
      status: hasSocial ? 'good' : 'warning'
    };

    // Trust Badges/Seals (max 2 points)
    const hasTrustBadges = htmlLower.includes('ssl') ||
                           htmlLower.includes('secure') ||
                           htmlLower.includes('verified') ||
                           htmlLower.includes('certified') ||
                           htmlLower.includes('trust') ||
                           htmlLower.includes('norton') ||
                           htmlLower.includes('mcafee') ||
                           htmlLower.includes('bbb');
    checks.trustBadges = {
      name: 'Trust Indicators',
      value: hasTrustBadges ? 'Found' : 'Not detected',
      details: hasTrustBadges ? 'Trust badges/seals detected' : 'Consider adding trust badges',
      score: hasTrustBadges ? 2 : 0,
      maxScore: 2,
      status: hasTrustBadges ? 'good' : 'warning'
    };

    // GDPR Compliance indicators (max 2 points)
    const hasGDPR = htmlLower.includes('gdpr') ||
                    htmlLower.includes('data protection') ||
                    htmlLower.includes('data subject') ||
                    htmlLower.includes('right to be forgotten') ||
                    htmlLower.includes('data controller');
    checks.gdprCompliance = {
      name: 'GDPR Compliance',
      value: hasGDPR ? 'Indicators found' : 'Not detected',
      details: hasGDPR ? 'GDPR compliance information present' : 'Consider GDPR compliance if serving EU',
      score: hasGDPR ? 2 : 0,
      maxScore: 2,
      status: hasGDPR ? 'good' : 'warning'
    };

    return {
      name: 'Trust Indicators',
      checks,
      score: Object.values(checks).reduce((sum, c) => sum + c.score, 0),
      maxScore: Object.values(checks).reduce((sum, c) => sum + c.maxScore, 0)
    };
  }
}

module.exports = TrustSecurityAnalyzer;
