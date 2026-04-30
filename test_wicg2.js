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
    await page.waitForSelector('canvas', { timeout: 5000 }).catch(() => console.log('no canvas'));

    const result = await page.evaluate(async () => {
        const c = document.querySelector('canvas');
        if (!c) return 'No canvas found';
        
        const element = c.children[0];
        const bridgeCanvas = document.createElement('canvas');
        bridgeCanvas.width = 1024;
        bridgeCanvas.height = 768;
        const bridgeCtx = bridgeCanvas.getContext('2d');
        const logs = [];

        try {
            if (c.captureElementImage) {
                const elementImage = c.captureElementImage(element);
                logs.push('captureElementImage returned: ' + elementImage);
                
                try {
                    const bitmap = await createImageBitmap(elementImage);
                    logs.push('createImageBitmap success');
                    bridgeCtx.drawImage(bitmap, 0, 0);
                    logs.push('drawImage(bitmap) success');
                } catch(e) {
                    logs.push('createImageBitmap threw: ' + e.message);
                    try {
                        bridgeCtx.drawImage(elementImage, 0, 0);
                        logs.push('drawImage(elementImage) success');
                    } catch(e2) {
                        logs.push('drawImage(elementImage) threw: ' + e2.message);
                    }
                }
            }
        } catch(e) {
            logs.push('Fatal: ' + e.message);
        }
        
        return logs.join('\n');
    });
    
    console.log(result);
    await browser.close();
})();
