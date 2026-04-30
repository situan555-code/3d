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

        // Check if we can use texImage2D with the element directly
        try {
            const gl = document.createElement('canvas').getContext('webgl');
            const tex = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, element);
            logs.push('texImage2D(element) success!');
        } catch(e) {
            logs.push('texImage2D(element) threw: ' + e.message);
        }

        // Check if we can use texImage2D with ElementImage
        try {
            const gl = document.createElement('canvas').getContext('webgl');
            const tex = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, tex);
            const elementImage = c.captureElementImage(element);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, elementImage);
            logs.push('texImage2D(elementImage) success!');
        } catch(e) {
            logs.push('texImage2D(elementImage) threw: ' + e.message);
        }

        return logs.join('\n');
    });
    
    console.log(result);
    await browser.close();
})();
