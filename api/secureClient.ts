
import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { LogType, VaultSession, VaultProtocol } from '../types';
import { generateSignature, packMetadata } from '../utils/securityUtils';

export const API_BASE_URL = process.env.VITE_API_BASE || 'https://jstore.2bd.net';

export class SecureApiClient {
  private session: VaultSession | null = null;
  public client: AxiosInstance;
  private addLog: (message: string, type: LogType) => void;

  constructor(logCallback: (message: string, type: LogType) => void) {
    this.addLog = logCallback;
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // acts as the private signedRequest wrapper for all calls
    this.client.interceptors.request.use(this.signRequest.bind(this));
  }

  public isConnected(): boolean {
    return !!this.session;
  }

  public disconnect(): void {
    this.session = null;
    this.addLog('Session terminated locally.', 'warn');
  }

  public getProtocol(): VaultProtocol {
    return this.session?.protocol || 'LEGACY';
  }

  public async handshake(): Promise<boolean> {
    this.addLog('Initializing Vault Protocol handshake...', 'info');
    try {
      // Endpoint sync/authsync used to establish session mapping
      const response = await axios.post(`${API_BASE_URL}/authsync`);
      const { token, signing_key, protocol, map } = response.data;

      if (!token || !signing_key) {
        throw new Error('Invalid handshake response: missing credentials.');
      }

      this.session = {
        token,
        signingKey: signing_key,
        protocol: (protocol as VaultProtocol) || 'LEGACY',
        map: map || {}
      };

      this.addLog(`Secure session active. Mode: ${this.session.protocol}`, 'success');
      return true;
    } catch (error: any) {
      const errorMessage = axios.isAxiosError(error) 
        ? error.response?.data?.detail || error.message 
        : error.message;
      this.addLog(`Handshake failed: ${errorMessage}`, 'error');
      this.session = null;
      return false;
    }
  }

  /**
   * Resolves endpoint path based on protocol mapping.
   */
  public getEndpoint(action: string): string {
    if (this.session?.protocol === 'HARDENED' && this.session.map[action]) {
      return `/${this.session.map[action]}`;
    }
    return `/${action}`;
  }

  /**
   * Packs metadata for the current session.
   */
  public packMeta(metaObj: object): string {
    return packMetadata(metaObj, this.session?.protocol || 'LEGACY');
  }

  /**
   * Private function to sign requests.
   * Handles strict HMAC-SHA256 signature generation and header injection.
   */
  private signRequest(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
    if (config.url?.includes('authsync')) return config;

    if (!this.session) {
      this.addLog('Request blocked: No active Vault session.', 'error');
      throw new axios.Cancel('No active session.');
    }

    // 1. Determine Method
    // In HARDENED mode, force POST for all actions as per protocol specs
    if (this.session.protocol === 'HARDENED') {
      config.method = 'POST';
    }
    const method = config.method?.toUpperCase() || 'POST';
    
    // 2. Resolve Path
    // Axios config.url might be relative or absolute. We need the path component.
    const baseURL = config.baseURL || API_BASE_URL;
    const fullUrl = new URL(config.url || '', baseURL);
    const path = fullUrl.pathname;
    
    // 3. Prepare Security Headers
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = Math.random().toString(36).substring(7);
    
    // 4. Retrieve or Initialize Metadata
    // The X-Meta header should already be packed (Base64) by the caller (useSecureClient)
    // If not present, default to empty string for signature calculation
    const metaString = (config.headers['X-Meta'] as string) || "";
    
    // 5. Generate Signature
    // Signature = HMAC-SHA256(method + path + timestamp + nonce + encodedMetadata)
    const signature = generateSignature(
        method, 
        path, 
        timestamp, 
        nonce, 
        metaString, 
        this.session.signingKey
    );

    this.addLog(`[Vault:${this.session.protocol}] Signing ${method} ${path}`, 'info');

    // 6. Inject Headers
    config.headers['Authorization'] = `Bearer ${this.session.token}`;
    config.headers['X-Timestamp'] = timestamp;
    config.headers['X-Nonce'] = nonce;
    config.headers['X-Signature'] = signature;
    
    // Ensure X-Meta is attached if it exists
    if (metaString) {
      config.headers['X-Meta'] = metaString;
    }
    
    return config;
  }
}
