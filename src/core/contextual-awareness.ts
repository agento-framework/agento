import type { Context } from "../types";

/**
 * Contextual Awareness System for Agents
 * Provides comprehensive environmental, cultural, and situational awareness
 */

export interface LocationInfo {
  geographic: {
    country: string;
    region: string;
    city: string;
    timezone: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    currency: string;
    language: string;
  };
  
  cultural: {
    workingDays: number[];
    workingHours: { start: number; end: number };
    dateFormat: string;
    numberFormat: string;
    holidays: string[];
    businessEtiquette: string[];
    communicationStyle: 'direct' | 'indirect' | 'mixed';
  };
  
  economic: {
    gdpPerCapita: number;
    currencyCode: string;
    exchangeRates?: Record<string, number>;
    economicIndicators: {
      inflationRate: number;
      unemploymentRate: number;
      interestRate: number;
    };
  };
  
  regulatory: {
    dataProtection: string[];
    businessRegulations: string[];
    taxSystem: string;
    complianceRequirements: string[];
  };
}

export interface SecurityContext {
  dataClassification: 'public' | 'internal' | 'confidential' | 'restricted';
  encryptionRequired: boolean;
  auditRequired: boolean;
  retentionPolicy: string;
  accessControls: string[];
  privacyRequirements: string[];
}

export interface CommunicationContext {
  channels: {
    email: boolean;
    chat: boolean;
    video: boolean;
    phone: boolean;
    sms: boolean;
  };
  
  preferences: {
    formality: 'formal' | 'casual' | 'mixed';
    responseTime: 'immediate' | 'within_hour' | 'within_day' | 'flexible';
    language: string;
    accessibility: string[];
  };
  
  collaboration: {
    teamSize: number;
    roles: string[];
    decisionMaking: 'individual' | 'consensus' | 'hierarchical';
    meetingCulture: string;
  };
}

export interface EnvironmentalContext {
  technology: {
    devices: string[];
    platforms: string[];
    connectivity: 'high' | 'medium' | 'low';
    capabilities: string[];
  };
  
  workspace: {
    type: 'office' | 'remote' | 'hybrid' | 'mobile';
    tools: string[];
    restrictions: string[];
    resources: string[];
  };
  
  operational: {
    businessHours: boolean;
    urgency: 'low' | 'medium' | 'high' | 'critical';
    availability: string[];
    constraints: string[];
  };
}

export class ContextualAwarenessManager {
  private defaultLocation: string;
  private securityLevel: string;
  
  constructor(
    defaultLocation: string = 'US',
    securityLevel: string = 'internal'
  ) {
    this.defaultLocation = defaultLocation;
    this.securityLevel = securityLevel;
  }
  
  /**
   * Get comprehensive location and cultural information
   */
  getLocationInfo(location?: string): LocationInfo {
    const loc = location || this.defaultLocation;
    
    // This would typically connect to external APIs for real data
    const locationData: Record<string, LocationInfo> = {
      'US': {
        geographic: {
          country: 'United States',
          region: 'North America',
          city: 'New York', // Default major city
          timezone: 'America/New_York',
          currency: 'USD',
          language: 'English',
        },
        cultural: {
          workingDays: [1, 2, 3, 4, 5], // Monday-Friday
          workingHours: { start: 9, end: 17 },
          dateFormat: 'MM/DD/YYYY',
          numberFormat: '1,234.56',
          holidays: ['New Year\'s Day', 'Independence Day', 'Thanksgiving', 'Christmas'],
          businessEtiquette: ['Punctuality valued', 'Direct communication', 'Firm handshakes'],
          communicationStyle: 'direct',
        },
        economic: {
          gdpPerCapita: 70000,
          currencyCode: 'USD',
          economicIndicators: {
            inflationRate: 3.2,
            unemploymentRate: 3.7,
            interestRate: 5.25,
          },
        },
        regulatory: {
          dataProtection: ['CCPA', 'HIPAA', 'SOX'],
          businessRegulations: ['SEC', 'FTC', 'OSHA'],
          taxSystem: 'Progressive federal + state',
          complianceRequirements: ['AML', 'KYC', 'Data Governance'],
        },
      },
      
      'GH': {
        geographic: {
          country: 'Ghana',
          region: 'West Africa',
          city: 'Accra',
          timezone: 'Africa/Accra',
          currency: 'GHS',
          language: 'English',
        },
        cultural: {
          workingDays: [1, 2, 3, 4, 5],
          workingHours: { start: 8, end: 17 },
          dateFormat: 'DD/MM/YYYY',
          numberFormat: '1,234.56',
          holidays: ['Independence Day', 'Republic Day', 'Farmers Day', 'Christmas'],
          businessEtiquette: ['Respect for elders', 'Relationship building', 'Patience valued'],
          communicationStyle: 'indirect',
        },
        economic: {
          gdpPerCapita: 2400,
          currencyCode: 'GHS',
          economicIndicators: {
            inflationRate: 25.0,
            unemploymentRate: 4.5,
            interestRate: 29.5,
          },
        },
        regulatory: {
          dataProtection: ['Data Protection Act 2012'],
          businessRegulations: ['Companies Act', 'GIPC', 'Bank of Ghana'],
          taxSystem: 'GRA tax system',
          complianceRequirements: ['SSNIT', 'VAT', 'PAYE'],
        },
      },
      
      'UK': {
        geographic: {
          country: 'United Kingdom',
          region: 'Europe',
          city: 'London',
          timezone: 'Europe/London',
          currency: 'GBP',
          language: 'English',
        },
        cultural: {
          workingDays: [1, 2, 3, 4, 5],
          workingHours: { start: 9, end: 17 },
          dateFormat: 'DD/MM/YYYY',
          numberFormat: '1,234.56',
          holidays: ['New Year\'s Day', 'Easter', 'Christmas', 'Boxing Day'],
          businessEtiquette: ['Politeness', 'Queuing culture', 'Understatement'],
          communicationStyle: 'indirect',
        },
        economic: {
          gdpPerCapita: 45000,
          currencyCode: 'GBP',
          economicIndicators: {
            inflationRate: 4.0,
            unemploymentRate: 3.8,
            interestRate: 5.0,
          },
        },
        regulatory: {
          dataProtection: ['UK GDPR', 'DPA 2018'],
          businessRegulations: ['FCA', 'Companies House', 'HMRC'],
          taxSystem: 'PAYE + Corporation Tax',
          complianceRequirements: ['AML', 'FCA Rules', 'IR35'],
        },
      },
    };
    
    return locationData[loc] || locationData['US'];
  }
  
