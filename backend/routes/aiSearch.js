// backend/routes/aiSearch.js
const express = require('express');
const router = express.Router();
const { aiLogSearch, getTrendingIssues } = require('../services/aiSearchService');

/**
 * POST /api/ai/search
 * Natural language log search
 */
router.post('/search', async (req, res) => {
  try {
    const { query, timeRange = 24 } = req.body;
    
    // Validate input
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Query is required and must be a string'
      });
    }

    if (query.trim().length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Query must be at least 3 characters long'
      });
    }

    console.log(`📥 AI Search request: "${query}" (timeRange: ${timeRange}h)`);

    // Perform AI search
    const result = await aiLogSearch(query, timeRange);
    
    res.json(result);
    
  } catch (error) {
    console.error('❌ AI search route error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during AI search',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/ai/trending
 * Get trending issues (what's breaking right now)
 */
router.get('/trending', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 1;
    
    if (hours < 1 || hours > 168) { // Max 1 week
      return res.status(400).json({
        success: false,
        error: 'Hours must be between 1 and 168'
      });
    }

    const result = await getTrendingIssues(hours);
    res.json(result);
    
  } catch (error) {
    console.error('❌ Trending issues route error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trending issues',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/ai/suggestions
 * Get suggested questions based on recent logs
 */
router.get('/suggestions', async (req, res) => {
  try {
    // Get trending issues to generate smart suggestions
    const trending = await getTrendingIssues(1);
    
    const suggestions = [
      'Why are payments failing?',
      'Show critical errors from last hour',
      'What\'s the top issue right now?',
      'Are there any new anomalies?'
    ];

    // Add dynamic suggestions based on trending issues
    if (trending.success && trending.trending && trending.trending.length > 0) {
      const topIssue = trending.trending[0];
      if (topIssue._id) {
        suggestions.unshift(`Tell me about ${topIssue._id}`);
      }
    }

    res.json({
      success: true,
      suggestions: suggestions.slice(0, 5) // Return top 5
    });
    
  } catch (error) {
    console.error('❌ Suggestions route error:', error);
    res.json({
      success: true,
      suggestions: [
        'Why are payments failing?',
        'Show critical errors from last hour',
        'What\'s the top issue right now?'
      ]
    });
  }
});

module.exports = router;