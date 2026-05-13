import { supabase } from '../lib/supabaseClient';

type LogLevel = 'info' | 'warn' | 'error' | 'trace';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  traceId?: string;
  data?: any;
}

class Logger {
  private static instance: Logger;
  private currentTraceId: string | null = null;

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Start a new trace block
   */
  startTrace(): string {
    this.currentTraceId = crypto.randomUUID().split('-')[0].toUpperCase();
    return this.currentTraceId;
  }

  endTrace() {
    this.currentTraceId = null;
  }

  private log(level: LogLevel, message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      traceId: this.currentTraceId || undefined,
      data
    };

    const colorMap = {
      info: 'color: #3b82f6',
      warn: 'color: #f59e0b',
      error: 'color: #ef4444; font-weight: bold',
      trace: 'color: #8b5cf6; font-style: italic'
    };

    const prefix = entry.traceId ? `[TRACE-${entry.traceId}]` : '[SYSTEM]';
    
    console.log(
      `%c${prefix} %c${entry.level.toUpperCase()} %c${entry.message}`,
      'color: #94a3b8',
      colorMap[level],
      'color: inherit',
      data || ''
    );

    // Sync to cloud for critical levels
    if (level === 'error' || level === 'warn') {
      this.syncToCloud(level, message, data);
    }
  }

  private serializeData(data: any): any {
    if (!data) return null;
    if (data instanceof Error) {
      return { name: data.name, message: data.message, stack: data.stack };
    }
    try {
      return JSON.parse(JSON.stringify(data));
    } catch {
      return { _unserializable: String(data) };
    }
  }

  private async syncToCloud(level: LogLevel, message: string, data?: any) {
    try {
      await supabase.from('trace_logs').insert({
        trace_id: this.currentTraceId || 'SYSTEM',
        level,
        message,
        data: this.serializeData(data),
      });
    } catch (err) {
      // Fail silently to avoid infinite logging loops
      console.warn('[LOGGER] Failed to sync to cloud', err);
    }
  }

  info(message: string, data?: any) { this.log('info', message, data); }
  warn(message: string, data?: any) { this.log('warn', message, data); }
  error(message: string, data?: any) { this.log('error', message, data); }
  trace(message: string, data?: any) { this.log('trace', message, data); }
}

export const logger = Logger.getInstance();
