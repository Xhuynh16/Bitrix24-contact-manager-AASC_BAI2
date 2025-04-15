import {
  generateAuthUrl,
  handleTokenExchange,
  handleInstallEvent as processInstallEvent,
  checkAuthStatus as verifyAuthStatus
} from '../services/bitrix24ApiService.js';

// Cấu hình OAuth từ biến môi trường
const DEFAULT_DOMAIN = process.env.BITRIX24_DOMAIN || 'hoahuynh.bitrix24.vn';

/**
 * Generate authentication URL and handle login
 */
export const loginHandler = (req, res) => {
  try {
    const domain = req.query.domain || DEFAULT_DOMAIN;
    const authUrl = generateAuthUrl(domain);
    
    if (req.query.redirect === 'true') {
      res.redirect(authUrl);
    } else {
      res.json({
        success: true,
        authUrl,
        domain
      });
    }
  } catch (error) {
    console.error('Auth URL generation error:', error);
    res.status(500).json({
      success: false,
      error: 'AUTH_URL_ERROR',
      message: error.message
    });
  }
};

/**
 * Handle OAuth callback from Bitrix24
 */
export const authCallback = async (req, res) => {
  console.log('Auth callback received:', {
    method: req.method,
    query: req.query,
    body: req.body
  });

  try {
    // Check for install event first
    if (req.body.event === 'ONAPPINSTALL' && req.body.auth) {
      await processInstallEvent(req.body.auth);
      return res.json({
        success: true,
        message: 'Installation event processed successfully'
      });
    }

    // Normal OAuth callback processing
    const code = req.query.code || req.body.code;
    const domain = req.query.domain || req.body.domain || DEFAULT_DOMAIN;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_PARAMS',
        message: 'Missing required parameter: code'
      });
    }

    const result = await handleTokenExchange(code, domain);
    
    if (req.query.redirect_uri) {
      return res.redirect(req.query.redirect_uri);
    }
    
    res.json({
      success: true,
      message: 'Authentication successful',
      domain: result.domain
    });
  } catch (error) {
    console.error('Callback error:', error);
    res.status(500).json({
      success: false,
      error: error.code || 'PROCESSING_ERROR',
      message: error.message
    });
  }
};

/**
 * Handle Bitrix24 app installation event
 */
export const installEvent = async (req, res) => {
  console.log('Install event received');

  try {
    const eventData = req.body.event ? req.body : JSON.parse(req.body);

    if (!eventData?.event || eventData.event !== 'ONAPPINSTALL') {
      return res.status(400).json({
        success: false,
        error: 'INVALID_EVENT',
        message: 'Invalid or missing event data'
      });
    }

    await processInstallEvent(eventData.auth);

    res.json({
      success: true,
      message: 'Installation event processed successfully'
    });
  } catch (error) {
    console.error('Install event error:', error);
    res.status(500).json({
      success: false,
      error: 'INSTALL_ERROR',
      message: error.message
    });
  }
};

/**
 * Check authentication status
 */
export const checkAuthStatus = async (req, res) => {
  try {
    const domain = req.query.domain || DEFAULT_DOMAIN;
    const status = await verifyAuthStatus(domain);
    
    res.json({
      success: true,
      ...status
    });
  } catch (error) {
    console.error('Auth status check error:', error);
    res.status(500).json({
      success: false,
      error: 'AUTH_STATUS_ERROR',
      message: error.message
    });
  }
}; 