import fetch from 'node-fetch';
import { BITRIX24_WEBHOOK } from '../config.js';
import axios from 'axios';

const BITRIX_API_ENDPOINT = BITRIX24_WEBHOOK;

const callBitrix24API = async (method, data) => {
  const url = `${BITRIX24_WEBHOOK}${method}.json`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await response.json();
    
    if (result.error) {
      console.error(`Bitrix24 API Error (${method}):`, result.error);
      throw new Error(result.error_description || result.error);
    }
    
    return result.result;
  } catch (error) {
    console.error(`Error calling Bitrix24 API (${method}):`, error);
    throw error;
  }
};


const getCountryId = async (countryName) => {
  try {
    console.log('Fetching countries from Bitrix24...');
    const countries = await callBitrix24API('crm.requisite.preset.countries', {});
    console.log('Countries response:', JSON.stringify(countries, null, 2));

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
    console.log('Using default country ID');
    return "VN"; 
  }
};


const findSuitablePreset = async () => {
  try {
    console.log('Fetching requisite presets...');
    const presets = await callBitrix24API('crm.requisite.preset.list', {});
    console.log('Available presets:', JSON.stringify(presets, null, 2));

    for (const preset of presets) {
      const presetFields = await callBitrix24API('crm.requisite.preset.fields', {
        id: preset.ID
      });
      console.log(`Checking preset ${preset.ID} fields:`, JSON.stringify(presetFields, null, 2));

      if (presetFields.RQ_BANK_NAME && presetFields.RQ_BANK_ACCOUNT) {
        console.log(`Found suitable preset: ${preset.ID}`);
        return preset.ID;
      }
    }

    console.warn('No suitable preset found, using default preset 1');
    return 1;
  } catch (error) {
    console.error('Error finding suitable preset:', error);
    console.warn('Falling back to default preset 1');
    return 1;
  }
};

