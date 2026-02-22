import { useState } from 'react';
import { useAuth } from './useAuth';

// Typed audit log details - extend as needed for specific actions
export interface AuditLogDetails {
  description?: string;
  previousValue?: unknown;
  newValue?: unknown;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface AuditLogEntry {
  id?: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: AuditLogDetails;
  ip_address?: string;
  user_agent?: string;
  created_at?: string;
}

export const useAuditLog = () => {
  const [isLogging, setIsLogging] = useState(false);
  const { user } = useAuth();

  const logAction = async (
    action: string,
    entityType: string,
    entityId?: string,
    details?: AuditLogDetails
  ) => {
    if (!user) return;

    setIsLogging(true);
    try {
      const logEntry: AuditLogEntry = {
        user_id: user.id,
        action,
        entity_type: entityType,
        entity_id: entityId,
        details,
        ip_address: await getClientIP(),
        user_agent: navigator.userAgent,
      };

      // Store in sessionStorage for now (in production, this would go to a database)
      const existingLogs = JSON.parse(
        sessionStorage.getItem('audit_logs') || '[]'
      );
      existingLogs.push({
        ...logEntry,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
      });

      // Keep only last 100 entries per session
      if (existingLogs.length > 100) {
        existingLogs.splice(0, existingLogs.length - 100);
      }

      sessionStorage.setItem('audit_logs', JSON.stringify(existingLogs));
    } catch (error) {
      console.error('Failed to log audit entry:', error);
    } finally {
      setIsLogging(false);
    }
  };

  const getAuditLogs = (): AuditLogEntry[] => {
    try {
      return JSON.parse(sessionStorage.getItem('audit_logs') || '[]');
    } catch {
      return [];
    }
  };

  return {
    logAction,
    getAuditLogs,
    isLogging,
  };
};

// Helper function to get client IP (simplified for demo)
const getClientIP = async (): Promise<string> => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch {
    return 'unknown';
  }
};