  /**
   * Get security and privacy context
   */
  getSecurityContext(classification?: string): SecurityContext {
    const level = classification || this.securityLevel;
    
    const securityLevels: Record<string, SecurityContext> = {
      'public': {
        dataClassification: 'public',
        encryptionRequired: false,
        auditRequired: false,
        retentionPolicy: '1 year',
        accessControls: ['Basic authentication'],
        privacyRequirements: ['Minimal data collection'],
      },
      
      'internal': {
        dataClassification: 'internal',
        encryptionRequired: true,
        auditRequired: true,
        retentionPolicy: '3 years',
        accessControls: ['Role-based access', 'Multi-factor authentication'],
        privacyRequirements: ['Data minimization', 'Purpose limitation'],
      },
      
      'confidential': {
        dataClassification: 'confidential',
        encryptionRequired: true,
        auditRequired: true,
        retentionPolicy: '7 years',
        accessControls: ['Strict role-based access', 'MFA', 'Approval workflows'],
        privacyRequirements: ['Explicit consent', 'Right to erasure', 'Data portability'],
      },
      
      'restricted': {
        dataClassification: 'restricted',
        encryptionRequired: true,
        auditRequired: true,
        retentionPolicy: 'As per regulation',
        accessControls: ['Need-to-know basis', 'Advanced MFA', 'Continuous monitoring'],
        privacyRequirements: ['Strict consent', 'Regular audits', 'Breach notification'],
      },
    };
    
    return securityLevels[level] || securityLevels['internal'];
  }
  
  /**
   * Get communication and collaboration context
   */
  getCommunicationContext(): CommunicationContext {
    return {
      channels: {
        email: true,
        chat: true,
        video: true,
        phone: true,
        sms: false,
      },
      
      preferences: {
        formality: 'mixed',
        responseTime: 'within_hour',
        language: 'English',
        accessibility: ['Screen reader support', 'Keyboard navigation'],
      },
      
      collaboration: {
        teamSize: 5,
        roles: ['Manager', 'Analyst', 'Specialist', 'Coordinator'],
        decisionMaking: 'consensus',
        meetingCulture: 'Structured with agendas',
      },
    };
  }
  
  /**
   * Get environmental and operational context
   */
  getEnvironmentalContext(): EnvironmentalContext {
    const now = new Date();
    const isBusinessHours = now.getDay() >= 1 && now.getDay() <= 5 && 
                           now.getHours() >= 9 && now.getHours() < 17;
    
    return {
      technology: {
        devices: ['Desktop', 'Mobile', 'Tablet'],
        platforms: ['Web', 'iOS', 'Android'],
        connectivity: 'high',
        capabilities: ['Real-time sync', 'Offline mode', 'Push notifications'],
      },
      
      workspace: {
        type: 'hybrid',
        tools: ['Email', 'Chat', 'Video conferencing', 'Document sharing'],
        restrictions: ['No personal devices', 'VPN required'],
        resources: ['Help desk', 'Training materials', 'Documentation'],
      },
      
      operational: {
        businessHours: isBusinessHours,
        urgency: 'medium',
        availability: ['24/7 for critical issues', 'Business hours for general support'],
        constraints: ['Budget limitations', 'Resource allocation', 'Timeline pressures'],
      },
    };
  }
  
