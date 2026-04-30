const puppeteer = require('puppeteer-core');

(async () => {
    const browser = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
        headless: "new",
        args: [
            '--enable-features=HTMLCanvasDrawElement,CanvasDrawElement',
            '--enable-blink-features=HTMLCanvasDrawElement,CanvasDrawElement'
        ]
    });
    
    const page = await browser.newPage();
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
    
    // Wait for canvas to be present
    await page.waitForSelector('canvas', { timeout: 5000 }).catch(() => console.log('no canvas'));

    // Inject a test to check if drawElementImage works
    const result = await page.evaluate(async () => {
        const c = document.querySelector('canvas');
        if (!c) return 'No canvas found';
        
        const element = c.children[0]; // portalNode
        if (!element) return 'No portalNode found inside canvas';

        const ctx = document.createElement('canvas').getContext('2d');
        const logs = [];
        
        logs.push(`Element size: ${element.clientWidth}x${element.clientHeight}`);
        logs.push(`Element HTML: ${element.innerHTML.substring(0, 50)}...`);
        logs.push(`Element Transform: ${element.style.transform}`);

        try {
            ctx.drawElementImage(element, 0, 0, 1024, 768);
            logs.push('drawElementImage success');
        } catch(e) {
            logs.push(`drawElementImage threw: ${e.message}`);
            
            if (c.captureElementImage) {
                try {
                    const img = c.captureElementImage(element);
                    logs.push(`captureElementImage success: ${img}`);
                } catch(e2) {
                    logs.push(`captureElementImage threw: ${e2.message}`);
                }
            } else {
                logs.push('captureElementImage NOT present');
            }
        }
        
        return logs.join('\n');
    });
    
    console.log(result);
    await browser.close();
})();
