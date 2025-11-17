import dbModule from '../app-modules/db.js';
import { logEvent } from '../app-modules/logger.js';
import { generatePassword } from '../app-modules/otp.js';
import argon2 from 'argon2';
import { validatePasswordRequirements, checkPasswordHistory } from '../middleware/validation-middleware.js';
import { LicenseService } from '../app-modules/license-service.js';

const { getDb } = dbModule;

export class AdminController {
    // Settings
    static async getSettings(req, res) {
        try {
            const db = getDb();
            const settings = await db.get("SELECT * FROM settings WHERE id = 1");
            res.render('admin/settings', { settings, message: null, title: 'Ustawienia bezpieczeństwa' });
        } catch (error) {
            console.error('Settings fetch error:', error);
            res.status(500).render('errors/500', { title: 'Błąd serwera' });
        }
    }

    static async updateSettings(req, res) {
        try {
            const {
                min_length,
                require_special,
                require_lowercase,
                require_uppercase,
                pwd_valid_days,
                session_timeout_minutes
            } = req.body;

            const db = getDb();
            await db.run(
                `UPDATE settings SET
                min_length = ?,
                require_special = ?,
                require_lowercase = ?,
                require_uppercase = ?,
                pwd_valid_days = ?,
                session_timeout_minutes = ?
                WHERE id = 1`,
                [
                    min_length,
                    require_special ? 1 : 0,
                    require_lowercase ? 1 : 0,
                    require_uppercase ? 1 : 0,
                    pwd_valid_days,
                    session_timeout_minutes
                ]
            );

            // Update app locals for immediate effect
            if (req.app.locals.settings) {
                req.app.locals.settings.session_timeout_minutes = session_timeout_minutes;
            }

            const settings = await db.get("SELECT * FROM settings WHERE id = 1");
            await logEvent(req.session.username, 'Settings updated', 'Zaktualizowano ustawienia bezpieczeństwa');

            res.render('admin/settings', {
                settings, message: 'Zapisano ustawienia', title: 'Ustawienia bezpieczeństwa'
            });

        } catch (error) {
            console.error('Settings update error:', error);
            res.status(500).render('errors/500', { title: 'Błąd serwera' });
        } 
    }

    // Users Management
    static async getUsers(req, res) {
        try {
            const db = getDb();
            const users = await db.all("SELECT * FROM users ORDER BY username");
            res.render('admin/users', {
                users,
                message: null,
                title: 'Zarządzanie użytkownikami'
            });
        } catch (error) {
            console.error('Users fetch error:', error);
            res.status(500).render('errors/500', { title: 'Błąd serwera' });
        }
    }

    static async toggleUserBlock(req, res) {
        try {
            const db = getDb();
            const user = await db.get("SELECT * FROM users WHERE id = ?", [req.params.id]);
            
            if (user) {
                const newBlockedState = user.blocked ? 0 : 1;
                await db.run("UPDATE users SET blocked = ? WHERE id = ?", [newBlockedState, user.id]);
                
                const action = newBlockedState ? 'zablokowany' : 'odblokowany';
                await logEvent(req.session.username, 'user_updated', `Użytkownik ${user.username} ${action}`);
            }
            
            res.redirect('/admin/users');
        } catch (error) {
            console.error('User block toggle error:', error);
            res.status(500).render('errors/500', { title: 'Błąd serwera' });
        }
    }

    static async generateOTP(req, res) {
        try {
            const { username } = req.body;
            if (!username) {
                return res.status(400).json({ error: 'Nazwa użytkownika jest wymagana' });
            }
            const otpPlain = generatePassword();
            if (!otpPlain) {
                return res.status(500).json({ error: 'Nie udało się wygenerować OTP' });
            }
            await logEvent(req.session.username, 'otp_generated', `OTP wygenerowane dla ${username}`);
            res.json({ otp: otpPlain });

        } catch (error) {
            console.error('OTP generation error:', error);
            res.status(500).json({ error: 'Błąd generowania OTP' });
        }
    }

    static async deleteUser(req, res) {
        try {
            const db = getDb();
            const user = await db.get("SELECT username FROM users WHERE id = ?", [req.params.id]);
            
            if (user) {
                await db.run("DELETE FROM users WHERE id = ?", [req.params.id]);
                await logEvent(req.session.username, 'user_deleted', `Usunięto użytkownika ${user.username}`);
            }
            
            res.redirect('/admin/users');

        } catch (error) {
            console.error('User delete error:', error);
            res.status(500).render('errors/500', { title: 'Błąd serwera' });
        }
    }

    static async createUser(req, res) {
        try {
            const { username, full_name, role, temp_password } = req.body;
            const db = getDb();
            
            // Validate input
            if (!username || !temp_password) {
                return res.render('admin/users', {
                users: await db.all("SELECT * FROM users"),
                message: 'Nazwa użytkownika i hasło są wymagane',
                title: 'Zarządzanie użytkownikami'
                });
            }
            const hash = await argon2.hash(temp_password);
            const now = new Date().toISOString();
            
            const result = await db.run(
                `INSERT INTO users (username, full_name, password_hash, role, first_login, pwd_set_date)
                VALUES (?, ?, ?, ?, 1, ?)`,
                [username, full_name, hash, role, now]
            );
            const userId = result.lastID;
            await db.run(
                "INSERT INTO pwd_history (user_id, password_hash, set_date) VALUES (?, ?, ?)",
                [userId, hash, now]
            );
            await logEvent(req.session.username, 'user_created', `Utworzono użytkownika ${username}`);
            res.redirect('/admin/users');

        } catch (error) {
            console.error('User creation error:', error);
            res.status(500).render('errors/500', { title: 'Błąd serwera' });
        }
    }

