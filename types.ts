
export type LogType = 'info' | 'success' | 'error' | 'warn';
export type VaultProtocol = 'HARDENED' | 'LEGACY';

export interface LogEntry {
  timestamp: Date;
  message: string;
  type: LogType;
}

export interface VaultSession {
  token: string;
  signingKey: string;
  protocol: VaultProtocol;
  map: Record<string, string>;
}

export interface FileInfo {
  filename: string;
  size: number;
  requires_password: boolean;
  expiry_time: string;
  type?: string;
}

export interface ForensicReport {
  is_ai: boolean;
  provider?: string;
  confidence?: number;
  details?: string[];
  status?: string;
  verdict?: 'clean' | 'malicious' | 'suspicious' | 'unknown';
  mime_type?: string;
  size?: number;
  hash_md5?: string;
  hash_sha256?: string;
  analysis_timestamp?: string;
}

export interface StoredFile {
  code: string;
  filename: string;
  size: number;
  date: Date;
  type?: string;
  forensicReport?: ForensicReport;
}
