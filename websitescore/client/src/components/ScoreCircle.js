import React from 'react';

const getScoreColor = (score) => {
  if (score >= 70) return 'good';
  if (score >= 40) return 'warning';
  return 'error';
};

const ScoreCircle = ({ score, size = 'medium', label }) => {
  const isLarge = size === 'large';
  const radius = isLarge ? 70 : 24;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const colorClass = getScoreColor(score);

  if (isLarge) {
    return (
      <div className="score-circle-large">
        <svg width="180" height="180">
          <circle
            className="bg"
            cx="90"
            cy="90"
            r={radius}
          />
          <circle
            className={`progress stroke-${colorClass}`}
            cx="90"
            cy="90"
            r={radius}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <span className={`score-value-large score-${colorClass}`}>{score}</span>
      </div>
    );
  }

  return (
    <div className="mini-score">
      <div className="mini-score-circle">
        <svg width="60" height="60">
          <circle
            className="bg"
            cx="30"
            cy="30"
            r={radius}
          />
          <circle
            className={`progress stroke-${colorClass}`}
            cx="30"
            cy="30"
            r={radius}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <span className={`mini-score-value score-${colorClass}`}>{score}</span>
      </div>
      {label && <span className="mini-score-label">{label}</span>}
    </div>
  );
};

export default ScoreCircle;
