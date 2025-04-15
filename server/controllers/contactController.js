import { createContactService, updateContactService, deleteContactService, getContactsService } from '../services/contactService.js';

/**
 * Standard error response handler
 * @param {Error} error - Error object
 * @param {Response} res - Express response object
 */
const handleErrorResponse = (error, res) => {
  console.error(`Error in controller: ${error.message}`);
  
  // Xử lý lỗi xác thực và OAuth
  if (error.code === 'AUTHENTICATION_REQUIRED' || error.code === 'TOKEN_REFRESH_FAILED' || 
      error.status === 401 || error.message.includes('authentication') || error.message.includes('token')) {
    return res.status(401).json({
      success: false,
      error: error.code || 'AUTHENTICATION_ERROR',
      message: 'Authentication required or token invalid',
      details: error.message,
      authUrl: `/api/auth/login?domain=${process.env.BITRIX24_DOMAIN || 'hoahuynh.bitrix24.vn'}`
    });
  }
  
  // Xử lý lỗi quyền truy cập
  if (error.code === 'ACCESS_DENIED' || error.status === 403 || 
      error.message.includes('access denied') || error.message.includes('permission')) {
    return res.status(403).json({
      error: "FORBIDDEN",
      message: "You don't have permission to perform this action"
    });
  }
  
  // Xử lý lỗi không tìm thấy
  if (error.message.includes('not found') || error.status === 404) {
    return res.status(404).json({
      error: "NOT_FOUND",
      message: error.message
    });
  }
  
  // Xử lý lỗi API Bitrix24 cụ thể
  if (error.code && error.code.startsWith('BITRIX_')) {
    return res.status(400).json({
      error: error.code,
      message: error.message
    });
  }
  
  // Xử lý lỗi giới hạn tỷ lệ (rate limiting)
  if (error.status === 429 || error.message.includes('rate limit') || error.message.includes('too many requests')) {
    return res.status(429).json({
      error: "RATE_LIMITED",
      message: "Too many requests. Please try again later.",
      details: error.message
    });
  }
  
  // Default error response
  res.status(error.status || 500).json({
    error: error.code || "INTERNAL_SERVER_ERROR",
    message: error.message || "An unexpected error occurred"
  });
};

/**
 * Create a new contact
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
export const createContactHandler = async (req, res) => {
  try {
    const result = await createContactService(req.body, req.bitrix24.domain);

    res.status(201).json({
      message: 'Contact created successfully with all details',
      data: result
    });
  } catch (error) {
    handleErrorResponse(error, res);
  }
};

/**
 * Update an existing contact
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
export const updateContactHandler = async (req, res) => {
  try {
    const contactId = req.params.id;
    if (!contactId) {
      return res.status(400).json({
        error: 'BAD_REQUEST',
        message: 'Contact ID is required'
      });
    }

    const result = await updateContactService(contactId, req.body, req.bitrix24.domain);

    res.json({
      message: 'Contact updated successfully',
      data: result
    });
  } catch (error) {
    handleErrorResponse(error, res);
  }
};

/**
 * Delete a contact
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
export const deleteContact = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        error: "BAD_REQUEST",
        message: "Contact ID is required"
      });
    }

    const result = await deleteContactService(id, req.bitrix24.domain);

    res.json({
      success: true,
      message: "Contact deleted successfully",
      data: {
        contactId: id
      }
    });
  } catch (error) {
    handleErrorResponse(error, res);
  }
};

/**
 * Get all contacts
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
export const getContactsHandler = async (req, res) => {
  try {
    const contacts = await getContactsService(req.bitrix24.domain);
    
    // Kiểm tra và đảm bảo cấu trúc dữ liệu đầy đủ cho mọi contact
    const processedContacts = contacts.map(contact => {
      // Đảm bảo contact có đầy đủ các trường cần thiết
      if (!contact.ADDRESS && contact.address) {
        // Nếu không có ADDRESS nhưng có address, tạo đối tượng ADDRESS từ các trường riêng lẻ
        contact.ADDRESS = {
          ADDRESS_1: contact.address,
          CITY: contact.city,
          PROVINCE: contact.region,
          COUNTRY: 'VN'
        };
      }
      
      return contact;
    });
    
    res.json({
      success: true,
      message: 'Contacts retrieved successfully',
      data: processedContacts
    });
  } catch (error) {
    handleErrorResponse(error, res);
  }
};