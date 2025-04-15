import { getTokens, isTokenExpired, refreshTokens } from '../services/bitrix24ApiService.js';

/**
 * Middleware kiểm tra xác thực OAuth Bitrix24
 * @param {Object} options - Tùy chọn
 * @param {boolean} options.requireAuth - Có yêu cầu xác thực hay không (mặc định: true)
 * @returns {Function} Express middleware
 */
const checkAuth = (options = {}) => {
  const { requireAuth = true } = options;
  
  return async (req, res, next) => {
    try {
      // Lấy domain từ request hoặc sử dụng giá trị mặc định
      const domain = process.env.BITRIX24_DOMAIN || 'hoahuynh.bitrix24.vn';
      
      // Kiểm tra tokens
      const tokens = await getTokens(domain);
      
      if (!tokens && requireAuth) {
        return res.status(401).json({
          success: false,
          error: 'AUTHENTICATION_REQUIRED',
          message: 'Bitrix24 authentication is required'
        });
      }
      
      // Nếu không yêu cầu xác thực hoặc không có tokens, tiếp tục
      if (!requireAuth || !tokens) {
        return next();
      }
      
      // Kiểm tra token hết hạn
      const expired = await isTokenExpired(domain);
      if (expired) {
        try {
          // Thử làm mới token
          await refreshTokens(domain);
        } catch (refreshError) {
          // Nếu không thể làm mới token, yêu cầu xác thực lại
          return res.status(401).json({
            success: false,
            error: 'TOKEN_REFRESH_FAILED',
            message: 'Authentication session has expired'
          });
        }
      }
      
      // Đặt domain vào req để sử dụng trong các handler
      req.bitrix24 = {
        domain
      };
      
      next();
    } catch (error) {
      console.error('Auth check error:', error);
      res.status(500).json({
        success: false,
        error: 'AUTH_CHECK_ERROR',
        message: 'Error checking authentication',
        details: error.message
      });
    }
  };
};

export default checkAuth; 