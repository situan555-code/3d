import fs from 'fs';
const file = fs.readFileSync('public/office_desk.glb');
const str = file.toString('utf8');
// Just find all strings that look like names in the GLTF JSON
// The JSON chunk is at the beginning of the GLB
const jsonLength = file.readUInt32LE(12);
const jsonChunk = file.slice(20, 20 + jsonLength).toString('utf8');
const data = JSON.parse(jsonChunk);
const nodes = data.nodes.map(n => n.name).filter(n => n);
console.log(nodes);
