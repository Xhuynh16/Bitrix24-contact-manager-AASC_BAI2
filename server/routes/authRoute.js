import express from 'express';
import { authCallback, installEvent, loginHandler, checkAuthStatus } from '../controllers/authController.js';

const router = express.Router();

/**
 * @route GET /auth/login
 * @desc Generate Bitrix24 OAuth authentication URL
 */
router.get('/login', loginHandler);

/**
 * @route POST,GET /auth/callback
 * @desc Handle OAuth callback from Bitrix24
 */
router.all('/callback', authCallback);

/**
 * @route POST /auth/install-event
 * @desc Handle Bitrix24 app installation event
 */
router.post('/install-event', installEvent);

/**
 * @route GET /auth/status
 * @desc Check authentication status
 */
router.get('/status', checkAuthStatus);

export default router; 