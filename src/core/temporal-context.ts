import type { Context } from "../types";

/**
 * Temporal Context System for Agents
 * Provides comprehensive time and date awareness capabilities
 */

export interface TemporalInfo {
  // Current time information
  current: {
    timestamp: string;
    date: string;
    time: string;
    timezone: string;
    utcOffset: number;
    dayOfWeek: string;
    dayOfYear: number;
    weekOfYear: number;
    quarter: number;
    isWeekend: boolean;
    isBusinessDay: boolean;
  };
  
  // Relative time awareness
  relative: {
    now: string;
    todayStart: string;
    todayEnd: string;
    yesterdayStart: string;
    tomorrowStart: string;
    weekStart: string;
    weekEnd: string;
    monthStart: string;
    monthEnd: string;
    yearStart: string;
    yearEnd: string;
  };
  
  // Calendar context
  calendar: {
    year: number;
    month: number;
    monthName: string;
    day: number;
    hour: number;
    minute: number;
    second: number;
    millisecond: number;
    isLeapYear: boolean;
    daysInMonth: number;
    daysInYear: number;
  };
  
  // Business context
  business: {
    fiscalYear: number;
    fiscalQuarter: number;
    businessDaysThisMonth: number;
    businessDaysThisYear: number;
    workingHours: boolean;
    timeZoneBusinessHours: string;
  };
  
  // Seasonal and cultural context
  seasonal: {
    season: 'spring' | 'summer' | 'autumn' | 'winter';
    hemisphere: 'northern' | 'southern';
    daylight: {
      sunrise: string;
      sunset: string;
      daylightHours: number;
    };
  };
}

export interface ConversationTemporalContext {
  sessionStart: Date;
  lastActivity: Date;
  messageCount: number;
  conversationDuration: string;
  timeSinceLastMessage: string;
  conversationPhase: 'opening' | 'active' | 'extended' | 'closing';
}

export class TemporalContextManager {
  private timezone: string;
  private locale: string;
  
  constructor(timezone: string = 'UTC', locale: string = 'en-US') {
    this.timezone = timezone;
    this.locale = locale;
  }
  
  /**
   * Get comprehensive temporal information
   */
  getTemporalInfo(date: Date = new Date()): TemporalInfo {
    const now = new Date(date);
    
    // Current time information
    const current = {
      timestamp: now.toISOString(),
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().split(' ')[0],
      timezone: this.timezone,
      utcOffset: now.getTimezoneOffset(),
      dayOfWeek: now.toLocaleDateString(this.locale, { weekday: 'long' }),
      dayOfYear: this.getDayOfYear(now),
      weekOfYear: this.getWeekOfYear(now),
      quarter: Math.ceil((now.getMonth() + 1) / 3),
      isWeekend: now.getDay() === 0 || now.getDay() === 6,
      isBusinessDay: now.getDay() >= 1 && now.getDay() <= 5,
    };
    
    // Relative time awareness
    const relative = {
      now: now.toISOString(),
      todayStart: new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString(),
      todayEnd: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString(),
      yesterdayStart: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString(),
      tomorrowStart: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString(),
      weekStart: this.getWeekStart(now).toISOString(),
      weekEnd: this.getWeekEnd(now).toISOString(),
      monthStart: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
      monthEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString(),
      yearStart: new Date(now.getFullYear(), 0, 1).toISOString(),
      yearEnd: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999).toISOString(),
    };
    
    // Calendar context
    const calendar = {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      monthName: now.toLocaleDateString(this.locale, { month: 'long' }),
      day: now.getDate(),
      hour: now.getHours(),
      minute: now.getMinutes(),
      second: now.getSeconds(),
      millisecond: now.getMilliseconds(),
      isLeapYear: this.isLeapYear(now.getFullYear()),
      daysInMonth: new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(),
      daysInYear: this.isLeapYear(now.getFullYear()) ? 366 : 365,
    };
    
