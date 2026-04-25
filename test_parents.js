const fs = require('fs');
const { Document, NodeIO } = require('@gltf-transform/core');
const { KHRONOS_EXTENSIONS } = require('@gltf-transform/extensions');
const draco3d = require('draco3d');
async function run() {
  const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS).registerDependencies({
    'draco3d.decoder': await draco3d.createDecoderModule()
  });
  const doc = await io.read('./public/office_assets.glb');
  const root = doc.getRoot();
  
  const glass = root.listNodes().find(n => n.getName() === 'Monitor_ScreenGlass.001');
  if (glass) {
    console.log('Monitor_ScreenGlass.001 parent is:', glass.getParentNode() ? glass.getParentNode().getName() : 'ROOT');
  }
}
run();
