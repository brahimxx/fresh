// src/lib/id.js
const ALPHABET = "vXY2bcTdefghijKlmnopqrstuAwxyzBCFGHIJDLMNOPQRSU6VWZ01345789akE";
const BASE = ALPHABET.length;
const OFFSET = 100000;

export function encodeId(num) {
  if (num === null || num === undefined) return num;
  let n = num;
  if (typeof num === 'string') {
    if (/^\d+$/.test(num)) n = parseInt(num, 10);
    else return num; // Return as-is if it's not purely numeric (already encoded)
  }
  if (isNaN(n) || n < 0) return num;
  n = n + OFFSET;
  let str = "";
  while (n > 0) {
    str = ALPHABET.charAt(n % BASE) + str;
    n = Math.floor(n / BASE);
  }
  return str;
}

export function decodeId(str) {
  if (!str || typeof str !== 'string') return str;
  if (/^\d+$/.test(str)) return Number(str);
  let num = 0;
  for (let i = 0; i < str.length; i++) {
    const charIndex = ALPHABET.indexOf(str.charAt(i));
    if (charIndex === -1) return str;
    num = num * BASE + charIndex;
  }
  return num - OFFSET;
}
