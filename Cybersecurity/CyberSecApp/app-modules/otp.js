// app-modules/otp.js
const PiE = (Math.PI - 0.2) - (Math.E + 0.2);

/**
 * Generuje 6-cyfrowe hasło wg algorytmu:
 * - a, x losowane z [0.1, 0.9)
 * - modyfikacje z PiE według Twojej reguły
 * - bierze a/x, pobiera pierwsze 6 cyfr po przecinku
 * - jeśli są >1 wiodące zera, redukuje je do maks. jednego zera i uzupełnia kolejnymi cyframi z dalszej części ułamka
 * Zwraca string długości 6 (np. "051234", "714285").
 */
export function generatePassword() {
  // losujemy a i x w [0.1, 0.9)
  let a = Math.random() * 0.8 + 0.1;
  let x = Math.random() * 0.8 + 0.1;

  if (a <= x) {
    a += PiE;
    x -= PiE;
  } else {
    a -= PiE;
    x += PiE;
  }

  // ułatwienie: uporządkuj tak, by a <= x
  if (a > x) {
    [a, x] = [x, a];
  }

  // oblicz a/x i pobierz dużo cyfr po przecinku
  const value = a / x;

  // zyskaj precyzję -> 30 cyfr po przecinku (zapas)
  const fracPart = (value.toFixed(30).split('.')[1] || '').replace(/0+$/,'');
  const digits = (fracPart + '000000000000000000000000000000').slice(0, 30);

  // pierwsze 6 cyfr
  let first6 = digits.slice(0, 6);

  // kompresja: jeśli zaczyna od wielu zer, zostaw tylko jedno zero i uzupełnij kolejnymi cyframi
  const leadingZerosMatch = first6.match(/^0+/);
  if (leadingZerosMatch && leadingZerosMatch[0].length > 1) {
    const z = leadingZerosMatch[0].length;
    first6 = '0' + digits.slice(z, z + 5);
    if (first6.length < 6) first6 = first6.padEnd(6, '0');
  }

  // upewnij się że to 6-znakowy string (pad z przodu jeśli trzeba)
  first6 = first6.padStart(6, '0');

  return first6;
}
