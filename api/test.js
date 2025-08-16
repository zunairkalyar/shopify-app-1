/**
 * Simple test endpoint for debugging Vercel deployment
 */

module.exports = (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Webhook System API is working!',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        path: req.url,
        method: req.method
    });
};
