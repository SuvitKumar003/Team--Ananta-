// routes/copilot.js
const express = require('express');
const router = express.Router();
const CerebrasLog = require('../models/CerebrasLog');
const axios = require('axios');

// Config
const CEREBRAS_API_KEY = process.env.CEREBRAS_API_KEY;
const CEREBRAS_API_URL = 'https://api.cerebras.ai/v1/chat/completions';
const AI_MODEL = 'llama-4-scout-17b-16e-instruct';

router.get('/copilot', async (req, res) => {
  try {
    if (!CEREBRAS_API_KEY) {
      return res.status(500).json({ error: 'CEREBRAS_API_KEY is missing' });
    }

    const { limit = 20, severity } = req.query;
    const query = {};
    if (severity) query.severity = severity;

    // Fetch analyzed logs
    const logs = await CerebrasLog.find(query)
      .sort({ timestamp: -1 })
      .limit(Number(limit))
      .lean();

    if (!logs.length) {
      return res.json({ message: 'No analyzed logs available yet' });
    }

    // Prepare logs for AI
    const logSummary = logs.map(l => ({
      timestamp: l.timestamp,
      level: l.level,
      message: l.message,
      endpoint: l.endpoint,
      category: l.category,
      rootCause: l.rootCause,
      aiExplanation: l.aiExplanation
    }));

    // Prompt
    const prompt = `You are an AI DevOps Copilot. The user wants to quickly understand the recent system state.
Here are the latest logs:
${JSON.stringify(logSummary, null, 2)}

Please return:
1. A short natural-language summary of what happened (like you’re explaining to a human teammate).
2. Key problems spotted.
3. Suggested next steps in plain English.`;

    // Call Cerebras API
    const response = await axios.post(
      CEREBRAS_API_URL,
      {
        model: AI_MODEL,
        messages: [
          { role: 'system', content: 'You are a helpful DevOps assistant. Be clear and concise.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.5,
        max_tokens: 1200
      },
      {
        headers: {
          Authorization: `Bearer ${CEREBRAS_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    );

    // Extract AI response safely
    const aiResponse =
      response.data?.choices?.[0]?.message?.content ||
      response.data?.choices?.[0]?.text ||
      'No AI response';

    res.json({
      success: true,
      copilotSummary: aiResponse,
      analyzedLogs: logSummary
    });
  } catch (err) {
    console.error('❌ Copilot error:', err?.response?.data || err.message);
    res.status(500).json({
      success: false,
      error: err?.response?.data || err.message
    });
  }
});

module.exports = router;