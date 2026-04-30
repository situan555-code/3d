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
            const gl = document.createElement('canvas').getContext('webgl');
            const tex = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, tex);
            if (gl.texElementImage2D) {
                gl.texElementImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, element);
                logs.push('texElementImage2D(element) success!');
            } else {
                logs.push('texElementImage2D is not a function');
            }
        } catch(e) {
            logs.push('texElementImage2D(element) threw: ' + e.message);
        }

        return logs.join('\n');
    });
    
    console.log(result);
    await browser.close();
})();