    static async editUserForm(req, res) {
        try {
            const db = getDb();
            const user = await db.get("SELECT * FROM users WHERE id = ?", [req.params.id]);
            
            if (!user) {
                return res.redirect('/admin/users');
            }
            
            res.render('admin/user-edit', {
                user,
                message: null,
                title: 'Edytuj użytkownika'
            });

        } catch (error) {
            console.error('User edit form error:', error);
            res.status(500).render('errors/500', { title: 'Błąd serwera' });
        }
    }

    static async updateUser(req, res) {
        try {
            const { username, full_name, role, temp_password, blocked } = req.body;
            const db = getDb();
            
            const user = await db.get("SELECT * FROM users WHERE id = ?", [req.params.id]);
            if (!user) {
                return res.redirect('/admin/users');
            }
            // Update password if provided
            if (temp_password) {
                const validationErrors = validatePasswordRequirements(temp_password, await db.get("SELECT * FROM settings WHERE id = 1"));
                if (validationErrors.length > 0) {
                    return res.render('admin/user-edit', {
                        user,
                        message: validationErrors[0],
                        title: 'Edytuj użytkownika'
                    });
                }
                const isNewPassword = await checkPasswordHistory(user.id, temp_password, db);
                if (!isNewPassword) {
                    return res.render('admin/user-edit', {
                        user,
                        message: 'Hasło jest zbyt podobne do jednego z poprzednich haseł',
                        title: 'Edytuj użytkownika'
                    });
                }
                const hash = await argon2.hash(temp_password);
                const now = new Date().toISOString();
                
                await db.run(
                "UPDATE users SET password_hash = ?, pwd_set_date = ?, first_login = 0 WHERE id = ?",
                [hash, now, user.id]
                );
                await db.run(
                "INSERT INTO pwd_history (user_id, password_hash, set_date) VALUES (?, ?, ?)",
                [user.id, hash, now]
                );
            }
            // Update user data
            await db.run(
                `UPDATE users SET username = ?, full_name = ?, role = ?, blocked = ?
                WHERE id = ?`,
                [username, full_name, role, blocked ? 1 : 0, user.id]
            );
            await logEvent(req.session.username, 'user_updated', `Zaktualizowano dane użytkownika ${username}`);
            res.redirect('/admin/users');

        } catch (error) {
            console.error('User update error:', error);
            res.status(500).render('errors/500', { title: 'Błąd serwera' });
        }
    }

     static async generateLicense(req, res) {
        try {
            const db = getDb();
            const keyLength = parseInt(req.headers['key-length']) || 10;
            const licenseKey = LicenseService.generateLicenseKey(keyLength);
            const shiftKey = LicenseService.generateShiftKey();
            const encryptedKey = LicenseService.encrypt(licenseKey, shiftKey);
            
            // Store the license in database
            await db.run(
                "INSERT INTO license_keys (license_key, shift_key, encrypted_key, created_by) VALUES (?, ?, ?, ?)",
                [licenseKey, shiftKey, encryptedKey, req.session.username]
            );
            
            await logEvent(req.session.username, 'license_generated', `Wygenerowano klucz licencyjny: ${encryptedKey}`);
            
            // Return both original and encrypted for display
            res.json({
                success: true,
                licenseKey: licenseKey,
                encryptedKey: encryptedKey,
                shiftKey: shiftKey,
                message: 'Klucz licencyjny wygenerowany pomyślnie'
            });
            
        } catch (error) {
            console.error('License generation error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Błąd podczas generowania klucza licencyjnego' 
            });
        }
    }

    // License Management Page
    static async getLicensesPage(req, res) {
        try {
            res.render('admin/licenses', {
                user: {
                    username: req.session.username,
                    role: req.session.role
                },
                title: 'Zarządzanie Kluczami Licencyjnymi'
            });
        } catch (error) {
            console.error('Licenses page error:', error);
            res.status(500).render('errors/500', { title: 'Błąd serwera' });
        }
    }

    // License Statistics
    static async getLicenseStats(req, res) {
        try {
            const db = getDb();
            
            const totalUsers = await db.get("SELECT COUNT(*) as count FROM users");
            const premiumUsers = await db.get("SELECT COUNT(*) as count FROM users WHERE is_key = 1");
            const trialUsers = await db.get("SELECT COUNT(*) as count FROM users WHERE is_key = 0 AND free_uses > 0");
            
            res.json({
                success: true,
                totalUsers: totalUsers.count,
                premiumUsers: premiumUsers.count,
                trialUsers: trialUsers.count
            });
            
        } catch (error) {
            console.error('License stats error:', error);
            res.status(500).json({ success: false, message: 'Błąd pobierania statystyk' });
        }
    }

    // Get all licenses
    static async getLicenses(req, res) {
        try {
            const db = getDb();
            const licenses = await db.all(`
                SELECT lk.*, u.username as used_by_username 
                FROM license_keys lk 
                LEFT JOIN users u ON lk.used_by = u.id 
                ORDER BY lk.created_at DESC
            `);
            
            res.json({ success: true, licenses });
            
        } catch (error) {
            console.error('Licenses fetch error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Błąd podczas pobierania kluczy licencyjnych' 
            });
        }
    }
}