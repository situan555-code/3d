import fs from 'fs';
const file = fs.readFileSync('public/office_desk.glb');
const str = file.toString('utf8');
const matches = str.match(/Monitor[A-Za-z0-9_]*/g);
const unique = [...new Set(matches)];
console.log(unique);
