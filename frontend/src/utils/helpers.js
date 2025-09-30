// Group logs by hour for timeline chart
export const processTimeSeriesData = (logs, hours = 12) => {
  const now = new Date();
  const timeSlots = [];

  // Create hourly time slots
  for (let i = hours - 1; i >= 0; i--) {
    const slotTime = new Date(now.getTime() - (i * 60 * 60 * 1000));
    timeSlots.push({
      hour: slotTime.getHours(),
      label: slotTime.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        hour12: true 
      }),
      timestamp: slotTime.getTime(),
      INFO: 0,
      WARN: 0,
      ERROR: 0,
      CRITICAL: 0,
      total: 0
    });
  }

  // Group logs into time slots
  logs.forEach(log => {
    const logTime = new Date(log.timestamp).getTime();
    
    // Find the appropriate time slot
    const slot = timeSlots.find((slot, index) => {
      const nextSlot = timeSlots[index + 1];
      return logTime >= slot.timestamp && 
             (!nextSlot || logTime < nextSlot.timestamp);
    });

    if (slot) {
      slot[log.level] = (slot[log.level] || 0) + 1;
      slot.total++;
    }
  });

  return timeSlots;
};

// Format large numbers with K, M suffixes
export const formatNumber = (num) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

// Calculate percentage
export const calculatePercentage = (value, total) => {
  if (total === 0) return '0.0';
  return ((value / total) * 100).toFixed(1);
};