const express = require('express');
const axios = require('axios');
const WebsiteQualityAnalyzer = require('../services/websiteQualityAnalyzer');
const TrustSecurityAnalyzer = require('../services/trustSecurityAnalyzer');
const PageSpeedAnalyzer = require('../services/pageSpeedAnalyzer');

const router = express.Router();

// Helper function to check if a file exists at URL
async function checkFileExists(baseUrl, path) {
  try {
    const response = await axios.get(`${baseUrl}${path}`, {
      timeout: 5000,
      validateStatus: (status) => status === 200,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WebsiteScoreBot/1.0)'
      }
    });
    return response.data;
  } catch (e) {
    return null;
  }
}

router.post('/', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Validate URL
    let validUrl;
    try {
      validUrl = new URL(url);
      if (!['http:', 'https:'].includes(validUrl.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch (e) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    console.log(`Analyzing: ${url}`);
    const baseUrl = `${validUrl.protocol}//${validUrl.host}`;

    // Fetch the website
    const startTime = Date.now();
    let response;
    
    try {
      response = await axios.get(url, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
        },
        maxRedirects: 5,
        validateStatus: (status) => status < 500
      });
    } catch (fetchError) {
      console.error('Fetch error:', fetchError.message);
      return res.status(400).json({ 
        error: 'Could not fetch the website',
        details: fetchError.message 
      });
    }

    const loadTime = Date.now() - startTime;
    const html = response.data;
    const headers = response.headers;

    // Check for robots.txt, sitemap.xml, and llms.txt in parallel
    const [robotsTxt, sitemap, llmsTxt] = await Promise.all([
      checkFileExists(baseUrl, '/robots.txt'),
      checkFileExists(baseUrl, '/sitemap.xml'),
      checkFileExists(baseUrl, '/llms.txt')
    ]);

    // Run all analyzers
    const websiteQualityAnalyzer = new WebsiteQualityAnalyzer(url, html, headers, {
      robotsTxt,
      sitemap,
      llmsTxt
    });
    const websiteQualityResults = websiteQualityAnalyzer.analyze();

    const trustSecurityAnalyzer = new TrustSecurityAnalyzer(url, headers, html);
    const trustSecurityResults = await trustSecurityAnalyzer.analyze();

    const pageSpeedAnalyzer = new PageSpeedAnalyzer(url, html, headers, loadTime);
    const pageSpeedResults = pageSpeedAnalyzer.analyze();

    // Calculate overall score (weighted average)
    const overallScore = Math.round(
      (websiteQualityResults.score * 0.35) +
      (trustSecurityResults.score * 0.30) +
      (pageSpeedResults.score * 0.35)
    );

    const result = {
      url,
      analyzedAt: new Date().toISOString(),
      loadTime: `${(loadTime / 1000).toFixed(2)}s`,
      overallScore,
      sections: {
        websiteQuality: {
          name: 'Website Quality',
          score: websiteQualityResults.score,
          maxScore: 100,
          categories: websiteQualityResults.categories
        },
        trustSecurity: {
          name: 'Trust & Security',
          score: trustSecurityResults.score,
          maxScore: 100,
          categories: trustSecurityResults.categories
        },
        pageSpeed: {
          name: 'PageSpeed',
          score: pageSpeedResults.score,
          maxScore: 100,
          performanceScore: pageSpeedResults.performanceScore,
          seoScore: pageSpeedResults.seoScore,
          bestPracticesScore: pageSpeedResults.bestPracticesScore,
          accessibilityScore: pageSpeedResults.accessibilityScore,
          categories: pageSpeedResults.categories
        }
      }
    };

    res.json(result);
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze the website',
      details: error.message 
    });
  }
});

module.exports = router;
