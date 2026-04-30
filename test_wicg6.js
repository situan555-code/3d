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
            // Three.js creates a WebGL context on c. We can grab it:
            const glContext = c.getContext('webgl2') || c.getContext('webgl');
            
            // Try to create and upload a texture directly to the main Three.js context!
            const tex = glContext.createTexture();
            glContext.bindTexture(glContext.TEXTURE_2D, tex);
            glContext.texElementImage2D(glContext.TEXTURE_2D, 0, glContext.RGBA, glContext.RGBA, glContext.UNSIGNED_BYTE, element);
            
            logs.push('Direct texElementImage2D on Three.js WebGL context SUCCESS!');
        } catch(e) {
            logs.push('Direct texElementImage2D threw: ' + e.message);
        }

        return logs.join('\n');
    });
    
    console.log(result);
    await browser.close();
})();
