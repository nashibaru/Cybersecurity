// import { Router } from 'express';
// import { verify, hash } from 'argon2';
// import dbModule from '../app-modules/db.js';
// import { ensureAuthenticated } from '../middleware/auth-middleware.js';
// import { logEvent } from '../app-modules/logger.js';
// import { validatePasswordRequirements, checkPasswordHistory } from '../middleware/validation-middleware.js';
// import { RecaptchaService } from '../app-modules/recaptcha-service.js';

// const router = Router();
// const { getDb } = dbModule;

// // Helper function to get user data for template
// function getUserData(req) {
//   return {
//     username: req.session.username,
//     role: req.session.role
//   };
// }

// router.get('/change-password', ensureAuthenticated, (req, res) => {
//   res.render('user/change-password', { 
//     user: getUserData(req),
//     message: null, 
//     mustChange: !!req.session.mustChangePassword,
//     title: 'Zmiana hasła',
//     recaptchaSiteKey: RecaptchaService.getSiteKey()
//   });
// });

// router.post('/change-password', ensureAuthenticated, async (req, res) => {
//   const { old_password, new_password, new_password2, 'g-recaptcha-response': recaptchaToken } = req.body;
//   const db = getDb();

//   try {
//     // Verify reCAPTCHA first
//     const recaptchaResult = await RecaptchaService.verifyRecaptcha(recaptchaToken);
    
//     if (!recaptchaResult.success) {
//       return renderError('Weryfikacja reCAPTCHA nie powiodła się. Spróbuj ponownie.');
//     }

//     const user = await db.get("SELECT * FROM users WHERE id = ?", [req.session.userId]);
//     if (!user) {
//       return res.redirect('/logout');
//     }

//     if (!old_password) {
//       return renderError('Podaj stare hasło');
//     }

//     const isOldPasswordValid = await verify(user.password_hash, old_password);
//     if (!isOldPasswordValid) {
//       return renderError('Stare hasło jest niepoprawne');
//     }

//     if (!new_password || new_password !== new_password2) {
//       return renderError('Hasła się nie zgadzają');
//     }

//     const settings = await db.get("SELECT * FROM settings WHERE id = 1");
//     const validationErrors = validatePasswordRequirements(new_password, settings);
//     if (validationErrors.length > 0) {
//       return renderError(validationErrors[0]);
//     }

//     const isNewPasswordValid = await checkPasswordHistory(user.id, new_password, db);
//     if (!isNewPasswordValid) {
//       return renderError('Hasło jest zbyt podobne do jednego z poprzednich haseł');
//     }

//     const newHash = await hash(new_password);
//     const now = new Date().toISOString();
//     await db.run("UPDATE users SET password_hash = ?, first_login = 0, pwd_set_date = ? WHERE id = ?", [newHash, now, user.id]);
//     await db.run("INSERT INTO pwd_history (user_id, password_hash, set_date) VALUES (?, ?, ?)", [user.id, newHash, now]);

//     // Clear the must-change-password flag
//     req.session.mustChangePassword = false;
//     await logEvent(user.username, 'password_changed', 'Hasło zmienione pomyślnie');

//     res.render('user/change-password', { 
//       user: getUserData(req),
//       message: 'success:Hasło zostało zmienione pomyślnie', 
//       mustChange: false,
//       title: 'Zmiana hasła',
//       recaptchaSiteKey: RecaptchaService.getSiteKey()
//     });

//   } catch (error) {
//     console.error('Password change error:', error);
//     renderError('Błąd serwera podczas zmiany hasła');
//   }

//   function renderError(message) {
//     res.render('user/change-password', { 
//       user: getUserData(req),
//       message, 
//       mustChange: !!req.session.mustChangePassword,
//       title: 'Zmiana hasła',
//       recaptchaSiteKey: RecaptchaService.getSiteKey()
//     });
//   }
// });

// export default router;
import { Router } from 'express';
import { verify, hash } from 'argon2';
import dbModule from '../app-modules/db.js';
import { ensureAuthenticated } from '../middleware/auth-middleware.js';
import { logEvent } from '../app-modules/logger.js';
import { validatePasswordRequirements, checkPasswordHistory } from '../middleware/validation-middleware.js';
import { RecaptchaService } from '../app-modules/recaptcha-service.js';
import { LicenseService } from '../app-modules/license-service.js';

