import React, { useState } from 'react';
import axios from 'axios';
import { FiBarChart2, FiShield } from 'react-icons/fi';
import ScoreCircle from './components/ScoreCircle';
import SectionCard from './components/SectionCard';
import PageSpeedCard from './components/PageSpeedCard';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function App() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);

  const analyzeWebsite = async (e) => {
    e.preventDefault();
    
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    // Add protocol if missing
    let targetUrl = url.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }

    setLoading(true);
    setError('');
    setResults(null);

    try {
      const response = await axios.post(`${API_URL}/api/analyze`, { url: targetUrl });
      setResults(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to analyze the website. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>WebsiteScore</h1>
        <p>Analyze your website's quality, security, and performance</p>
      </header>

      <div className="search-container">
        <form onSubmit={analyzeWebsite} className="search-box">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter website URL (e.g., example.com)"
            disabled={loading}
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Analyzing...' : 'Analyze'}
          </button>
        </form>
      </div>

      {loading && (
        <div className="loading">
          <div className="spinner"></div>
          <p>Analyzing website... This may take a few seconds.</p>
        </div>
      )}

      {error && (
        <div className="error">
          <p>{error}</p>
        </div>
      )}

      {results && (
        <div className="results">
          <div className="overall-score">
            <h2>Overall Score</h2>
            <ScoreCircle score={results.overallScore} size="large" />
            <p className="analyzed-url">{results.url}</p>
          </div>

          <div className="sections-grid">
            <SectionCard
              title="Website Quality"
              score={results.sections.websiteQuality.score}
              maxScore={results.sections.websiteQuality.maxScore}
              categories={results.sections.websiteQuality.categories}
              icon={<FiBarChart2 size={24} />}
            />

            <SectionCard
              title="Trust & Security"
              score={results.sections.trustSecurity.score}
              maxScore={results.sections.trustSecurity.maxScore}
              categories={results.sections.trustSecurity.categories}
              icon={<FiShield size={24} />}
            />

            <PageSpeedCard
              data={results.sections.pageSpeed}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
