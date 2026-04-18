import { NodeIO } from '@gltf-transform/core';

const io = new NodeIO();
const doc = await io.read('./public/office_-_assets.glb');

console.log('====== FULL SCENE HIERARCHY ======\n');

const scenes = doc.getRoot().listScenes();
for (const scene of scenes) {
  for (const child of scene.listChildren()) {
    printNode(child, 0);
  }
}

function printNode(node, depth) {
  const indent = '  '.repeat(depth);
  const name = node.getName();
  const t = node.getTranslation();
  const r = node.getRotation();
  const s = node.getScale();
  const mesh = node.getMesh();
  
  let line = `${indent}[${mesh ? 'MESH' : 'GROUP'}] "${name}"`;
  line += ` T:[${t.map(v=>v.toFixed(2)).join(',')}]`;
  
  if (mesh) {
    const prims = mesh.listPrimitives();
    for (const prim of prims) {
      const mat = prim.getMaterial();
      if (mat) line += ` Mat:${mat.getName()}`;
      const pos = prim.getAttribute('POSITION');
      if (pos) {
        const arr = pos.getArray();
        let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity,minZ=Infinity,maxZ=-Infinity;
        for(let i=0;i<arr.length;i+=3){
          minX=Math.min(minX,arr[i]);maxX=Math.max(maxX,arr[i]);
          minY=Math.min(minY,arr[i+1]);maxY=Math.max(maxY,arr[i+1]);
          minZ=Math.min(minZ,arr[i+2]);maxZ=Math.max(maxZ,arr[i+2]);
        }
        line += ` Size:[${(maxX-minX).toFixed(3)},${(maxY-minY).toFixed(3)},${(maxZ-minZ).toFixed(3)}]`;
      }
    }
  }
  
  console.log(line);
  
  for (const child of node.listChildren()) {
    printNode(child, depth + 1);
  }
}
