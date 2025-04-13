import { createFullContact, updateFullContact, deleteFullContact, getAllContacts } from '../models/bitrix24Model.js';

export const createContactHandler = async (req, res) => {
  try {
    const {
      name,
      lastName,
      phone,
      email,
      website,
      address,
      city,
      region,
      bankName,
      bankAccount
    } = req.body;
    const requiredFields = [
      'name',
      'lastName',
      'phone',
      'email',
      'address',
      'city',
      'region',
      'bankName',
      'bankAccount'
    ];

    const missingFields = requiredFields.filter(field => !req.body[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        error: 'Missing required fields',
        missingFields
      });
    }

    const result = await createFullContact(req.body);

    res.status(201).json({
      message: 'Contact created successfully with all details',
      data: result
    });
  } catch (error) {
    console.error('Error in createContactHandler:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

export const updateContactHandler = async (req, res) => {
  try {
    const contactId = req.params.id;
    if (!contactId) {
      return res.status(400).json({
        error: 'Contact ID is required'
      });
    }

    const {
      name,
      lastName,
      phone,
      email,
      website,
      address,
      city,
      region,
      bankName,
      bankAccount
    } = req.body;

    const requiredFields = [
      'name',
      'lastName',
      'phone',
      'email',
      'address',
      'city',
      'region',
      'bankName',
      'bankAccount'
    ];

    const missingFields = requiredFields.filter(field => !req.body[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        error: 'Missing required fields',
        missingFields
      });
    }

    const result = await updateFullContact(contactId, req.body);

    res.json({
      message: 'Contact updated successfully',
      data: result
    });
  } catch (error) {
    console.error('Error in updateContactHandler:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

export const deleteContact = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Contact ID is required"
      });
    }

    await deleteFullContact(id);

    res.json({
      success: true,
      message: "Contact deleted successfully",
      data: {
        contactId: id
      }
    });
  } catch (error) {
    console.error('Error in deleteContact controller:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: "Not Found",
        message: error.message
      });
    }

    if (error.message.includes('Access denied')) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You don't have permission to delete this contact"
      });
    }

    res.status(500).json({
      error: "Internal Server Error",
      message: error.message
    });
  }
};

export const getContactsHandler = async (req, res) => {
  try {
    const contacts = await getAllContacts();
    res.json({
      success: true,
      message: 'Contacts retrieved successfully',
      data: contacts
    });
  } catch (error) {
    console.error('Error getting contacts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get contacts',
      error: error.message
    });
  }
};