import express from 'express';
import { createContactHandler, updateContactHandler, deleteContact, getContactsHandler } from '../controllers/contactController.js';

const router = express.Router();

router.get('/', getContactsHandler);

router.post('/', createContactHandler);

router.put('/:id', updateContactHandler);

router.delete('/:id', deleteContact);

export default router;