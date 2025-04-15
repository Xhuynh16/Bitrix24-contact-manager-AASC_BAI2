import express from 'express';

/**
 * Middleware to validate required fields in request body
 * @param {string[]} fields - Array of required field names
 * @returns {express.RequestHandler} Express middleware function
 */
const validateRequiredFields = (fields) => {
  return (req, res, next) => {
    const missingFields = fields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        error: 'Missing required fields',
        missingFields
      });
    }
    
    next();
  };
};

export default validateRequiredFields; 