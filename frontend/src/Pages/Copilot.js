// frontend/src/Pages/Copilot.js
import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import "./Copilot.css";

const API_BASE = "https://team-ananta-9hz7.onrender.com/api";

const Copilot = () => {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        '👋 Hi! I\'m your AI log analyst powered by Cerebras LLaMA 4.\n\nAsk me anything about your logs in plain English!\n\n**Try asking:**\n• "Why are payments failing?"\n• "Show errors in Mumbai from last hour"\n• "What\'s breaking right now?"\n• "Are there any new anomalies?"',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load suggestions on mount
  useEffect(() => {
    loadSuggestions();
  }, []);

  const loadSuggestions = async () => {
    try {
      const response = await axios.get(`${API_BASE}/ai/suggestions`);
      if (response.data.success) {
        setSuggestions(response.data.suggestions);
      }
    } catch (error) {
      console.error("Failed to load suggestions:", error);
    }
  };

  const handleSend = async (question = input) => {
    if (!question.trim()) return;

    const userMessage = {
      role: "user",
      content: question,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const startTime = Date.now();

      const response = await axios.post(`${API_BASE}/ai/search`, {
        query: question,
        timeRange: 24,
      });

      const responseTime = Date.now() - startTime;
      const data = response.data;

      if (data.success) {
        let assistantReply = `${data.answer}\n\n`;

        if (data.rootCause) {
          assistantReply += `**🔍 Root Cause:**\n${data.rootCause}\n\n`;
        }

        if (data.impact) {
          assistantReply += `**📊 Impact:**\n${data.impact}\n\n`;
        }

        if (data.suggestedFixes && data.suggestedFixes.length > 0) {
          assistantReply += `**💡 Suggested Fixes:**\n`;
          data.suggestedFixes.forEach((fix, i) => {
            assistantReply += `${i + 1}. ${fix}\n`;
          });
          assistantReply += "\n";
        }

        if (data.timeline) {
          assistantReply += `**⏱️ Timeline:**\n${data.timeline}\n\n`;
        }

        if (data.relevantLogs && data.relevantLogs.length > 0) {
          assistantReply += `📋 *Analyzed ${data.totalLogsAnalyzed} logs, found ${data.relevantLogs.length} relevant*`;
        }

        assistantReply += `\n\n⚡ *Response time: ${responseTime}ms*`;

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: assistantReply,
            timestamp: new Date(),
            logs: data.relevantLogs?.slice(0, 5),
            responseTime,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `❌ ${
              data.error || "Sorry, I encountered an error analyzing your logs."
            }\n\nPlease try rephrasing your question or check if the backend is running.`,
            timestamp: new Date(),
          },
        ]);
      }
    } catch (error) {
      console.error("Chat error:", error);

      let errorMessage = "❌ Failed to connect to AI service.\n\n";

      if (error.response) {
        errorMessage += `Server error: ${error.response.status}\n`;
        errorMessage += error.response.data?.error || "Unknown error";
      } else if (error.request) {
        errorMessage += "Cannot reach backend server.\n";
        errorMessage +=
          "Make sure the backend is running on https://team-ananta-9hz7.onrender.com/";
      } else {
        errorMessage += error.message;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: errorMessage,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatMessage = (content) => {
    // Convert markdown-style bold to HTML
    return content.split("\n").map((line, i) => {
      // Bold text
      line = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      // Italic text
      line = line.replace(/\*(.*?)\*/g, "<em>$1</em>");

      return <div key={i} dangerouslySetInnerHTML={{ __html: line }} />;
    });
  };

  return (
    <div className="copilot-container">
      {/* Header */}
      <div className="copilot-header">
        <div className="header-content">
          <h1 className="copilot-title">
            LLama Chat
            <span className="copilot-badge">Powered by Cerebras</span>
          </h1>
          <p className="copilot-subtitle">
            Ask questions about your logs in plain English • Lightning-fast
            responses
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="messages-container">
        <div className="messages-inner">
          {messages.map((msg, idx) => (
            <div key={idx} className={`message ${msg.role}`}>
              <div className="message-avatar">
                {msg.role === "user" ? "👤" : "😊"}
              </div>

              <div className="message-content">
                <div className="message-text">{formatMessage(msg.content)}</div>

                {/* Show relevant logs if available */}
                {msg.logs && msg.logs.length > 0 && (
                  <div className="relevant-logs">
                    <div className="logs-header">📋 Relevant Logs:</div>
                    {msg.logs.slice(0, 3).map((log, i) => (
                      <div key={i} className="log-item">
                        <div className="log-header">
                          <span
                            className={`log-level ${log.level.toLowerCase()}`}
                          >
                            {log.level}
                          </span>
                          <span className="log-time">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="log-message">{log.message}</div>
                        {log.city && (
                          <div className="log-meta">📍 {log.city}</div>
                        )}
                        {log.endpoint && (
                          <div className="log-meta">🔗 {log.endpoint}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="message-timestamp">
                  {msg.timestamp.toLocaleTimeString()}
                  {msg.responseTime && (
                    <span className="response-time">
                      {" "}
                      • {msg.responseTime}ms
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="message assistant">
              <div className="message-avatar">😊</div>
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <div className="loading-text">Analyzing logs with AI...</div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Quick Suggestions */}
      {messages.length <= 1 && suggestions.length > 0 && (
        <div className="suggestions-section">
          <p className="suggestions-label">💡 Quick questions:</p>
          <div className="suggestions-grid">
            {suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(suggestion)}
                className="suggestion-button"
                disabled={loading}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="input-container">
        <div className="input-wrapper">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about your logs... (e.g., 'Why are payments failing in Mumbai?')"
            className="chat-input"
            disabled={loading}
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="send-button"
          >
            {loading ? "⏳" : "➤"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Copilot;
