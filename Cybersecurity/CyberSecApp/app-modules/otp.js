const PiE = (Math.PI - 0.2) - (Math.E + 0.2);

export function generatePassword() {

  let a = Math.random() * 0.8 + 0.1;
  let x = Math.random() * 0.8 + 0.1;

  if (a <= x) {
    a += PiE;
    x -= PiE;
  } else {
    a -= PiE;
    x += PiE;
  }

  if (a > x) {
    [a, x] = [x, a];
  }

  const value = a / x;

  const fracPart = (value.toFixed(30).split('.')[1] || '').replace(/0+$/,'');
  const digits = (fracPart + '000000000000000000000000000000').slice(0, 30);

  let first6 = digits.slice(0, 6);

  const leadingZerosMatch = first6.match(/^0+/);
  if (leadingZerosMatch && leadingZerosMatch[0].length > 1) {
    const z = leadingZerosMatch[0].length;
    first6 = '0' + digits.slice(z, z + 5);
    if (first6.length < 6) first6 = first6.padEnd(6, '0');
  }

  first6 = first6.padStart(6, '0');

  return first6;
}
