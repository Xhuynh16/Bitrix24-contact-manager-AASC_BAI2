import { callBitrix24API as callOAuth } from '../services/bitrix24OauthService.js';

/**
 * Call Bitrix24 API with the given method and data
 * @param {string} method - API method to call
 * @param {Object} data - Data to send with the request
 * @param {string} domain - Bitrix24 domain
 * @returns {Promise<any>} API response
 */
export const callBitrix24API = async (method, data, domain) => {
  if (!method) {
    throw new Error('Method is required');
  }
  
  try {
    return await callOAuth(method, data, domain);
  } catch (error) {
    console.error(`Error calling Bitrix24 API (${method}):`, error);
    
    // Tạo lỗi với thông tin chi tiết hơn cho xử lý ở controller
    const enhancedError = new Error(error.message);
    enhancedError.originalError = error;
    enhancedError.status = error.status || 500;
    enhancedError.code = error.code || 'API_ERROR';
    enhancedError.method = method;
    throw enhancedError;
  }
};

/**
 * Get country ID for the given country name
 * @param {string} countryName - Name of the country
 * @returns {Promise<string>} Country ID
 */
export const getCountryId = async (countryName) => {
  try {
    const countries = await callBitrix24API('crm.requisite.preset.countries', {}, 'crm');
    
    if (typeof countries !== 'object' || countries === null) {
      throw new Error('Invalid response format from countries API');
    }

    let countryId = null;
    for (const [id, value] of Object.entries(countries)) {
      if (typeof value === 'string' && value.toLowerCase().includes('vietnam')) {
        countryId = id;
        break;
      }
    }

    if (!countryId) {
      console.log('Vietnam not found in countries list, using default ID');
      countryId = "VN"; 
    }

    return countryId;
  } catch (error) {
    console.error('Error getting country ID:', error);
    return "VN"; // Default fallback
  }
};

/**
 * Find suitable preset for requisites
 * @returns {Promise<number>} Preset ID
 */
export const findSuitablePreset = async () => {
  try {
    const presets = await callBitrix24API('crm.requisite.preset.list', {}, 'crm');
    
    for (const preset of presets) {
      const presetFields = await callBitrix24API('crm.requisite.preset.fields', {
        id: preset.ID
      }, 'crm');
      
      if (presetFields.RQ_BANK_NAME && presetFields.RQ_BANK_ACCOUNT) {
        return preset.ID;
      }
    }

    return 1; // Default preset
  } catch (error) {
    console.error('Error finding suitable preset:', error);
    return 1; // Default fallback
  }
};

/**
 * Cấu trúc dữ liệu cho Contact API
 * @param {Object} data - Dữ liệu contact từ request
 * @returns {Object} - Payload cho Bitrix24 API
 */
export const createContactPayload = (data) => {
  const payload = {
    fields: {
      NAME: data.name,
      LAST_NAME: data.lastName,
      PHONE: [{ VALUE: data.phone, VALUE_TYPE: "WORK" }],
      EMAIL: [{ VALUE: data.email, VALUE_TYPE: "WORK" }]
    },
    params: { REGISTER_SONET_EVENT: "Y" }
  };
  
  // Thêm website nếu có
  if (data.website) {
    payload.fields.WEB = [{ VALUE: data.website, VALUE_TYPE: "WORK" }];
  }
  
  return payload;
};

/**
 * Cấu trúc dữ liệu cho Requisite API
 * @param {string} contactId - ID của contact
 * @param {Object} data - Dữ liệu contact từ request
 * @returns {Object} - Payload cho Bitrix24 API
 */
export const createRequisitePayload = (contactId, data) => {
  return {
    fields: {
      ENTITY_TYPE_ID: 3, 
      ENTITY_ID: contactId,
      PRESET_ID: 1,
      NAME: `${data.name} ${data.lastName} - Business Info`,
      COUNTRY: 'VN'
    }
  };
};

/**
 * Cấu trúc dữ liệu cho Address API
 * @param {string} requisiteId - ID của requisite
 * @param {Object} data - Dữ liệu address từ request
 * @returns {Object} - Payload cho Bitrix24 API
 */
export const createAddressPayload = (requisiteId, data) => {
  return {
    fields: {
      TYPE_ID: 1, 
      ENTITY_TYPE_ID: 8, 
      ENTITY_ID: requisiteId,
      COUNTRY: 'VN',
      PROVINCE: data.region,
      CITY: data.city,
      ADDRESS_1: data.address
    }
  };
};

