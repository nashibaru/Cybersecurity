import { verify } from 'argon2';
 
export function validatePasswordRequirements(password, settings) {
  const errors = [];
  if (password.length < settings.min_length) {
    errors.push(`Hasło musi mieć co najmniej ${settings.min_length} znaków`);
  }
  
  if (settings.require_special && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Hasło musi zawierać przynajmniej jeden znak specjalny');
  }
  
  if (settings.require_lowercase && !/[a-z]/.test(password)) {
    errors.push('Hasło musi zawierać przynajmniej jedną małą literę');
  }
  
  if (settings.require_uppercase && !/[A-Z]/.test(password)) {
    errors.push('Hasło musi zawierać przynajmniej jedną wielką literę');
  }
  return errors;
}
export async function checkPasswordHistory(userId, newPassword, db) {
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  
  const recentHistory = await db.all(
    "SELECT password_hash FROM pwd_history WHERE user_id = ? AND set_date >= ?",
    [userId, twoYearsAgo.toISOString()]
  );
  for (const record of recentHistory) {
    if (await verify(record.password_hash, newPassword)) {
      return false; // Password found in history
    }
  }
  
  return true; // Password is new
}