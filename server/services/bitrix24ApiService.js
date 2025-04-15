import axios from 'axios';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';

// Cấu hình
const STORAGE_DIR = path.join(process.cwd(), 'server/storage');
const TOKENS_FILE = path.join(STORAGE_DIR, 'tokens.json');
const CLIENT_ID = process.env.BITRIX24_CLIENT_ID;
const CLIENT_SECRET = process.env.BITRIX24_CLIENT_SECRET;
const REDIRECT_URI = process.env.BITRIX24_REDIRECT_URI;
const DEFAULT_DOMAIN = process.env.BITRIX24_DOMAIN;
const TOKEN_URL = 'https://oauth.bitrix.info/oauth/token/';
const DEFAULT_EXPIRY = 3600; // 1 hour in seconds

/**
 * Ensure storage directory exists
 */
const ensureStorageDir = () => {
  if (!fsSync.existsSync(STORAGE_DIR)) {
    fsSync.mkdirSync(STORAGE_DIR, { recursive: true });
  }
};

/**
 * Read tokens from file
 */
const readTokens = async () => {
  try {
    ensureStorageDir();
    if (!fsSync.existsSync(TOKENS_FILE)) {
      await fs.writeFile(TOKENS_FILE, '{}');
      return {};
    }
    const data = await fs.readFile(TOKENS_FILE, 'utf8');
    return JSON.parse(data || '{}');
  } catch (error) {
    console.error('Error reading tokens file:', error);
    return {};
  }
};

/**
 * Write tokens to file
 */
const writeTokens = async (data) => {
  try {
    ensureStorageDir();
    await fs.writeFile(TOKENS_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing tokens file:', error);
    throw new Error('Failed to save tokens');
  }
};

/**
 * Save tokens for a domain
 */
export const saveTokens = async (domain, tokenData) => {
  if (!domain || !tokenData) {
    throw new Error('Domain and token data are required');
  }

  const tokens = await readTokens();
  tokens[domain] = {
    ...tokenData,
    savedAt: Date.now()
  };
  await writeTokens(tokens);
  return tokens[domain];
};

/**
 * Get tokens for a domain
 */
export const getTokens = async (domain = DEFAULT_DOMAIN) => {
  if (!domain) {
    throw new Error('Domain is required');
  }

  const tokens = await readTokens();
  return tokens[domain] || null;
};

/**
 * Check if token is expired
 */
export const isTokenExpired = async (domain = DEFAULT_DOMAIN) => {
  try {
    const tokens = await getTokens(domain);
    if (!tokens || !tokens.savedAt || !tokens.expires_in) {
      return true;
    }

    const expiryTime = tokens.savedAt + (tokens.expires_in * 1000);
    // Consider token expired 5 minutes before actual expiry
    return Date.now() > (expiryTime - 5 * 60 * 1000);
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return true;
  }
};

/**
 * Refresh tokens for a domain
 */
export const refreshTokens = async (domain = DEFAULT_DOMAIN) => {
  const tokens = await getTokens(domain);
  if (!tokens || !tokens.refresh_token) {
    throw new Error('No refresh token available for domain: ' + domain);
  }

  try {
    const response = await axios.post(TOKEN_URL, null, {
      params: {
        grant_type: 'refresh_token',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: tokens.refresh_token
      }
    });

    const newTokens = {
      ...response.data,
      domain,
      savedAt: Date.now()
    };

    await saveTokens(domain, newTokens);
    return newTokens;
  } catch (error) {
    console.error('Error refreshing tokens:', error.response?.data || error.message);
    throw new Error('Failed to refresh tokens for domain: ' + domain);
  }
};

/**
 * Call Bitrix24 API with OAuth
 */
export const callBitrix24API = async (method, params = {}, domain = DEFAULT_DOMAIN) => {
  if (!method) {
    throw new Error('Method is required');
  }

  let tokens = await getTokens(domain);
  if (!tokens) {
    throw new Error(`No tokens found for domain: ${domain}`);
  }

  if (await isTokenExpired(domain)) {
    tokens = await refreshTokens(domain);
  }

  const endpoint = tokens.client_endpoint || `https://${domain}/rest/`;

  try {
    const response = await axios({
      method: 'POST',
      url: `${endpoint}${method}.json`,
      data: params,
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data.result;
  } catch (error) {
    if (error.response?.status === 401) {
      tokens = await refreshTokens(domain);
      return callBitrix24API(method, params, domain);
    }
    throw error;
  }
};

/**
 * Generate Bitrix24 OAuth URL
 */
export const generateAuthUrl = (domain = DEFAULT_DOMAIN) => {
  if (!CLIENT_ID || !REDIRECT_URI) {
    throw new Error('Missing required configuration: CLIENT_ID or REDIRECT_URI');
  }
  
  return `https://${domain}/oauth/authorize/` +
    `?client_id=${CLIENT_ID}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
};

/**
 * Handle token exchange after OAuth callback
 */
export const handleTokenExchange = async (code, domain = DEFAULT_DOMAIN) => {
  if (!code || !domain) {
    throw new Error('Code and domain are required');
  }

  const response = await axios.post(TOKEN_URL, null, {
    params: {
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri: REDIRECT_URI
    }
  });

  const tokens = response.data;
  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error('Invalid token response from Bitrix24');
  }

  return await saveTokens(domain, {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    domain: domain,
    expires_in: tokens.expires_in || DEFAULT_EXPIRY,
    member_id: tokens.member_id,
    client_endpoint: tokens.client_endpoint || `https://${domain}/rest/`
  });
};

/**
 * Handle installation event
 */
export const handleInstallEvent = async (auth) => {
  if (!auth || !auth.domain) {
    throw new Error('Invalid installation data');
  }

  return await saveTokens(auth.domain, {
    access_token: auth.access_token,
    refresh_token: auth.refresh_token,
    domain: auth.domain,
    expires_in: auth.expires_in || (auth.expires ? Math.floor((auth.expires - Date.now()/1000)) : DEFAULT_EXPIRY),
    member_id: auth.member_id,
    client_endpoint: auth.client_endpoint || `https://${auth.domain}/rest/`,
    application_token: auth.application_token,
    status: auth.status,
    scope: auth.scope
  });
};

/**
 * Check authentication status
 */
export const checkAuthStatus = async (domain = DEFAULT_DOMAIN) => {
  const tokens = await getTokens(domain);
  const isExpired = await isTokenExpired(domain);

  return {
    authenticated: !!tokens && !isExpired,
    domain,
    expires: tokens ? tokens.savedAt + (tokens.expires_in * 1000) : null
  };
}; 