import express from 'express';
import { createContactHandler, updateContactHandler, deleteContact, getContactsHandler } from '../controllers/contactController.js';
import validateRequiredFields from '../middleware/validateRequiredFields.js';

const router = express.Router();

// Required fields for contact operations
const requiredContactFields = [
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

// Get all contacts
router.get('/', getContactsHandler);

// Create new contact with validation middleware
router.post('/', validateRequiredFields(requiredContactFields), createContactHandler);

// Update contact with validation middleware
router.put('/:id', validateRequiredFields(requiredContactFields), updateContactHandler);

// Delete contact
router.delete('/:id', deleteContact);

export default router;