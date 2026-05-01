import fs from 'fs';
const file = fs.readFileSync('public/office_desk.glb');
const jsonLength = file.readUInt32LE(12);
const jsonChunk = file.slice(20, 20 + jsonLength).toString('utf8');
const data = JSON.parse(jsonChunk);

let monitorHtmlIndex = -1;
data.nodes.forEach((n, i) => { if(n.name === 'Monitor_HTML') monitorHtmlIndex = i; });

let parentNode = null;
data.nodes.forEach((n, i) => {
  if (n.children && n.children.includes(monitorHtmlIndex)) {
    parentNode = n;
  }
});
console.log("Parent of Monitor_HTML:", parentNode ? parentNode.name : "None (Root)");
