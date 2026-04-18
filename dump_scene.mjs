import { NodeIO } from '@gltf-transform/core';

const io = new NodeIO();

async function inspectModel(path, label) {
  const doc = await io.read(path);
  console.log(`\n====== ${label} ======`);
  
  const scenes = doc.getRoot().listScenes();
  for (const scene of scenes) {
    console.log(`Scene: "${scene.getName()}"`);
    const children = scene.listChildren();
    for (const child of children) {
      printNode(child, 0);
    }
  }
}

function printNode(node, depth) {
  const indent = '  '.repeat(depth);
  const name = node.getName();
  const t = node.getTranslation();
  const r = node.getRotation();
  const s = node.getScale();
  const mesh = node.getMesh();
  
  const hasTransform = t.some(v => v !== 0) || r[0] !== 0 || r[1] !== 0 || r[2] !== 0 || r[3] !== 1 || s.some(v => v !== 1);
  
  let line = `${indent}[${mesh ? 'MESH' : 'GROUP'}] "${name}"`;
  if (hasTransform) {
    line += ` T:[${t.map(v=>v.toFixed(3)).join(',')}] R:[${r.map(v=>v.toFixed(3)).join(',')}] S:[${s.map(v=>v.toFixed(3)).join(',')}]`;
  }
  
  if (mesh) {
    const prims = mesh.listPrimitives();
    for (const prim of prims) {
      const posAccessor = prim.getAttribute('POSITION');
      if (posAccessor) {
        const arr = posAccessor.getArray();
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;
        for (let i = 0; i < arr.length; i += 3) {
          minX = Math.min(minX, arr[i]);   maxX = Math.max(maxX, arr[i]);
          minY = Math.min(minY, arr[i+1]); maxY = Math.max(maxY, arr[i+1]);
          minZ = Math.min(minZ, arr[i+2]); maxZ = Math.max(maxZ, arr[i+2]);
        }
        line += ` Bounds:X[${minX.toFixed(3)},${maxX.toFixed(3)}] Y[${minY.toFixed(3)},${maxY.toFixed(3)}] Z[${minZ.toFixed(3)},${maxZ.toFixed(3)}]`;
      }
      const mat = prim.getMaterial();
      if (mat) line += ` Mat:${mat.getName()}`;
    }
  }
  
  console.log(line);
  
  const children = node.listChildren();
  for (const child of children) {
    printNode(child, depth + 1);
  }
}

await inspectModel('./public/office_desk.glb', 'office_desk.glb');
