const fs = require('fs');
const { NodeIO } = require('@gltf-transform/core');
const { KHRTextureTransform, KHRMaterialsSpecular, KHRMaterialsIOR, KHRMaterialsVolume } = require('@gltf-transform/extensions');

async function run() {
  const io = new NodeIO().registerExtensions([KHRTextureTransform, KHRMaterialsSpecular, KHRMaterialsIOR, KHRMaterialsVolume]);
  const doc = await io.read('public/office_desk.glb');
  
  // Deduplicate accessors to save space
  const { dedup, draco, textureCompress } = require('@gltf-transform/functions');
  const sharp = require('sharp');
  
  await doc.transform(
    textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 75 }),
    dedup(),
    draco()
  );

  await io.write('public/office_desk_compressed.glb', doc);
  console.log('Finished writing compressed GLB.');
}
run().catch(console.error);
