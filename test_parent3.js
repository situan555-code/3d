import fs from 'fs';
const file = fs.readFileSync('public/office_desk.glb');
const jsonLength = file.readUInt32LE(12);
const jsonChunk = file.slice(20, 20 + jsonLength).toString('utf8');
const data = JSON.parse(jsonChunk);

let part1Index = data.nodes.findIndex(n => n.name === 'Object_26_Restored_Part_1');
if (part1Index !== -1) {
  let parent = data.nodes.find(n => n.children && n.children.includes(part1Index));
  console.log("Parent of Object_26_Restored_Part_1:", parent ? parent.name : "None");
} else {
  // Let's find any Object_26_Restored_Part
  let part = data.nodes.findIndex(n => n.name && n.name.includes('Object_26_Restored_Part'));
  let parent = data.nodes.find(n => n.children && n.children.includes(part));
  console.log("Parent of a restored part:", parent ? parent.name : "None", "Part was index", part);
}
