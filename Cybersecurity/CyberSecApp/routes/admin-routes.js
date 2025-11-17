import { Router } from "express";
import { AdminController } from "../controllers/admin-controller.js";
import { ensureAuthenticated, ensureAdmin } from "../middleware/auth-middleware.js";

const router = Router();

// Apply admin protection to all routes
router.use(ensureAuthenticated, ensureAdmin);

// Settings routes
router.get('/settings', AdminController.getSettings);
router.post('/settings', AdminController.updateSettings);

// Users routes
router.get('/users', AdminController.getUsers);
router.post('/users/generate-otp', AdminController.generateOTP);
router.post('/users/:id/block', AdminController.toggleUserBlock);
router.post('/users/:id/delete', AdminController.deleteUser);
router.post('/users/add', AdminController.createUser);
router.get('/users/:id/edit', AdminController.editUserForm);
router.post('/users/:id/edit', AdminController.updateUser);
router.get('/licenses', AdminController.getLicensesPage); // New page route
router.post('/licenses/generate', AdminController.generateLicense);
router.get('/licenses/list', AdminController.getLicenses); // Renamed for clarity
router.get('/licenses/stats', AdminController.getLicenseStats); // New stats route

// Logs routes
router.get('/logs', async (req, res) => {
    try {
        const { fetchLogs } = await import("../app-modules/logger.js");
        const logs = await fetchLogs(500, 0);
        res.render('admin/logs', { logs, title: 'Activity Logs' });
    } catch (error) {
        console.error("Logs fetch error:", error);
        res.status(500).render('errors/500', {
            title: 'Server Error',
            message: 'Logs fetch error'
        });
    }
});

export default router;