/**
 * Cấu trúc dữ liệu cho Bank Detail API
 * @param {string} requisiteId - ID của requisite
 * @param {Object} data - Dữ liệu bank detail từ request
 * @returns {Object} - Payload cho Bitrix24 API
 */
export const createBankDetailPayload = (requisiteId, data) => {
  return {
    fields: {
      ENTITY_TYPE_ID: 8, 
      ENTITY_ID: requisiteId,
      COUNTRY: 'VN',
      NAME: `${data.bankName} - Primary Account`,
      RQ_BANK_NAME: data.bankName,
      RQ_ACC_NAME: data.name + ' ' + data.lastName,
      RQ_ACC_NUM: data.bankAccount
    }
  };
};

/**
 * Cấu trúc dữ liệu cho Update Bank Detail API
 * @param {string} bankDetailId - ID của bank detail
 * @param {string} requisiteId - ID của requisite
 * @param {Object} data - Dữ liệu bank detail từ request 
 * @returns {Object} - Payload cho Bitrix24 API
 */
export const updateBankDetailPayload = (bankDetailId, requisiteId, data) => {
  return {
    id: bankDetailId,
    fields: {
      ENTITY_ID: requisiteId,
      NAME: `${data.bankName} - Primary Account`,
      RQ_BANK_NAME: data.bankName,
      RQ_ACC_NAME: data.name + ' ' + data.lastName,
      RQ_ACC_NUM: data.bankAccount
    }
  };
};

/**
 * Cấu trúc dữ liệu đầu ra sau khi tạo contact
 * @param {string} contactId - ID của contact
 * @param {string} requisiteId - ID của requisite
 * @param {string} addressId - ID của address
 * @param {string} bankDetailId - ID của bank detail
 * @returns {Object} - Cấu trúc dữ liệu trả về
 */
export const createContactResponse = (contactId, requisiteId, addressId, bankDetailId) => {
  return {
    success: true,
    message: 'Tạo liên hệ thành công',
    data: {
      contactId,
      requisiteId,
      addressId,
      bankDetailId
    }
  };
};

/**
 * Cấu trúc dữ liệu đầu ra sau khi cập nhật contact
 * @param {string} contactId - ID của contact
 * @param {string} requisiteId - ID của requisite
 * @param {string} bankDetailId - ID của bank detail
 * @returns {Object} - Cấu trúc dữ liệu trả về
 */
export const updateContactResponse = (contactId, requisiteId, bankDetailId) => {
  return {
    success: true,
    message: 'Cập nhật liên hệ thành công',
    data: {
      contactId,
      requisiteId,
      bankDetailId
    }
  };
};

/**
 * Cấu trúc dữ liệu đầu ra sau khi xóa contact
 * @param {string} contactId - ID của contact
 * @returns {Object} - Cấu trúc dữ liệu trả về
 */
export const deleteContactResponse = (contactId) => {
  return {
    success: true,
    message: 'Contact deleted successfully',
    data: {
      contactId
    }
  };
};

/**
 * Cấu trúc dữ liệu cho danh sách liên hệ
 * @param {Object} contact - Dữ liệu contact từ API
 * @param {Object|null} address - Dữ liệu address từ API
 * @param {Array|null} bankDetails - Dữ liệu bank details từ API
 * @returns {Object} - Cấu trúc contact đã làm giàu
 */
export const enhanceContactData = (contact, address, bankDetails) => {
  return {
    ...contact,
    // Giữ lại các thuộc tính trường dạng rút gọn theo yêu cầu
    address: address ? address.ADDRESS_1 : null,
    city: address ? address.CITY : null,
    region: address ? address.PROVINCE : null,
    
    // Dữ liệu đầy đủ cho ADDRESS như định dạng ban đầu để tương thích
    ADDRESS: address || null,
    
    // Thông tin ngân hàng
    bankDetails: bankDetails || [],
    BANK_NAME: bankDetails && bankDetails.length > 0 ? bankDetails[0].RQ_BANK_NAME : null,
    BANK_ACCOUNT: bankDetails && bankDetails.length > 0 ? bankDetails[0].RQ_ACC_NUM : null
  };
};