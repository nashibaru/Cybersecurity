// License Service for Caesar Cipher License System
export class LicenseService {
  static ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  static HONEY_LICENSES = [
    'HTK-UNLIMITED-ADMIN',
    'CANARY-PREMIUM-LIFETIME',
    'ADMIN-BYPASS-2024', 
    'EMERGENCY-ACCESS-KEY'
  ];
  
  // Generate a random license key (x uppercase letters)
  static generateLicenseKey(length = 10) {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += this.ALPHABET.charAt(Math.floor(Math.random() * this.ALPHABET.length));
    }
    return result;
  }
  
  // Generate random shift key (1-25)
  static generateShiftKey() {
    return Math.floor(Math.random() * 25) + 1; // 1-25 (0 and 26 would be no shift)
  }
  
  // Caesar cipher encryption
  static encrypt(text, shift) {
    return text.toUpperCase().split('').map(char => {
      const index = this.ALPHABET.indexOf(char);
      if (index === -1) return char;
      return this.ALPHABET[(index + shift) % this.ALPHABET.length];
    }).join('');
  }
  
  // Caesar cipher decryption
  static decrypt(text, shift) {
    return text.toUpperCase().split('').map(char => {
      const index = this.ALPHABET.indexOf(char);
      if (index === -1) return char;
      return this.ALPHABET[(index - shift + this.ALPHABET.length) % this.ALPHABET.length];
    }).join('');
  }
  
  // Validate license activation
  static async validateLicense(encryptedKey, shiftKey, userId, db) {
    try {
      // Decrypt the provided key
      const decryptedKey = this.decrypt(encryptedKey, parseInt(shiftKey));
      

      // HONEYTOKEN: Check if this is a fake license
        if (this.HONEY_LICENSES.includes(decryptedKey)) {
            console.error(`🚨 HONEYTOKEN: Fake license key attempted: ${decryptedKey}`);
            console.error(`   User ID: ${userId}, Encrypted Key: ${encryptedKey}`);
            
            // Log the security event
            await db.run(
                "INSERT INTO security_events (user_id, event_type, description, ip_address) VALUES (?, ?, ?, ?)",
                [userId, 'honey_license_attempt', `Attempted to use honeytoken license: ${decryptedKey}`, '127.0.0.1']
            );
            
            // Make HTTP request to trigger canarytoken (in real implementation)
            // const https = require('https');
            // https.get('http://canarytokens.org/terms/your-license-token-here/license.php');
            
            return {
                success: false,
                message: 'Nieprawidłowy klucz licencyjny lub klucz został już użyty',
                isHoneyToken: true
            };
        }



      // Find the license in database
      const license = await db.get(
        "SELECT * FROM license_keys WHERE license_key = ? AND shift_key = ? AND is_used = 0",
        [decryptedKey, parseInt(shiftKey)]
      );
      
      if (!license) {
        return { success: false, message: 'Nieprawidłowy klucz licencyjny lub klucz został już użyty' };
      }
      


      // HONEYTOKEN: Check if this is a database honeytoken license
        if (license.is_honey === 1) {
            console.error(`🚨 HONEYTOKEN: Database honeytoken license triggered: ${decryptedKey}`);
            console.error(`   User ID: ${userId}, License ID: ${license.id}`);
            
            await db.run(
                "INSERT INTO security_events (user_id, event_type, description, ip_address) VALUES (?, ?, ?, ?)",
                [userId, 'db_honey_license_triggered', `Triggered database honeytoken license: ${decryptedKey}`, '127.0.0.1']
            );
            
            // Still allow the "activation" to catch more data
            await db.run(
                "UPDATE license_keys SET is_used = 1, used_by = ?, used_at = datetime('now') WHERE id = ?",
                [userId, license.id]
            );
            
            return {
                success: true,
                message: 'Licencja aktywowana pomyślnie! Odblokowano dostęp na całe życie.',
                isHoneyToken: true
            };
        }



      // Activate license for user
      await db.run(
        "UPDATE license_keys SET is_used = 1, used_by = ?, used_at = datetime('now') WHERE id = ?",
        [userId, license.id]
      );
      
      // Update user to have lifetime access
      await db.run(
        "UPDATE users SET is_key = 1 WHERE id = ?",
        [userId]
      );
      
      return { success: true, message: 'Licencja aktywowana pomyślnie! Odblokowano dostęp na całe życie.' };
      
    } catch (error) {
      console.error('License validation error:', error);
      return { success: false, message: 'Błąd podczas aktywacji licencji' };
    }
  }
  
  // Check if user can access premium feature
  static async canAccessPremium(userId, db) {
    try {
      const user = await db.get("SELECT free_uses, is_key FROM users WHERE id = ?", [userId]);
      
      if (!user) return false;
      
      // If user has license key, always allow access
      if (user.is_key) return true;
      
      // If user has free uses left, decrement and allow access
      if (user.free_uses > 0) {
        await db.run("UPDATE users SET free_uses = free_uses - 1 WHERE id = ?", [userId]);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Premium access check error:', error);
      return false;
    }
  }
  
  // Get user's remaining free uses
  static async getRemainingUses(userId, db) {
    try {
      const user = await db.get("SELECT free_uses, is_key FROM users WHERE id = ?", [userId]);
      if (!user) return 0;
      
      if (user.is_key) return 'unlimited';
      return user.free_uses;
    } catch (error) {
      console.error('Remaining uses check error:', error);
      return 0;
    }
  }
}

export default LicenseService;