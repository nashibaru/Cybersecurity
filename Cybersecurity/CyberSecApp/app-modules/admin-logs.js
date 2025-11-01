import { Router } from 'express';
import { fetchLogs } from './logger.js';
import { ensureAuthenticated, ensureAdmin } from './server-middleware.js';

const router = Router();
router.use(ensureAuthenticated, ensureAdmin);

router.get('/logs', async (req, res) => {
  try {
    const logs = await fetchLogs(500, 0);
    res.render('admin-logs', { logs, title: 'Logi aktywności' });
  } catch (err) {
    console.error('Błąd pobierania logów:', err);
    res.status(500).render('error', { message: 'Błąd pobierania logów' });
  }
});

export default router;