import fs from 'fs';
const file = fs.readFileSync('public/office_desk.glb');
const jsonLength = file.readUInt32LE(12);
const jsonChunk = file.slice(20, 20 + jsonLength).toString('utf8');
const data = JSON.parse(jsonChunk);

let obj10 = data.nodes.find(n => n.name === 'Object_10');
if (obj10 && obj10.children) {
  let childrenNames = obj10.children.map(idx => data.nodes[idx].name);
  console.log("Children of Object_10:", childrenNames.length);
  console.log(childrenNames.slice(0, 10));
}
