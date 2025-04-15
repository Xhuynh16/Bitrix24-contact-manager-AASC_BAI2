import { callBitrix24API } from './bitrix24ApiService.js';
import { 
  getCountryId, 
  findSuitablePreset,
  createContactPayload,
  createRequisitePayload,
  createAddressPayload,
  createBankDetailPayload,
  updateBankDetailPayload,
  createContactResponse,
  updateContactResponse,
  deleteContactResponse,
  enhanceContactData
} from '../models/bitrix24Model.js';

/**
 * Create a new contact with all associated data in Bitrix24
 * @param {Object} data - Contact data
 * @param {string} domain - Bitrix24 domain
 * @returns {Promise<Object>} Created contact details
 */
export const createContactService = async (data, domain) => {
  try {
    // Create contact
    const contactData = createContactPayload(data);
    const contactId = await callBitrix24API('crm.contact.add', contactData, domain);

    // Create requisite
    const requisiteData = createRequisitePayload(contactId, data);
    const requisiteId = await callBitrix24API('crm.requisite.add', requisiteData, domain);

    // Create address
    const addressData = createAddressPayload(requisiteId, data);
    const addressId = await callBitrix24API('crm.address.add', addressData, domain);

    // Create bank details
    const bankDetailData = createBankDetailPayload(requisiteId, data);
    const bankDetailId = await callBitrix24API('crm.requisite.bankdetail.add', bankDetailData, domain);

    return createContactResponse(contactId, requisiteId, addressId, bankDetailId);
  } catch (error) {
    console.error('Error in createContactService:', error);
    throw error;
  }
};

/**
 * Update an existing contact with all associated data in Bitrix24
 * @param {string} contactId - ID of the contact to update
 * @param {Object} data - Updated contact data
 * @param {string} domain - Bitrix24 domain
 * @returns {Promise<Object>} Updated contact details
 */
export const updateContactService = async (contactId, data, domain) => {
  try {
    // Verify contact exists
    try {
      await callBitrix24API('crm.contact.get', { id: contactId }, domain);
    } catch (error) {
      throw new Error(`Không tìm thấy liên hệ với ID ${contactId}`);
    }

    // Update contact
    const contactData = {
      id: contactId,
      ...createContactPayload(data)
    };
    await callBitrix24API('crm.contact.update', contactData, domain);

    // Get requisite
    const requisites = await callBitrix24API('crm.requisite.list', {
      filter: { ENTITY_ID: contactId, ENTITY_TYPE_ID: 3 }
    }, domain);
    
    if (!requisites || requisites.length === 0) {
      throw new Error(`Không tìm thấy requisite cho liên hệ ${contactId}. Vui lòng tạo mới liên hệ.`);
    }
    
    const requisiteId = requisites[0].ID;

    // Update address
    const addresses = await callBitrix24API('crm.address.list', {
      filter: { ENTITY_ID: requisiteId, ENTITY_TYPE_ID: 8 }
    }, domain);

    if (!addresses || addresses.length === 0) {
      throw new Error(`Không tìm thấy địa chỉ cho requisite ${requisiteId}. Vui lòng tạo mới liên hệ.`);
    }

    const addressData = createAddressPayload(requisiteId, data);
    await callBitrix24API('crm.address.update', addressData, domain);

    // Update bank details
    const bankDetails = await callBitrix24API('crm.requisite.bankdetail.list', {
      filter: { ENTITY_ID: requisiteId }
    }, domain);

    if (!bankDetails || bankDetails.length === 0) {
      throw new Error(`Không tìm thấy thông tin ngân hàng cho requisite ${requisiteId}. Vui lòng tạo mới liên hệ.`);
    }

    const bankDetailId = bankDetails[0].ID;
    const bankDetailData = updateBankDetailPayload(bankDetailId, requisiteId, data);
    await callBitrix24API('crm.requisite.bankdetail.update', bankDetailData, domain);

    return updateContactResponse(contactId, requisiteId, bankDetailId);
  } catch (error) {
    console.error('Error in updateContactService:', error);
    throw error;
  }
};

