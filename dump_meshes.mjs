import { NodeIO } from '@gltf-transform/core';

const io = new NodeIO();
async function run() {
  const file1 = './office_desk.glb';
  const file2 = './office_-_assets.glb';
  
  const doc1 = await io.read(file1);
  console.log('Nodes in office_desk.glb:');
  doc1.getRoot().listNodes().forEach(n => {
    const name = n.getName().toLowerCase();
    if (name.includes('screen') || name.includes('monitor') || name.includes('display') || name.includes('mac') || name.includes('pc') || name.includes('glass')) {
      console.log('  - ' + n.getName());
    }
  });

  const doc2 = await io.read(file2);
  console.log('\nNodes in office_-_assets.glb:');
  doc2.getRoot().listNodes().forEach(n => {
    const name = n.getName().toLowerCase();
    if (name.includes('screen') || name.includes('monitor') || name.includes('display') || name.includes('mac') || name.includes('pc') || name.includes('glass') || name.includes('computer')) {
      console.log('  - ' + n.getName());
    }
  });
}

run().catch(console.error);