export const createFullContact = async (data) => {
  try {
    const contactData = {
      fields: {
        NAME: data.name,
        LAST_NAME: data.lastName,
        PHONE: [{ VALUE: data.phone, VALUE_TYPE: "WORK" }],
        EMAIL: [{ VALUE: data.email, VALUE_TYPE: "WORK" }],
        WEB: [{ VALUE: data.website, VALUE_TYPE: "WORK" }]
      },
      params: { REGISTER_SONET_EVENT: "Y" }
    };
    
    console.log('Creating contact with data:', contactData);
    const contactId = await callBitrix24API('crm.contact.add', contactData);
    console.log('Contact created successfully with ID:', contactId);

    const requisiteData = {
      fields: {
        ENTITY_TYPE_ID: 3, 
        ENTITY_ID: contactId,
        PRESET_ID: 1,
        NAME: `${data.name} ${data.lastName} - Business Info`,
        COUNTRY: 'VN'
      }
    };

    console.log('Creating requisite with data:', requisiteData);
    const requisiteId = await callBitrix24API('crm.requisite.add', requisiteData);
    console.log('Requisite created successfully with ID:', requisiteId);

    const addressData = {
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

    console.log('Adding address with data:', addressData);
    const addressId = await callBitrix24API('crm.address.add', addressData);
    console.log('Address added successfully with ID:', addressId);

    const bankDetailData = {
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

    console.log('Creating bank detail with data:', JSON.stringify(bankDetailData, null, 2));
    const bankDetailId = await callBitrix24API('crm.requisite.bankdetail.add', bankDetailData);
    console.log('Bank detail created successfully with ID:', bankDetailId);

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
  } catch (error) {
    console.error('Error in createFullContact:', error);
    throw error;
  }
};


export const updateFullContact = async (contactId, data) => {
  try {
    try {
      await callBitrix24API('crm.contact.get', { id: contactId });
    } catch (error) {
      throw new Error(`Không tìm thấy liên hệ với ID ${contactId}`);
    }

    const contactData = {
      id: contactId,
      fields: {
        NAME: data.name,
        LAST_NAME: data.lastName,
        PHONE: [{ VALUE: data.phone, VALUE_TYPE: "WORK" }],
        EMAIL: [{ VALUE: data.email, VALUE_TYPE: "WORK" }],
        WEB: [{ VALUE: data.website, VALUE_TYPE: "WORK" }]
      },
      params: { REGISTER_SONET_EVENT: "Y" }
    };
    
    console.log('Updating contact with data:', contactData);
    await callBitrix24API('crm.contact.update', contactData);
    console.log('Contact updated successfully');

    const requisites = await callBitrix24API('crm.requisite.list', {
      filter: { ENTITY_ID: contactId, ENTITY_TYPE_ID: 3 }
    });
    
    if (!requisites || requisites.length === 0) {
      throw new Error(`Không tìm thấy requisite cho liên hệ ${contactId}. Vui lòng tạo mới liên hệ.`);
    }
    
    const requisiteId = requisites[0].ID;
    console.log('Found requisite ID:', requisiteId);

    const addresses = await callBitrix24API('crm.address.list', {
      filter: { ENTITY_ID: requisiteId, ENTITY_TYPE_ID: 8 }
    });

    if (!addresses || addresses.length === 0) {
      throw new Error(`Không tìm thấy địa chỉ cho requisite ${requisiteId}. Vui lòng tạo mới liên hệ.`);
    }

    const addressData = {
      fields: {
        TYPE_ID: 1,
        ENTITY_TYPE_ID: 8,
        ENTITY_ID: requisiteId,
        COUNTRY: 'Vietnam',
        PROVINCE: data.region,
        CITY: data.city,
        ADDRESS_1: data.address
      }
    };

    console.log('Updating address...');
    await callBitrix24API('crm.address.update', addressData);
    console.log('Address updated successfully');

    const bankDetails = await callBitrix24API('crm.requisite.bankdetail.list', {
      filter: { ENTITY_ID: requisiteId }
    });

    if (!bankDetails || bankDetails.length === 0) {
      throw new Error(`Không tìm thấy thông tin ngân hàng cho requisite ${requisiteId}. Vui lòng tạo mới liên hệ.`);
    }

    const bankDetailId = bankDetails[0].ID;
    const bankDetailData = {
      id: bankDetailId,
      fields: {
        ENTITY_ID: requisiteId,
        NAME: `${data.bankName} - Primary Account`,
        RQ_BANK_NAME: data.bankName,
        RQ_ACC_NAME: data.name + ' ' + data.lastName,
        RQ_ACC_NUM: data.bankAccount
      }
    };

    console.log('Updating bank detail...');
    await callBitrix24API('crm.requisite.bankdetail.update', bankDetailData);
    console.log('Bank detail updated successfully');

    return {
      success: true,
      message: 'Cập nhật liên hệ thành công',
      contactId,
      requisiteId,
      bankDetailId
    };
  } catch (error) {
    console.error('Error in updateFullContact:', error);
    throw error;
  }
};

export const deleteFullContact = async (contactId) => {
  try {
    try {
      await callBitrix24API('crm.contact.get', { id: contactId });
    } catch (error) {
      throw new Error(`Contact with ID ${contactId} not found`);
    }
    const requisites = await callBitrix24API('crm.requisite.list', {
      filter: { ENTITY_ID: contactId, ENTITY_TYPE_ID: 3 }
    });
    
    if (requisites && requisites.length > 0) {
      const requisiteId = requisites[0].ID;
      console.log('Found requisite ID:', requisiteId);

      const bankDetails = await callBitrix24API('crm.requisite.bankdetail.list', {
        filter: { ENTITY_ID: requisiteId }
      });

      if (bankDetails && bankDetails.length > 0) {
        for (const bankDetail of bankDetails) {
          console.log(`Deleting bank detail ID: ${bankDetail.ID}`);
          await callBitrix24API('crm.requisite.bankdetail.delete', {
            id: bankDetail.ID
          });
        }
      }

      const addresses = await callBitrix24API('crm.address.list', {
        filter: { ENTITY_ID: requisiteId, ENTITY_TYPE_ID: 8 }
      });

      if (addresses && addresses.length > 0) {
        for (const address of addresses) {
          console.log(`Deleting address for requisite ${requisiteId}`);
          await callBitrix24API('crm.address.delete', {
            fields: {
              TYPE_ID: address.TYPE_ID,
              ENTITY_TYPE_ID: 8,
              ENTITY_ID: requisiteId
            }
          });
        }
      }
    }

    console.log(`Deleting contact ID: ${contactId}`);
    await callBitrix24API('crm.contact.delete', { ID: contactId });

    return {
      success: true,
      message: 'Contact and all associated data deleted successfully'
    };
  } catch (error) {
    console.error('Error in deleteFullContact:', error);
    throw error;
  }
};

export const getAllContacts = async () => {
  try {
    const contacts = await callBitrix24API('crm.contact.list', {
      filter: {},
      select: ['*', 'PHONE', 'EMAIL', 'WEB']
    });

    const contactsWithDetails = await Promise.all(contacts.map(async (contact) => {
      try {
        const requisites = await callBitrix24API('crm.requisite.list', {
          filter: { ENTITY_ID: contact.ID, ENTITY_TYPE_ID: 3 }
        });

        if (requisites && requisites.length > 0) {
          const requisiteId = requisites[0].ID;

          const addresses = await callBitrix24API('crm.address.list', {
            filter: { ENTITY_ID: requisiteId, ENTITY_TYPE_ID: 8 }
          });

          const bankDetails = await callBitrix24API('crm.requisite.bankdetail.list', {
            filter: { ENTITY_ID: requisiteId }
          });

          return {
            ...contact,
            ADDRESS: addresses && addresses.length > 0 ? addresses[0] : null,
            BANK_NAME: bankDetails && bankDetails.length > 0 ? bankDetails[0].RQ_BANK_NAME : null,
            BANK_ACCOUNT: bankDetails && bankDetails.length > 0 ? bankDetails[0].RQ_ACC_NUM : null
          };
        }

        return contact;
      } catch (error) {
        console.error(`Error fetching details for contact ${contact.ID}:`, error);
        return contact;
      }
    }));

    return contactsWithDetails;
  } catch (error) {
    console.error('Error in getAllContacts:', error);
    throw error;
  }
};

export { callBitrix24API };