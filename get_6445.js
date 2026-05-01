import { execSync } from 'child_process';
const out = execSync('git show 6445d35:src/components/WicgHitbox.tsx').toString();
console.log("Includes dispatch?", out.includes('dispatchToUI'));
console.log("Includes createRoot?", out.includes('createRoot'));
console.log("Includes PortalRenderer?", out.includes('portalState'));
