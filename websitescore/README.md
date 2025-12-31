# WebsiteScore

A website analyzer that scores websites on three main parameters:

- **Website Quality** (61/100 example)
- **Trust & Security** (45/100 example)
- **PageSpeed** (85/100 example)

## Features

### Website Quality Analysis

- Title tag optimization (length check)
- Meta description analysis
- Favicon detection
- Viewport meta tag
- Heading structure (H1)
- Open Graph tags (title, description, image, URL, type)
- Twitter Cards (card type, title, description, image)
- Schema.org JSON-LD
- Canonical URL
- HTML lang attribute
- Character encoding

### Trust & Security Analysis

- HTTPS check
- SSL certificate validation
- HTTP Strict Transport Security (HSTS)
- Content Security Policy (CSP)
- X-Frame-Options
- X-Content-Type-Options
- XSS Protection
- Referrer Policy

### PageSpeed Analysis

- **Performance**: Server response time, HTML size, lazy loading, render blocking resources
- **SEO**: Indexability, title, meta description, crawlable links, image alt attributes
- **Best Practices**: HTTPS, doctype, charset, document.write usage
- **Accessibility**: HTML lang, button names, link names, form labels, ARIA usage

## Tech Stack

- **Backend**: Node.js, Express.js
- **Frontend**: React.js
- **Libraries**: Axios, Cheerio (HTML parsing)

## Installation

1. Clone the repository:

```bash
cd websitescore
```

2. Install dependencies:

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

## Running the Application

1. Start the backend server (runs on port 5000):

```bash
cd server
npm run dev
```

2. In a new terminal, start the React frontend (runs on port 3000):

```bash
cd client
npm start
```

3. Open http://localhost:3000 in your browser

## API Endpoint

**POST** `/api/analyze`

Request body:

```json
{
  "url": "https://example.com"
}
```

Response:

```json
{
  "url": "https://example.com",
  "analyzedAt": "2024-01-01T00:00:00.000Z",
  "loadTime": "1.23s",
  "overallScore": 65,
  "sections": {
    "websiteQuality": { "score": 61, "maxScore": 100, ... },
    "trustSecurity": { "score": 45, "maxScore": 100, ... },
    "pageSpeed": { "score": 85, "maxScore": 100, ... }
  }
}
```

## Screenshot Reference

The scoring system is designed to match the style shown in the reference screenshots:

- Circular progress indicators
- Color coding (green/yellow/red based on scores)
- Detailed breakdown of each category
- Clean, dark themed UI

## License

MIT
