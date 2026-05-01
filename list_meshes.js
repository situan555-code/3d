const fs = require('fs');
const { NodeIO } = require('@gltf-transform/core');

async function run() {
  const io = new NodeIO();
  const document = await io.read('public/office_desk.glb');
  const root = document.getRoot();
  
  const meshes = root.listMeshes();
  meshes.forEach(m => {
    console.log('Mesh:', m.getName());
    const prims = m.listPrimitives();
    prims.forEach(p => {
      const mat = p.getMaterial();
      console.log('  Material:', mat ? mat.getName() : 'None');
    });
  });
}
run().catch(console.error);
