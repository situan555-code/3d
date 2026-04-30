const puppeteer = require('puppeteer-core');
const cp = require('child_process');

(async () => {
    // Start Canary with flags
    const browser = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
        headless: "new",
        args: [
            '--enable-features=HTMLCanvasDrawElement,CanvasDrawElement',
            '--enable-blink-features=HTMLCanvasDrawElement,CanvasDrawElement'
        ]
    });
    
    const page = await browser.newPage();
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2', timeout: 5000 }).catch(() => {});
    
    // Check if API is present
    const apiStatus = await page.evaluate(() => {
        const c = document.createElement('canvas').getContext('2d');
        const glCanvas = document.createElement('canvas');
        return {
            drawElementImage: typeof c.drawElementImage,
            drawElement: typeof c.drawElement,
            captureElementImage: typeof glCanvas.captureElementImage,
            drawWindow: typeof c.drawWindow
        };
    });
    console.log("APIs:", apiStatus);
    
    // Check if office_desk.glb is loaded
    const canvasExists = await page.evaluate(() => {
        return !!document.querySelector('canvas');
    });
    console.log("Canvas exists:", canvasExists);

    // Get logs
    const logs = await page.evaluate(() => {
        return window.localStorage ? "localStorage available" : "no";
    });
    
    await browser.close();
})();
