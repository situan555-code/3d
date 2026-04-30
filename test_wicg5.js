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
    await page.waitForSelector('canvas', { timeout: 5000 });

    const result = await page.evaluate(async () => {
        const c = document.querySelector('canvas');
        const element = c.children[0];
        const logs = [];

        try {
            // Append bridgeCanvas to body so it gets layout
            const bridgeCanvas = document.createElement('canvas');
            bridgeCanvas.width = 1024;
            bridgeCanvas.height = 768;
            bridgeCanvas.setAttribute('layoutsubtree', '');
            document.body.appendChild(bridgeCanvas);

            // Move element to bridgeCanvas
            bridgeCanvas.appendChild(element);

            // Wait a moment for layout
            await new Promise(r => setTimeout(r, 100));

            const bridgeCtx = bridgeCanvas.getContext('2d');
            bridgeCtx.drawElementImage(element, 0, 0, 1024, 768);
            logs.push('bridgeCtx.drawElementImage(element) success on appended canvas!');
            
        } catch(e) {
            logs.push('bridgeCtx.drawElementImage(element) threw: ' + e.message);
        }

        return logs.join('\n');
    });
    
    console.log(result);
    await browser.close();
})();