const router = Router();
const { getDb } = dbModule;

// Helper function to get user data for template
function getUserData(req) {
  return {
    username: req.session.username,
    role: req.session.role
  };
}

router.get('/change-password', ensureAuthenticated, async (req, res) => {
  console.log('GET /change-password - Session:', {
    userId: req.session.userId,
    username: req.session.username,
    sessionId: req.sessionID
  });
  
  const db = getDb();
  
  try {
    // Get remaining uses for the template
    let remainingUses;
    try {
      remainingUses = await LicenseService.getRemainingUses(req.session.userId, db);
    } catch (error) {
      console.error('Error getting remaining uses, using default:', error);
      remainingUses = 5; // Default fallback
    }
    
    res.render('user/change-password', { 
      user: getUserData(req),
      message: null, 
      mustChange: !!req.session.mustChangePassword,
      title: 'Zmiana hasła',
      recaptchaSiteKey: RecaptchaService.getSiteKey(),
      remainingUses: remainingUses
    });
    
  } catch (error) {
    console.error('Error in GET /change-password:', error);
    // If there's an error, render with default values
    res.render('user/change-password', { 
      user: getUserData(req),
      message: null, 
      mustChange: !!req.session.mustChangePassword,
      title: 'Zmiana hasła',
      recaptchaSiteKey: RecaptchaService.getSiteKey(),
      remainingUses: 5 // Default fallback
    });
  }
});

router.post('/change-password', ensureAuthenticated, async (req, res) => {
  const { old_password, new_password, new_password2, 'g-recaptcha-response': recaptchaToken } = req.body;
  const db = getDb();

  console.log('POST /change-password - Session:', {
    userId: req.session.userId,
    username: req.session.username,
    sessionId: req.sessionID
  });
  console.log('reCAPTCHA token received:', !!recaptchaToken);

  try {
    // Verify reCAPTCHA first
    const recaptchaResult = await RecaptchaService.verifyRecaptcha(recaptchaToken);
    console.log('reCAPTCHA result:', recaptchaResult);
    
    if (!recaptchaResult.success) {
      console.log('reCAPTCHA verification failed');
      return renderError('Weryfikacja reCAPTCHA nie powiodła się. Spróbuj ponownie.');
    }

    console.log('Looking for user with ID:', req.session.userId);
    const user = await db.get("SELECT * FROM users WHERE id = ?", [req.session.userId]);
    
    if (!user) {
      console.log('USER NOT FOUND - redirecting to logout');
      return res.redirect('/logout');
    }

    console.log('User found:', user.username);

    if (!old_password) {
      console.log('No old password provided');
      return renderError('Podaj stare hasło');
    }

    const isOldPasswordValid = await verify(user.password_hash, old_password);
    console.log('Old password valid:', isOldPasswordValid);
    
    if (!isOldPasswordValid) {
      return renderError('Stare hasło jest niepoprawne');
    }

    if (!new_password || new_password !== new_password2) {
      console.log('New passwords do not match');
      return renderError('Hasła się nie zgadzają');
    }

    const settings = await db.get("SELECT * FROM settings WHERE id = 1");
    const validationErrors = validatePasswordRequirements(new_password, settings);
    if (validationErrors.length > 0) {
      console.log('Password validation errors:', validationErrors);
      return renderError(validationErrors[0]);
    }

    const isNewPasswordValid = await checkPasswordHistory(user.id, new_password, db);
    if (!isNewPasswordValid) {
      console.log('Password history check failed');
      return renderError('Hasło jest zbyt podobne do jednego z poprzednich haseł');
    }

    console.log('All validations passed - updating password');
    const newHash = await hash(new_password);
    const now = new Date().toISOString();
    
    await db.run("UPDATE users SET password_hash = ?, first_login = 0, pwd_set_date = ? WHERE id = ?", [newHash, now, user.id]);
    await db.run("INSERT INTO pwd_history (user_id, password_hash, set_date) VALUES (?, ?, ?)", [user.id, newHash, now]);

    // Clear the must-change-password flag
    req.session.mustChangePassword = false;
    
    // Save session to ensure changes persist
    await new Promise((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          reject(err);
        } else {
          console.log('Session saved successfully');
          resolve();
        }
      });
    });

    await logEvent(user.username, 'password_changed', 'Hasło zmienione pomyślnie');

    // Get remaining uses for the template
    const remainingUses = await LicenseService.getRemainingUses(req.session.userId, db);

    console.log('Password changed successfully - rendering success page');
    res.render('user/change-password', { 
      user: getUserData(req),
      message: 'success:Hasło zostało zmienione pomyślnie', 
      mustChange: false,
      title: 'Zmiana hasła',
      recaptchaSiteKey: RecaptchaService.getSiteKey(),
      remainingUses: remainingUses
    });

  } catch (error) {
    console.error('Password change error:', error);
    renderError('Błąd serwera podczas zmiany hasła');
  }

  async function renderError(message) {
    console.log('Rendering error:', message);
    
    // Get remaining uses for the template (even in error cases)
    let remainingUses;
    try {
      remainingUses = await LicenseService.getRemainingUses(req.session.userId, db);
    } catch (error) {
      console.error('Error getting remaining uses in renderError:', error);
      remainingUses = 0; // Default fallback
    }
    
    res.render('user/change-password', { 
      user: getUserData(req),
      message, 
      mustChange: !!req.session.mustChangePassword,
      title: 'Zmiana hasła',
      recaptchaSiteKey: RecaptchaService.getSiteKey(),
      remainingUses: remainingUses
    });
  }
});

