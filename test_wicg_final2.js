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
        logs.push('Canvas size: ' + c.width + 'x' + c.height);
        logs.push('Canvas layoutsubtree: ' + c.getAttribute('layoutsubtree'));
        
        if (c.children.length > 0) {
           logs.push('PortalNode is present.');
           logs.push('PortalNode child count: ' + c.children[0].children.length);
           logs.push('PortalNode CSS Transform: ' + c.children[0].style.transform);
        } else {
           logs.push('PortalNode is missing!');
        }

        return logs.join('\n');
    });
    
    console.log(result);
    await browser.close();
})();
