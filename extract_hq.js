const { Document, NodeIO } = require('@gltf-transform/core');
const { KHRONOS_EXTENSIONS } = require('@gltf-transform/extensions');
const { prune } = require('@gltf-transform/functions');
const draco3d = require('draco3d');

async function extract() {
  const io = new NodeIO()
    .registerExtensions(KHRONOS_EXTENSIONS)
    .registerDependencies({
      'draco3d.decoder': await draco3d.createDecoderModule(),
      'draco3d.encoder': await draco3d.createEncoderModule()
    });

  const doc = await io.read('./public/office_assets.glb');
  
  const root = doc.getRoot();
  const keep = ['Object_10', 'Object_70', 'Object_71'];
  
  // Find nodes to discard
  for (const node of root.listNodes()) {
    if (!keep.includes(node.getName())) {
      node.dispose();
    }
  }
  
  await doc.transform(prune());
  
  await io.write('./public/office_assets_hq.glb', doc);
  console.log('Successfully extracted HQ parts to office_assets_hq.glb');
}
extract().catch(console.error);
