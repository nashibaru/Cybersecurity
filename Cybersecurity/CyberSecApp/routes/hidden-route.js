// honeytoken-routes.js
import { Router } from "express";
import path from 'path';
import { fileURLToPath } from 'url';
import { ensureAuthenticated } from "../middleware/auth-middleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();
router.use(ensureAuthenticated);

// HONEYTOKEN ROUTES - Only require authentication, NOT admin privileges
router.get('/internal/backup', (req, res) => {
    console.log('🔍 DEBUG - Current CSP Header:', res.getHeader('Content-Security-Policy'));
    console.log('🔍 DEBUG - Request Path:', req.path);
    console.error(`🚨 HONEYTOKEN: Hidden admin backup panel accessed by ${req.session.username || 'anonymous'}`);
    console.error(`   IP: ${req.ip}, User-Agent: ${req.get('User-Agent')}`);
    
    res.render('hidden-admin', {  // Make sure this view exists!
        user: { username: req.session.username, role: req.session.role },
        title: 'System Backup'
    });
});

// Fake file download route
router.get('/secure/download/:file', (req, res) => {
    const fileName = req.params.file;
    const allowedFiles = {
        'admins-passwords.docx': 'admins-passwords.docx',
        'user-data.xlsx': 'user-data.xlsx', 
        'ssl-keys.tar.gz': 'ssl-keys.tar.gz'
    };

    if (allowedFiles[fileName]) {
        console.error(`🚨 HONEYTOKEN: Fake file download attempted: ${fileName}`);
        console.error(`   User: ${req.session.username}, IP: ${req.ip}`);
        console.error(`   User-Agent: ${req.get('User-Agent')}`);
        
        // Serve the actual honeytoken file from honeytokens directory
        const filePath = path.join(__dirname, '../honeytokens', fileName);
        
        res.download(filePath, (err) => {
            if (err) {
                console.error('Error serving honeytoken file:', err);
                res.status(404).send('File not found');
            } else {
                console.log(`✅ Honeytoken file served: ${fileName} to user ${req.session.username}`);
            }
        });
    } else {
        res.status(404).send('File not found');
    }
});

export default router;