    // Business context
    const business = {
      fiscalYear: this.getFiscalYear(now),
      fiscalQuarter: this.getFiscalQuarter(now),
      businessDaysThisMonth: this.getBusinessDaysInMonth(now),
      businessDaysThisYear: this.getBusinessDaysInYear(now),
      workingHours: this.isWorkingHours(now),
      timeZoneBusinessHours: this.getBusinessHoursDescription(now),
    };
    
    // Seasonal context
    const seasonal = {
      season: this.getSeason(now),
      hemisphere: this.getHemisphere(),
      daylight: this.getDaylightInfo(now),
    };
    
    return {
      current,
      relative,
      calendar,
      business,
      seasonal,
    };
  }
  
  /**
   * Get conversation temporal context
   */
  getConversationContext(
    sessionStart: Date,
    lastActivity: Date,
    messageCount: number
  ): ConversationTemporalContext {
    const now = new Date();
    const conversationDuration = this.formatDuration(now.getTime() - sessionStart.getTime());
    const timeSinceLastMessage = this.formatDuration(now.getTime() - lastActivity.getTime());
    
    let conversationPhase: 'opening' | 'active' | 'extended' | 'closing' = 'opening';
    const durationMinutes = (now.getTime() - sessionStart.getTime()) / (1000 * 60);
    const timeSinceLastMinutes = (now.getTime() - lastActivity.getTime()) / (1000 * 60);
    
    if (durationMinutes < 5) {
      conversationPhase = 'opening';
    } else if (durationMinutes < 30 && timeSinceLastMinutes < 5) {
      conversationPhase = 'active';
    } else if (durationMinutes >= 30) {
      conversationPhase = 'extended';
    } else if (timeSinceLastMinutes >= 5) {
      conversationPhase = 'closing';
    }
    
    return {
      sessionStart,
      lastActivity,
      messageCount,
      conversationDuration,
      timeSinceLastMessage,
      conversationPhase,
    };
  }
  
  /**
   * Create temporal context for agents
   */
  createTemporalContext(
    sessionStart?: Date,
    lastActivity?: Date,
    messageCount?: number
  ): Context {
    return {
      key: "temporal_awareness",
      description: "Comprehensive temporal context and time awareness",
      content: () => {
        const temporal = this.getTemporalInfo();
        const conversationContext = sessionStart && lastActivity && messageCount !== undefined
          ? this.getConversationContext(sessionStart, lastActivity, messageCount)
          : null;
        
        return `=== TEMPORAL AWARENESS CONTEXT ===

CURRENT TIME INFORMATION:
- Current timestamp: ${temporal.current.timestamp}
- Date: ${temporal.current.date} (${temporal.current.dayOfWeek})
 - Time: ${temporal.current.time} ${temporal.current.timezone}
- Day ${temporal.current.dayOfYear} of ${temporal.calendar.year}
- Week ${temporal.current.weekOfYear} of ${temporal.calendar.year}
- Quarter ${temporal.current.quarter} of ${temporal.calendar.year}
- ${temporal.current.isWeekend ? 'Weekend' : 'Weekday'} ${temporal.current.isBusinessDay ? '(Business Day)' : '(Non-Business Day)'}

CALENDAR CONTEXT:
- Year: ${temporal.calendar.year} ${temporal.calendar.isLeapYear ? '(Leap Year)' : ''}
- Month: ${temporal.calendar.monthName} (${temporal.calendar.month}/${temporal.calendar.year})
- Day: ${temporal.calendar.day}
- Time: ${temporal.calendar.hour}:${temporal.calendar.minute.toString().padStart(2, '0')}:${temporal.calendar.second.toString().padStart(2, '0')}
- Days in this month: ${temporal.calendar.daysInMonth}
- Days in this year: ${temporal.calendar.daysInYear}

BUSINESS CONTEXT:
- Fiscal Year: ${temporal.business.fiscalYear}
- Fiscal Quarter: Q${temporal.business.fiscalQuarter}
- Business days this month: ${temporal.business.businessDaysThisMonth}
- Business days this year: ${temporal.business.businessDaysThisYear}
- Currently ${temporal.business.workingHours ? 'within' : 'outside'} working hours
- Business hours: ${temporal.business.timeZoneBusinessHours}

SEASONAL CONTEXT:
- Season: ${temporal.seasonal.season} (${temporal.seasonal.hemisphere} hemisphere)
- Sunrise: ${temporal.seasonal.daylight.sunrise}
- Sunset: ${temporal.seasonal.daylight.sunset}
- Daylight hours: ${temporal.seasonal.daylight.daylightHours}

RELATIVE TIME REFERENCES:
- Today: ${temporal.relative.todayStart.split('T')[0]} (started ${this.formatTimeAgo(new Date(temporal.relative.todayStart))})
- Yesterday: ${temporal.relative.yesterdayStart.split('T')[0]}
- Tomorrow: ${temporal.relative.tomorrowStart.split('T')[0]}
- This week: ${temporal.relative.weekStart.split('T')[0]} to ${temporal.relative.weekEnd.split('T')[0]}
- This month: ${temporal.relative.monthStart.split('T')[0]} to ${temporal.relative.monthEnd.split('T')[0]}
- This year: ${temporal.relative.yearStart.split('T')[0]} to ${temporal.relative.yearEnd.split('T')[0]}

${conversationContext ? `
CONVERSATION CONTEXT:
- Session started: ${conversationContext.sessionStart.toISOString()} (${this.formatTimeAgo(conversationContext.sessionStart)})
- Last activity: ${conversationContext.lastActivity.toISOString()} (${this.formatTimeAgo(conversationContext.lastActivity)})
- Conversation duration: ${conversationContext.conversationDuration}
- Time since last message: ${conversationContext.timeSinceLastMessage}
- Message count: ${conversationContext.messageCount}
- Conversation phase: ${conversationContext.conversationPhase}
` : ''}

TEMPORAL AWARENESS CAPABILITIES:
- I understand past, present, and future time references
- I can track what was said when in our conversation
- I'm aware of business cycles, seasons, and cultural time contexts
- I can calculate time differences, durations, and relative dates
- I understand temporal relationships and can reference them accurately
- I maintain awareness of conversation timing and context

Use this temporal information to:
- Provide time-appropriate responses
- Reference past conversation points with temporal context
- Make time-aware recommendations and suggestions
- Understand urgency and timing in requests
- Maintain temporal consistency in responses`;
      },
      priority: 95, // High priority for temporal awareness
    };
  }
  
  // Helper methods
  private getDayOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }
  
  private getWeekOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + start.getDay() + 1) / 7);
  }
  
  private getWeekStart(date: Date): Date {
    const day = date.getDay();
    const diff = date.getDate() - day;
    return new Date(date.setDate(diff));
  }
  
  private getWeekEnd(date: Date): Date {
    const day = date.getDay();
    const diff = date.getDate() - day + 6;
    return new Date(date.setDate(diff));
  }
  
  private isLeapYear(year: number): boolean {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  }
  
  private getFiscalYear(date: Date): number {
    // Assumes fiscal year starts in October (US government fiscal year)
    return date.getMonth() >= 9 ? date.getFullYear() + 1 : date.getFullYear();
  }
  
  private getFiscalQuarter(date: Date): number {
    const month = date.getMonth();
    if (month >= 9 || month <= 2) return 1; // Oct-Dec
    if (month >= 3 && month <= 5) return 2; // Jan-Mar
    if (month >= 6 && month <= 8) return 3; // Apr-Jun
    return 4; // Jul-Sep
  }
  
  private getBusinessDaysInMonth(date: Date): number {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let businessDays = 0;
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dayOfWeek = new Date(year, month, day).getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        businessDays++;
      }
    }
    
    return businessDays;
  }
  
  private getBusinessDaysInYear(date: Date): number {
    const year = date.getFullYear();
    let businessDays = 0;
    
    for (let month = 0; month < 12; month++) {
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const dayOfWeek = new Date(year, month, day).getDay();
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          businessDays++;
        }
      }
    }
    
    return businessDays;
  }
  
  private isWorkingHours(date: Date): boolean {
    const hour = date.getHours();
    const day = date.getDay();
    return day >= 1 && day <= 5 && hour >= 9 && hour < 17;
  }
  
  private getBusinessHoursDescription(date: Date): string {
    return "9:00 AM - 5:00 PM, Monday through Friday";
  }
  
  private getSeason(date: Date): 'spring' | 'summer' | 'autumn' | 'winter' {
    const month = date.getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'autumn';
    return 'winter';
  }
  
  private getHemisphere(): 'northern' | 'southern' {
    // This could be configurable based on user location
    return 'northern';
  }
  
  private getDaylightInfo(date: Date): { sunrise: string; sunset: string; daylightHours: number } {
    // Simplified daylight calculation (would use actual location-based calculation in production)
    const dayOfYear = this.getDayOfYear(date);
    const sunriseHour = 6 + Math.sin((dayOfYear - 81) * 2 * Math.PI / 365) * 1.5;
    const sunsetHour = 18 - Math.sin((dayOfYear - 81) * 2 * Math.PI / 365) * 1.5;
    
    const sunrise = new Date(date);
    sunrise.setHours(Math.floor(sunriseHour), Math.floor((sunriseHour % 1) * 60), 0, 0);
    
    const sunset = new Date(date);
    sunset.setHours(Math.floor(sunsetHour), Math.floor((sunsetHour % 1) * 60), 0, 0);
    
    return {
      sunrise: sunrise.toTimeString().split(' ')[0],
      sunset: sunset.toTimeString().split(' ')[0],
      daylightHours: Math.round((sunsetHour - sunriseHour) * 10) / 10,
    };
  }
  
  private formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day${days !== 1 ? 's' : ''}, ${hours % 24} hour${hours % 24 !== 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''}, ${minutes % 60} minute${minutes % 60 !== 1 ? 's' : ''}`;
    if (minutes > 0) return `${minutes} minute${minutes !== 1 ? 's' : ''}, ${seconds % 60} second${seconds % 60 !== 1 ? 's' : ''}`;
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  }
  
  private formatTimeAgo(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} minute${Math.floor(diff / 60000) !== 1 ? 's' : ''} ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hour${Math.floor(diff / 3600000) !== 1 ? 's' : ''} ago`;
    if (diff < 2592000000) return `${Math.floor(diff / 86400000)} day${Math.floor(diff / 86400000) !== 1 ? 's' : ''} ago`;
    if (diff < 31536000000) return `${Math.floor(diff / 2592000000)} month${Math.floor(diff / 2592000000) !== 1 ? 's' : ''} ago`;
    return `${Math.floor(diff / 31536000000)} year${Math.floor(diff / 31536000000) !== 1 ? 's' : ''} ago`;
  }
}

// Export singleton instance
export const temporalContextManager = new TemporalContextManager();

// Export utility functions
export function createTemporalContext(
  sessionStart?: Date,
  lastActivity?: Date,
  messageCount?: number
): Context {
  return temporalContextManager.createTemporalContext(sessionStart, lastActivity, messageCount);
}

export function getTemporalInfo(date?: Date): TemporalInfo {
  return temporalContextManager.getTemporalInfo(date);
}

export function getConversationTemporalContext(
  sessionStart: Date,
  lastActivity: Date,
  messageCount: number
): ConversationTemporalContext {
  return temporalContextManager.getConversationContext(sessionStart, lastActivity, messageCount);
} 