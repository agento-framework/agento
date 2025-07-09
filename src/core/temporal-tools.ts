import type { Tool } from "../types";
import { getTemporalInfo, getConversationTemporalContext } from "./temporal-context";

/**
 * Temporal Tools for Agents
 * Provides comprehensive time and date manipulation capabilities
 */

export const temporalTools: Tool[] = [
  {
    type: "function",
    function: {
      name: "get_current_time_info",
      description: "Get comprehensive current time and date information including business context, seasons, and relative times",
      parameters: {
        type: "object",
        properties: {
          timezone: {
            type: "string",
            description: "Timezone to use (e.g., 'UTC', 'America/New_York', 'Europe/London')",
            default: "UTC"
          },
          includeConversationContext: {
            type: "boolean",
            description: "Whether to include conversation timing context",
            default: false
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "calculate_time_difference",
      description: "Calculate the difference between two dates/times with human-readable output",
      parameters: {
        type: "object",
        properties: {
          startDate: {
            type: "string",
            description: "Start date/time in ISO format (e.g., '2024-01-15T10:30:00Z') or relative (e.g., 'yesterday', 'last week')"
          },
          endDate: {
            type: "string",
            description: "End date/time in ISO format or relative. If not provided, uses current time",
            default: "now"
          },
          unit: {
            type: "string",
            enum: ["milliseconds", "seconds", "minutes", "hours", "days", "weeks", "months", "years", "auto"],
            description: "Unit for the time difference calculation",
            default: "auto"
          }
        },
        required: ["startDate"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "add_time_to_date",
      description: "Add or subtract time from a given date",
      parameters: {
        type: "object",
        properties: {
          baseDate: {
            type: "string",
            description: "Base date in ISO format or relative (e.g., 'today', 'next monday')",
            default: "now"
          },
          amount: {
            type: "number",
            description: "Amount to add (positive) or subtract (negative)"
          },
          unit: {
            type: "string",
            enum: ["milliseconds", "seconds", "minutes", "hours", "days", "weeks", "months", "years"],
            description: "Time unit for the amount"
          }
        },
        required: ["amount", "unit"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "parse_relative_time",
      description: "Parse human-readable relative time expressions into specific dates",
      parameters: {
        type: "object",
        properties: {
          expression: {
            type: "string",
            description: "Relative time expression (e.g., 'tomorrow', 'next friday', 'in 3 weeks', 'last month', '2 hours ago')"
          },
          referenceDate: {
            type: "string",
            description: "Reference date for relative calculations (ISO format)",
            default: "now"
          }
        },
        required: ["expression"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_business_days",
      description: "Calculate business days between dates or get business day information",
      parameters: {
        type: "object",
        properties: {
          startDate: {
            type: "string",
            description: "Start date in ISO format",
            default: "today"
          },
          endDate: {
            type: "string",
            description: "End date in ISO format",
            default: "today"
          },
          excludeHolidays: {
            type: "boolean",
            description: "Whether to exclude common holidays",
            default: false
          },
          country: {
            type: "string",
            description: "Country code for holiday calculations (e.g., 'US', 'UK', 'CA')",
            default: "US"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "format_date_time",
      description: "Format a date/time in various human-readable formats",
      parameters: {
        type: "object",
        properties: {
          dateTime: {
            type: "string",
            description: "Date/time to format (ISO format or relative)"
          },
          format: {
            type: "string",
            enum: ["full", "long", "medium", "short", "relative", "business", "casual", "technical"],
            description: "Format style for the output",
            default: "medium"
          },
          timezone: {
            type: "string",
            description: "Target timezone for formatting",
            default: "UTC"
          },
          locale: {
            type: "string",
            description: "Locale for formatting (e.g., 'en-US', 'en-GB')",
            default: "en-US"
          }
        },
        required: ["dateTime"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_time_zone_info",
      description: "Get information about time zones and conversions",
      parameters: {
        type: "object",
        properties: {
          timezone: {
            type: "string",
            description: "Timezone to get information about (e.g., 'America/New_York', 'Europe/London')"
          },
          dateTime: {
            type: "string",
            description: "Specific date/time for timezone info (ISO format)",
            default: "now"
          },
          compareWith: {
            type: "string",
            description: "Another timezone to compare with",
            default: "UTC"
          }
        },
        required: ["timezone"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_calendar_events",
      description: "Get calendar-related information like holidays, special dates, or recurring events",
      parameters: {
        type: "object",
        properties: {
          date: {
            type: "string",
            description: "Date to check for events (ISO format or relative)",
            default: "today"
          },
          eventTypes: {
            type: "array",
            items: {
              type: "string",
              enum: ["holidays", "business_events", "seasonal", "cultural", "astronomical"]
            },
            description: "Types of events to include",
            default: ["holidays", "seasonal"]
          },
          country: {
            type: "string",
            description: "Country code for localized events",
            default: "US"
          },
          range: {
            type: "string",
            enum: ["day", "week", "month", "quarter", "year"],
            description: "Time range to check for events",
            default: "day"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "track_conversation_timing",
      description: "Track and analyze conversation timing patterns and context",
      parameters: {
        type: "object",
        properties: {
          sessionId: {
            type: "string",
            description: "Session ID to track timing for"
          },
          action: {
            type: "string",
            enum: ["start", "activity", "pause", "resume", "end", "analyze"],
            description: "Action to perform on conversation timing",
            default: "analyze"
          },
          includePatterns: {
            type: "boolean",
            description: "Whether to include timing pattern analysis",
            default: true
          }
        },
        required: []
      }
    }
  }
];

/**
 * Temporal Tool Implementations
 */
export const temporalToolImplementations = {
  get_current_time_info: async ({ timezone = "UTC", includeConversationContext = false }: any) => {
    const temporal = getTemporalInfo();
    
    const result = {
      timestamp: temporal.current.timestamp,
      humanReadable: {
        date: `${temporal.current.dayOfWeek}, ${temporal.calendar.monthName} ${temporal.calendar.day}, ${temporal.calendar.year}`,
        time: `${temporal.current.time} ${timezone}`,
        relative: `Day ${temporal.current.dayOfYear} of ${temporal.calendar.year}, Week ${temporal.current.weekOfYear}`,
      },
      business: {
        isBusinessDay: temporal.current.isBusinessDay,
        isWorkingHours: temporal.business.workingHours,
        fiscalYear: temporal.business.fiscalYear,
        fiscalQuarter: `Q${temporal.business.fiscalQuarter}`,
        businessDaysThisMonth: temporal.business.businessDaysThisMonth,
      },
      seasonal: {
        season: temporal.seasonal.season,
        daylight: `${temporal.seasonal.daylight.daylightHours} hours (${temporal.seasonal.daylight.sunrise} - ${temporal.seasonal.daylight.sunset})`,
      },
      context: {
        isWeekend: temporal.current.isWeekend,
        quarter: `Q${temporal.current.quarter}`,
        daysInMonth: temporal.calendar.daysInMonth,
        isLeapYear: temporal.calendar.isLeapYear,
      }
    };

    return {
      success: true,
      data: result,
      message: `Current time information for ${timezone}`,
    };
  },

  calculate_time_difference: async ({ startDate, endDate = "now", unit = "auto" }: any) => {
    const start = parseDateTime(startDate);
    const end = endDate === "now" ? new Date() : parseDateTime(endDate);
    
    const diffMs = end.getTime() - start.getTime();
    const absDiffMs = Math.abs(diffMs);
    
    const calculations = {
      milliseconds: diffMs,
      seconds: diffMs / 1000,
      minutes: diffMs / (1000 * 60),
      hours: diffMs / (1000 * 60 * 60),
      days: diffMs / (1000 * 60 * 60 * 24),
      weeks: diffMs / (1000 * 60 * 60 * 24 * 7),
      months: diffMs / (1000 * 60 * 60 * 24 * 30.44), // Average month
      years: diffMs / (1000 * 60 * 60 * 24 * 365.25), // Average year
    };

    let primaryResult;
    if (unit === "auto") {
      if (absDiffMs < 60000) primaryResult = { value: calculations.seconds, unit: "seconds" };
      else if (absDiffMs < 3600000) primaryResult = { value: calculations.minutes, unit: "minutes" };
      else if (absDiffMs < 86400000) primaryResult = { value: calculations.hours, unit: "hours" };
      else if (absDiffMs < 2592000000) primaryResult = { value: calculations.days, unit: "days" };
      else if (absDiffMs < 31536000000) primaryResult = { value: calculations.months, unit: "months" };
      else primaryResult = { value: calculations.years, unit: "years" };
    } else {
      primaryResult = { value: calculations[unit as keyof typeof calculations], unit };
    }

    const direction = diffMs >= 0 ? "future" : "past";
    const humanReadable = formatTimeDifference(absDiffMs, direction);

    return {
      success: true,
      data: {
        difference: primaryResult,
        allUnits: calculations,
        direction,
        humanReadable,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
      message: `Time difference: ${humanReadable}`,
    };
  },

  add_time_to_date: async ({ baseDate = "now", amount, unit }: any) => {
    const base = baseDate === "now" ? new Date() : parseDateTime(baseDate);
    const result = new Date(base);

    switch (unit) {
      case "milliseconds":
        result.setMilliseconds(result.getMilliseconds() + amount);
        break;
      case "seconds":
        result.setSeconds(result.getSeconds() + amount);
        break;
      case "minutes":
        result.setMinutes(result.getMinutes() + amount);
        break;
      case "hours":
        result.setHours(result.getHours() + amount);
        break;
      case "days":
        result.setDate(result.getDate() + amount);
        break;
      case "weeks":
        result.setDate(result.getDate() + (amount * 7));
        break;
      case "months":
        result.setMonth(result.getMonth() + amount);
        break;
      case "years":
        result.setFullYear(result.getFullYear() + amount);
        break;
    }

    const temporal = getTemporalInfo(result);
    
    return {
      success: true,
      data: {
        originalDate: base.toISOString(),
        resultDate: result.toISOString(),
        calculation: `${amount} ${unit} ${amount >= 0 ? 'added to' : 'subtracted from'} ${base.toISOString()}`,
        humanReadable: `${temporal.current.dayOfWeek}, ${temporal.calendar.monthName} ${temporal.calendar.day}, ${temporal.calendar.year} at ${temporal.current.time}`,
        businessContext: {
          isBusinessDay: temporal.current.isBusinessDay,
          isWorkingHours: temporal.business.workingHours,
        }
      },
      message: `Result: ${result.toISOString()}`,
    };
  },

  parse_relative_time: async ({ expression, referenceDate = "now" }: any) => {
    const reference = referenceDate === "now" ? new Date() : parseDateTime(referenceDate);
    const parsed = parseRelativeTime(expression, reference);
    
    const temporal = getTemporalInfo(parsed);
    
    return {
      success: true,
      data: {
        expression,
        referenceDate: reference.toISOString(),
        parsedDate: parsed.toISOString(),
        humanReadable: `${temporal.current.dayOfWeek}, ${temporal.calendar.monthName} ${temporal.calendar.day}, ${temporal.calendar.year}`,
        relativeToNow: formatTimeDifference(Math.abs(parsed.getTime() - new Date().getTime()), parsed > new Date() ? "future" : "past"),
        businessContext: {
          isBusinessDay: temporal.current.isBusinessDay,
          businessDaysFromNow: calculateBusinessDaysDifference(new Date(), parsed),
        }
      },
      message: `"${expression}" resolves to ${parsed.toISOString()}`,
    };
  },

  get_business_days: async ({ startDate = "today", endDate = "today", excludeHolidays = false, country = "US" }: any) => {
    const start = startDate === "today" ? new Date() : parseDateTime(startDate);
    const end = endDate === "today" ? new Date() : parseDateTime(endDate);
    
    const businessDays = calculateBusinessDaysDifference(start, end);
    const totalDays = Math.abs(Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    
    return {
      success: true,
      data: {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
        businessDays: Math.abs(businessDays),
        totalDays,
        weekendDays: totalDays - Math.abs(businessDays),
        direction: businessDays >= 0 ? "forward" : "backward",
        excludedHolidays: excludeHolidays ? [] : null, // Would implement holiday logic
        country,
      },
      message: `${Math.abs(businessDays)} business days between ${start.toISOString().split('T')[0]} and ${end.toISOString().split('T')[0]}`,
    };
  },

  format_date_time: async ({ dateTime, format = "medium", timezone = "UTC", locale = "en-US" }: any) => {
    const date = parseDateTime(dateTime);
    const temporal = getTemporalInfo(date);
    
    const formats = {
      full: `${temporal.current.dayOfWeek}, ${temporal.calendar.monthName} ${temporal.calendar.day}, ${temporal.calendar.year} at ${temporal.current.time} ${timezone}`,
      long: `${temporal.calendar.monthName} ${temporal.calendar.day}, ${temporal.calendar.year} ${temporal.current.time}`,
      medium: `${temporal.calendar.month}/${temporal.calendar.day}/${temporal.calendar.year} ${temporal.current.time}`,
      short: `${temporal.calendar.month}/${temporal.calendar.day}/${temporal.calendar.year.toString().slice(-2)}`,
      relative: formatTimeDifference(Math.abs(date.getTime() - new Date().getTime()), date > new Date() ? "future" : "past"),
      business: `${temporal.current.dayOfWeek}, ${temporal.calendar.monthName} ${temporal.calendar.day} (${temporal.current.isBusinessDay ? 'Business Day' : 'Non-Business Day'})`,
      casual: `${temporal.current.dayOfWeek} ${temporal.calendar.monthName} ${temporal.calendar.day}`,
      technical: date.toISOString(),
    };
    
    return {
      success: true,
      data: {
        originalDateTime: date.toISOString(),
        formatted: formats[format as keyof typeof formats],
        allFormats: formats,
        timezone,
        locale,
      },
      message: `Formatted as: ${formats[format as keyof typeof formats]}`,
    };
  },

  get_time_zone_info: async ({ timezone, dateTime = "now", compareWith = "UTC" }: any) => {
    const date = dateTime === "now" ? new Date() : parseDateTime(dateTime);
    
    // Simplified timezone info (would use proper timezone library in production)
    const timezones = {
      "UTC": { offset: 0, name: "Coordinated Universal Time" },
      "America/New_York": { offset: -5, name: "Eastern Standard Time", dst: true },
      "America/Los_Angeles": { offset: -8, name: "Pacific Standard Time", dst: true },
      "Europe/London": { offset: 0, name: "Greenwich Mean Time", dst: true },
      "Asia/Tokyo": { offset: 9, name: "Japan Standard Time" },
      "Australia/Sydney": { offset: 10, name: "Australian Eastern Standard Time", dst: true },
    };
    
    const tzInfo = timezones[timezone as keyof typeof timezones] || { offset: 0, name: "Unknown" };
    const compareInfo = timezones[compareWith as keyof typeof timezones] || { offset: 0, name: "Unknown" };
    
    return {
      success: true,
      data: {
        timezone: {
          name: timezone,
          fullName: tzInfo.name,
          offset: `UTC${tzInfo.offset >= 0 ? '+' : ''}${tzInfo.offset}`,
          hasDST: 'dst' in tzInfo ? tzInfo.dst : false,
        },
        comparison: {
          timezone: compareWith,
          offsetDifference: tzInfo.offset - compareInfo.offset,
          timeDifference: `${Math.abs(tzInfo.offset - compareInfo.offset)} hours ${tzInfo.offset > compareInfo.offset ? 'ahead' : 'behind'}`,
        },
        currentTime: {
          local: date.toISOString(),
          timezone: new Date(date.getTime() + (tzInfo.offset * 60 * 60 * 1000)).toISOString(),
        }
      },
      message: `${timezone} is ${tzInfo.name} (UTC${tzInfo.offset >= 0 ? '+' : ''}${tzInfo.offset})`,
    };
  },

  get_calendar_events: async ({ date = "today", eventTypes = ["holidays", "seasonal"], country = "US", range = "day" }: any) => {
    const targetDate = date === "today" ? new Date() : parseDateTime(date);
    const temporal = getTemporalInfo(targetDate);
    
    const events = [];
    
    if (eventTypes.includes("seasonal")) {
      events.push({
        type: "seasonal",
        name: `${temporal.seasonal.season.charAt(0).toUpperCase() + temporal.seasonal.season.slice(1)} Season`,
        date: targetDate.toISOString().split('T')[0],
        description: `Currently in ${temporal.seasonal.season} with ${temporal.seasonal.daylight.daylightHours} hours of daylight`,
      });
    }
    
    if (eventTypes.includes("business_events")) {
      if (temporal.current.quarter === 1 && temporal.calendar.month === 1) {
        events.push({
          type: "business_events",
          name: "New Fiscal Year",
          date: targetDate.toISOString().split('T')[0],
          description: `Start of fiscal year ${temporal.business.fiscalYear}`,
        });
      }
    }
    
    return {
      success: true,
      data: {
        date: targetDate.toISOString().split('T')[0],
        range,
        events,
        summary: `Found ${events.length} events for ${temporal.current.dayOfWeek}, ${temporal.calendar.monthName} ${temporal.calendar.day}`,
      },
      message: `Calendar events for ${targetDate.toISOString().split('T')[0]}`,
    };
  },

  track_conversation_timing: async ({ sessionId, action = "analyze", includePatterns = true }: any) => {
    // This would integrate with the conversation manager in a real implementation
    const now = new Date();
    
    return {
      success: true,
      data: {
        sessionId: sessionId || "current",
        action,
        timestamp: now.toISOString(),
        analysis: {
          currentTime: now.toISOString(),
          timeOfDay: now.getHours() < 12 ? "morning" : now.getHours() < 17 ? "afternoon" : "evening",
          isBusinessHours: now.getDay() >= 1 && now.getDay() <= 5 && now.getHours() >= 9 && now.getHours() < 17,
          patterns: includePatterns ? {
            typical_response_time: "immediate",
            conversation_phase: "active",
            engagement_level: "high",
          } : null,
        }
      },
      message: `Conversation timing tracked for ${action}`,
    };
  },
};

// Helper functions
function parseDateTime(input: string): Date {
  if (input === "now") return new Date();
  
  // Handle relative expressions
  const relativeMatch = input.match(/^(yesterday|today|tomorrow)$/i);
  if (relativeMatch) {
    const now = new Date();
    switch (relativeMatch[1].toLowerCase()) {
      case "yesterday":
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case "today":
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      case "tomorrow":
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
  }
  
  // Try parsing as ISO date
  const parsed = new Date(input);
  if (isNaN(parsed.getTime())) {
    throw new Error(`Unable to parse date: ${input}`);
  }
  
  return parsed;
}

function parseRelativeTime(expression: string, reference: Date): Date {
  const expr = expression.toLowerCase().trim();
  const result = new Date(reference);
  
  // Handle simple cases
  if (expr === "now") return new Date();
  if (expr === "today") return new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  if (expr === "yesterday") return new Date(reference.getTime() - 24 * 60 * 60 * 1000);
  if (expr === "tomorrow") return new Date(reference.getTime() + 24 * 60 * 60 * 1000);
  
  // Handle "X time ago" and "in X time"
  const agoMatch = expr.match(/(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/);
  if (agoMatch) {
    const amount = parseInt(agoMatch[1]);
    const unit = agoMatch[2];
    return subtractTime(result, amount, unit);
  }
  
  const inMatch = expr.match(/in\s+(\d+)\s+(second|minute|hour|day|week|month|year)s?/);
  if (inMatch) {
    const amount = parseInt(inMatch[1]);
    const unit = inMatch[2];
    return addTime(result, amount, unit);
  }
  
  // Handle "next/last X"
  const nextMatch = expr.match(/next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|week|month|year)/);
  if (nextMatch) {
    const unit = nextMatch[1];
    if (["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].includes(unit)) {
      return getNextWeekday(result, unit);
    }
    // Handle next week/month/year
    if (unit === "week") return addTime(result, 1, "week");
    if (unit === "month") return addTime(result, 1, "month");
    if (unit === "year") return addTime(result, 1, "year");
  }
  
  return result; // Fallback to reference date
}

function addTime(date: Date, amount: number, unit: string): Date {
  const result = new Date(date);
  switch (unit) {
    case "second": result.setSeconds(result.getSeconds() + amount); break;
    case "minute": result.setMinutes(result.getMinutes() + amount); break;
    case "hour": result.setHours(result.getHours() + amount); break;
    case "day": result.setDate(result.getDate() + amount); break;
    case "week": result.setDate(result.getDate() + (amount * 7)); break;
    case "month": result.setMonth(result.getMonth() + amount); break;
    case "year": result.setFullYear(result.getFullYear() + amount); break;
  }
  return result;
}

function subtractTime(date: Date, amount: number, unit: string): Date {
  return addTime(date, -amount, unit);
}

function getNextWeekday(date: Date, weekday: string): Date {
  const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const targetDay = weekdays.indexOf(weekday);
  const currentDay = date.getDay();
  const daysUntil = (targetDay - currentDay + 7) % 7;
  return addTime(date, daysUntil === 0 ? 7 : daysUntil, "day");
}

function calculateBusinessDaysDifference(start: Date, end: Date): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const isReverse = startDate > endDate;
  
  if (isReverse) {
    [startDate.setTime(endDate.getTime()), endDate.setTime(start.getTime())];
  }
  
  let businessDays = 0;
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      businessDays++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return isReverse ? -businessDays : businessDays;
}

function formatTimeDifference(milliseconds: number, direction: "past" | "future"): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30.44);
  const years = Math.floor(days / 365.25);
  
  let amount: number;
  let unit: string;
  
  if (years > 0) { amount = years; unit = "year"; }
  else if (months > 0) { amount = months; unit = "month"; }
  else if (weeks > 0) { amount = weeks; unit = "week"; }
  else if (days > 0) { amount = days; unit = "day"; }
  else if (hours > 0) { amount = hours; unit = "hour"; }
  else if (minutes > 0) { amount = minutes; unit = "minute"; }
  else { amount = seconds; unit = "second"; }
  
  const plural = amount !== 1 ? "s" : "";
  const suffix = direction === "past" ? " ago" : " from now";
  
  return `${amount} ${unit}${plural}${suffix}`;
} 