// Premium feature route
router.get('/file-edit', ensureAuthenticated, async (req, res) => {
  const db = getDb();
  
  try {
    const canAccess = await LicenseService.canAccessPremium(req.session.userId, db);
    
    if (!canAccess) {
      return res.render('user/no-access', {
        user: getUserData(req),
        title: 'Brak dostępu',
        message: 'Wykorzystałeś wszystkie darmowe użycia. Aktywuj licencję, aby uzyskać dostęp.'
      });
    }
    
    const remainingUses = await LicenseService.getRemainingUses(req.session.userId, db);
    
    // Render your premium feature view
    res.render('user/file-edit', {
      user: getUserData(req),
      title: 'Funkcja Premium',
      remainingUses: remainingUses
    });
    
  } catch (error) {
    console.error('Premium feature access error:', error);
    res.render('user/no-access', {
      user: getUserData(req),
      title: 'Błąd',
      message: 'Wystąpił błąd podczas uzyskiwania dostępu do funkcji premium.'
    });
  }
});

// License activation route
router.post('/activate-license', ensureAuthenticated, async (req, res) => {
  const { encrypted_key, shift_key } = req.body;
  const db = getDb();
  
  console.log('POST /activate-license - License activation attempt:', {
    userId: req.session.userId,
    username: req.session.username
  });

  try {
    const result = await LicenseService.validateLicense(encrypted_key, shift_key, req.session.userId, db);
    
    if (result.success) {
      await logEvent(req.session.username, 'license_activated', 'Aktywowano licencję premium');
    }

    // Get updated remaining uses
    const remainingUses = await LicenseService.getRemainingUses(req.session.userId, db);
    
    res.render('user/change-password', {
      user: getUserData(req),
      message: result.success ? `success:${result.message}` : result.message,
      mustChange: !!req.session.mustChangePassword,
      title: 'Zmiana hasła',
      recaptchaSiteKey: RecaptchaService.getSiteKey(),
      remainingUses: remainingUses // Add this
    });
    
  } catch (error) {
    console.error('License activation error:', error);
    
    // Get remaining uses even in error case
    let remainingUses;
    try {
      remainingUses = await LicenseService.getRemainingUses(req.session.userId, db);
    } catch (e) {
      console.error('Error getting remaining uses:', e);
      remainingUses = 0;
    }
    
    res.render('user/change-password', {
      user: getUserData(req),
      message: 'Błąd podczas aktywacji licencji',
      mustChange: !!req.session.mustChangePassword,
      title: 'Zmiana hasła',
      recaptchaSiteKey: RecaptchaService.getSiteKey(),
      remainingUses: remainingUses // Add this
    });
  }
});

export default router;