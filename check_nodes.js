const fs = require('fs');
const { NodeIO } = require('@gltf-transform/core');
const { KHRDracoMeshCompression } = require('@gltf-transform/extensions');
const draco3d = require('draco3d');

async function run() {
  const io = new NodeIO()
    .registerExtensions([KHRDracoMeshCompression])
    .registerDependencies({
      'draco3d.decoder': await draco3d.createDecoderModule(),
      'draco3d.encoder': await draco3d.createEncoderModule(),
    });

  const doc = await io.read('public/office_desk.glb');
  const root = doc.getRoot();
  
  let found = false;
  root.listNodes().forEach(n => {
    if (n.getName() && n.getName().includes('Photo')) {
      console.log('Found node:', n.getName());
      found = true;
    }
  });
  if (!found) {
    console.log('No photo nodes found in office_desk.glb');
  }
}
run().catch(console.error);
