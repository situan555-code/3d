const fs = require('fs');
const { NodeIO } = require('@gltf-transform/core');
const { KHRDracoMeshCompression } = require('@gltf-transform/extensions');
const draco3d = require('draco3dgltf');

async function run() {
  const io = new NodeIO()
    .registerExtensions([KHRDracoMeshCompression])
    .registerDependencies({
      'draco3d.decoder': await draco3d.createDecoderModule(),
      'draco3d.encoder': await draco3d.createEncoderModule(),
    });

  const doc = await io.read('public/office_assets.glb');
  const root = doc.getRoot();
  const meshes = root.listMeshes();
  console.log("Found meshes:", meshes.length);
  for (const m of meshes.slice(0, 10)) {
    console.log(m.getName());
  }
  const photoMeshes = meshes.filter(m => m.getName() && m.getName().includes('Photo'));
  console.log("Photo meshes:");
  photoMeshes.forEach(m => console.log(m.getName()));
}
run().catch(console.error);
