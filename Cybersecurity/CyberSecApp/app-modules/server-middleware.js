// --- middleware
export function ensureAuthenticated(req, res, next) {
  if (req && req.session && req.session.userId) {
    return next();
  }
  // opcjonalnie dodajemy returnTo, żeby po logowaniu wrócić do poprzedniej strony
  const returnTo = req && req.originalUrl ? `?returnTo=${encodeURIComponent(req.originalUrl)}` : '';
  return res.redirect(`/login${returnTo}`);
}

export function ensureAdmin(req, res, next) {
  if (req && req.session && req.session.role === 'ADMIN') {
    return next();
  }
  return res.status(403).send('Brak dostępu');
}