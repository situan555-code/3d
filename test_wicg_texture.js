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
    
    page.on('console', msg => {
      console.log('PAGE LOG:', msg.text());
    });

    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
    
    await page.waitForSelector('canvas', { timeout: 5000 }).catch(e => console.log('no canvas'));
    await new Promise(r => setTimeout(r, 2000));

    const result = await page.evaluate(async () => {
        const c = document.querySelector('canvas');
        if (!c) return 'No canvas';
        
        const logs = [];
        const element = c.children[0];
        
        // Grab WebGL Context
        const gl = c.getContext('webgl2') || c.getContext('webgl');
        if (!gl) return 'No WebGL context found on the canvas.';
        
        try {
            const tex = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, tex);
            
            // Allocate texture memory FIRST (WICG API usually requires this)
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1024, 768, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            
            // Setup parameters
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            
            logs.push('Texture allocated and bound.');

            if (gl.texElementImage2D) {
                logs.push('Trying texElementImage2D...');
                gl.texElementImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, element);
                logs.push('texElementImage2D SUCCESS');
            } else {
                logs.push('texElementImage2D not available on gl context.');
            }
        } catch (e) {
            logs.push('WebGL throw: ' + e.message);
        }

        return logs.join('\n');
    });
    
    console.log(result);
    await browser.close();
})();