  /**
   * Create comprehensive contextual awareness context for agents
   */
  createContextualAwarenessContext(
    location?: string,
    securityLevel?: string
  ): Context {
    return {
      key: "contextual_awareness",
      description: "Comprehensive environmental, cultural, and situational awareness",
      content: () => {
        const locationInfo = this.getLocationInfo(location);
        const securityContext = this.getSecurityContext(securityLevel);
        const communicationContext = this.getCommunicationContext();
        const environmentalContext = this.getEnvironmentalContext();
        
        return `=== CONTEXTUAL AWARENESS ===

GEOGRAPHIC & CULTURAL CONTEXT:
- Location: ${locationInfo.geographic.city}, ${locationInfo.geographic.country} (${locationInfo.geographic.region})
- Timezone: ${locationInfo.geographic.timezone}
- Language: ${locationInfo.geographic.language}
- Currency: ${locationInfo.geographic.currency} (${locationInfo.economic.currencyCode})
- Communication Style: ${locationInfo.cultural.communicationStyle}
- Working Days: ${locationInfo.cultural.workingDays.map(d => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]).join(', ')}
- Working Hours: ${locationInfo.cultural.workingHours.start}:00 - ${locationInfo.cultural.workingHours.end}:00
- Date Format: ${locationInfo.cultural.dateFormat}
- Business Etiquette: ${locationInfo.cultural.businessEtiquette.join(', ')}

ECONOMIC CONTEXT:
- GDP per Capita: $${locationInfo.economic.gdpPerCapita.toLocaleString()}
- Inflation Rate: ${locationInfo.economic.economicIndicators.inflationRate}%
- Unemployment Rate: ${locationInfo.economic.economicIndicators.unemploymentRate}%
- Interest Rate: ${locationInfo.economic.economicIndicators.interestRate}%

REGULATORY & COMPLIANCE:
- Data Protection: ${locationInfo.regulatory.dataProtection.join(', ')}
- Business Regulations: ${locationInfo.regulatory.businessRegulations.join(', ')}
- Tax System: ${locationInfo.regulatory.taxSystem}
- Compliance Requirements: ${locationInfo.regulatory.complianceRequirements.join(', ')}

SECURITY & PRIVACY:
- Data Classification: ${securityContext.dataClassification.toUpperCase()}
- Encryption Required: ${securityContext.encryptionRequired ? 'Yes' : 'No'}
- Audit Required: ${securityContext.auditRequired ? 'Yes' : 'No'}
- Retention Policy: ${securityContext.retentionPolicy}
- Access Controls: ${securityContext.accessControls.join(', ')}
- Privacy Requirements: ${securityContext.privacyRequirements.join(', ')}

COMMUNICATION & COLLABORATION:
- Available Channels: ${Object.entries(communicationContext.channels)
  .filter(([_, enabled]) => enabled)
  .map(([channel]) => channel)
  .join(', ')}
- Formality Level: ${communicationContext.preferences.formality}
- Expected Response Time: ${communicationContext.preferences.responseTime.replace('_', ' ')}
- Team Size: ${communicationContext.collaboration.teamSize} members
- Decision Making: ${communicationContext.collaboration.decisionMaking}
- Accessibility: ${communicationContext.preferences.accessibility.join(', ')}

OPERATIONAL ENVIRONMENT:
- Workspace Type: ${environmentalContext.workspace.type}
- Business Hours Active: ${environmentalContext.operational.businessHours ? 'Yes' : 'No'}
- Current Urgency Level: ${environmentalContext.operational.urgency}
- Technology Platforms: ${environmentalContext.technology.platforms.join(', ')}
- Connectivity: ${environmentalContext.technology.connectivity}
- Available Tools: ${environmentalContext.workspace.tools.join(', ')}
- Operational Constraints: ${environmentalContext.operational.constraints.join(', ')}

CONTEXTUAL AWARENESS CAPABILITIES:
- I understand cultural norms and business practices for your location
- I'm aware of regulatory requirements and compliance needs
- I consider security and privacy requirements in all interactions
- I adapt communication style to cultural preferences
- I understand operational constraints and business environment
- I'm aware of economic context that may impact decisions
- I consider accessibility and inclusion requirements
- I understand collaboration patterns and team dynamics

Use this contextual information to:
- Provide culturally appropriate responses and recommendations
- Ensure compliance with local regulations and standards
- Adapt communication style to cultural preferences
- Consider economic and business context in advice
- Maintain appropriate security and privacy standards
- Respect operational constraints and business practices
- Support inclusive and accessible interactions`;
      },
      priority: 90, // High priority for contextual awareness
    };
  }
}

// Export singleton instance
export const contextualAwarenessManager = new ContextualAwarenessManager();

// Export utility functions
export function createContextualAwarenessContext(
  location?: string,
  securityLevel?: string
): Context {
  return contextualAwarenessManager.createContextualAwarenessContext(location, securityLevel);
}

export function getLocationInfo(location?: string): LocationInfo {
  return contextualAwarenessManager.getLocationInfo(location);
}

export function getSecurityContext(classification?: string): SecurityContext {
  return contextualAwarenessManager.getSecurityContext(classification);
}

export function getCommunicationContext(): CommunicationContext {
  return contextualAwarenessManager.getCommunicationContext();
}

export function getEnvironmentalContext(): EnvironmentalContext {
  return contextualAwarenessManager.getEnvironmentalContext();
} 