/**
 * Delete a contact and all associated data in Bitrix24
 * @param {string} contactId - ID of the contact to delete
 * @param {string} domain - Bitrix24 domain
 * @returns {Promise<Object>} Result of deletion
 */
export const deleteContactService = async (contactId, domain) => {
  try {
    // Verify contact exists
    try {
      await callBitrix24API('crm.contact.get', { id: contactId }, domain);
    } catch (error) {
      throw new Error(`Contact with ID ${contactId} not found`);
    }

    // Get requisites associated with the contact
    const requisites = await callBitrix24API('crm.requisite.list', {
      filter: { ENTITY_ID: contactId, ENTITY_TYPE_ID: 3 }
    }, domain);

    // Delete each requisite and its associated data
    for (const requisite of requisites) {
      const requisiteId = requisite.ID;

      // Delete bank details
      const bankDetails = await callBitrix24API('crm.requisite.bankdetail.list', {
        filter: { ENTITY_ID: requisiteId }
      }, domain);
      for (const bankDetail of bankDetails) {
        await callBitrix24API('crm.requisite.bankdetail.delete', {
          id: bankDetail.ID
        }, domain);
      }

      // Delete addresses
      const addresses = await callBitrix24API('crm.address.list', {
        filter: { ENTITY_ID: requisiteId, ENTITY_TYPE_ID: 8 }
      }, domain);
      for (const address of addresses) {
        await callBitrix24API('crm.address.delete', {
          id: address.ID
        }, domain);
      }

      // Delete the requisite
      await callBitrix24API('crm.requisite.delete', {
        id: requisiteId
      }, domain);
    }

    // Delete the contact
    await callBitrix24API('crm.contact.delete', {
      id: contactId
    }, domain);

    return deleteContactResponse(contactId);
  } catch (error) {
    console.error('Error in deleteContactService:', error);
    
    if (error.message.includes('not found')) {
      throw new Error(`Contact with ID ${contactId} not found`);
    }
    
    throw error;
  }
};

/**
 * Get all contacts from Bitrix24
 * @param {string} domain - Bitrix24 domain
 * @returns {Promise<Array>} List of contacts
 */
export const getContactsService = async (domain) => {
  try {
    // Lấy danh sách contact với các trường cơ bản
    const contacts = await callBitrix24API('crm.contact.list', {
      select: ['*', 'PHONE', 'EMAIL', 'WEB']
    }, domain);

    // Làm giàu dữ liệu contact với thông tin bổ sung
    const enhancedContacts = await Promise.all(contacts.map(async (contact) => {
      try {
        // Lấy requisite cho từng contact
        const requisites = await callBitrix24API('crm.requisite.list', {
          filter: { ENTITY_ID: contact.ID, ENTITY_TYPE_ID: 3 }
        }, domain);
        
        if (!requisites || requisites.length === 0) {
          // Trả về contact không có thông tin bổ sung
          return enhanceContactData(contact, null, null);
        }
        
        const requisiteId = requisites[0].ID;
        
        // Lấy address và bank detail song song
        const [addresses, bankDetails] = await Promise.all([
          callBitrix24API('crm.address.list', {
            filter: { ENTITY_ID: requisiteId, ENTITY_TYPE_ID: 8 }
          }, domain),
          callBitrix24API('crm.requisite.bankdetail.list', {
            filter: { ENTITY_ID: requisiteId }
          }, domain)
        ]);
        
        const address = addresses && addresses.length > 0 ? addresses[0] : null;
        
        // Tạo contact đã được làm giàu với thông tin bổ sung
        const enhancedContact = enhanceContactData(contact, address, bankDetails);
        
        return enhancedContact;
      } catch (error) {
        console.error(`Error enhancing contact ${contact.ID}:`, error);
        // Nếu có lỗi khi làm giàu dữ liệu một contact cụ thể, vẫn trả về contact gốc
        return contact;
      }
    }));

    return enhancedContacts;
  } catch (error) {
    console.error('Error in getContactsService:', error);
    throw error;
  }
}; 