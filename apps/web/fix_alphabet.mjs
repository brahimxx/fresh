import fs from 'fs';

const validAlphabet = "vXY2bcTdefghijKlmnopqrsKtuAwxyzABCFGHIJDLMNOPQRSU6VWZ01345789".split('').filter((v,i,a) => a.indexOf(v)===i).join('');
console.log(validAlphabet, validAlphabet.length);

const standard62 = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
let remaining = standard62.split('').filter(c => !validAlphabet.includes(c));
let finalAlphabet = validAlphabet + remaining.join('');
console.log(finalAlphabet, finalAlphabet.length);

let content = fs.readFileSync('src/lib/id.js', 'utf8');
content = content.replace(/const ALPHABET = ".*?";/, `const ALPHABET = "${finalAlphabet}";`);
fs.writeFileSync('src/lib/id.js', content);
