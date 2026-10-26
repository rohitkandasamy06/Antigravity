const { spawn } = require('child_process');
const http = require('http');

async function run() {
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9444',
    '--window-size=1600,1000',
    '--user-data-dir=C:\\Users\\rohit\\AppData\\Local\\Temp\\chrome_debug_profile_2'
  ]);

  await new Promise(r => setTimeout(r, 1500));

  const listRes = await fetch('http://127.0.0.1:9444/json/list');
  const pages = await listRes.json();
  const page = pages.find(p => p.type === 'page');
  console.log('Target page:', page.url, page.webSocketDebuggerUrl);

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 1;

  function send(method, params = {}) {
    return new Promise((resolve) => {
      const msgId = id++;
      const handler = (event) => {
        const data = JSON.parse(event.data);
        if (data.id === msgId) {
          ws.removeEventListener('message', handler);
          resolve(data.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  ws.addEventListener('open', async () => {
    console.log('WS connected to Chrome');
    await send('Page.enable');
    await send('Runtime.enable');

    ws.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      if (data.method === 'Runtime.consoleAPICalled') {
        console.log('[BROWSER CONSOLE]', data.params.type, data.params.args.map(a => a.value || a.description));
      }
      if (data.method === 'Runtime.exceptionThrown') {
        console.error('[BROWSER EXCEPTION]', data.params.exceptionDetails);
      }
    });

    await send('Page.navigate', { url: 'http://localhost:3000' });
    await new Promise(r => setTimeout(r, 2000));

    // enter dashboard
    console.log('Calling enterDashboard()...');
    await send('Runtime.evaluate', { expression: 'enterDashboard()' });
    await new Promise(r => setTimeout(r, 1000));

    // navigate to regions
    console.log('Navigating to regions...');
    await send('Runtime.evaluate', { expression: 'navigateTo("regions")' });
    await new Promise(r => setTimeout(r, 1000));

    // inspect regionBarChart
    const evalResult = await send('Runtime.evaluate', {
      expression: `(() => {
        const c = charts.regionBar;
        if (!c) return 'No charts.regionBar';
        const meta = c.getDatasetMeta(0);
        return {
          hasData: c.data.datasets[0].data,
          bgColors: c.data.datasets[0].backgroundColor,
          dataCount: meta.data.length,
          canvasWidth: c.canvas.width,
          canvasHeight: c.canvas.height,
          firstBarProps: meta.data[0] ? {
            x: meta.data[0].x,
            y: meta.data[0].y,
            base: meta.data[0].base,
            width: meta.data[0].width,
            height: meta.data[0].height,
            backgroundColor: meta.data[0].options ? meta.data[0].options.backgroundColor : null
          } : null
        };
      })()`,
      returnByValue: true
    });
    console.log('regionBarChart evaluation:', JSON.stringify(evalResult, null, 2));

    // take screenshot of regions
    const shot = await send('Page.captureScreenshot');
    require('fs').writeFileSync('screenshot_regions.png', Buffer.from(shot.data, 'base64'));
    console.log('Saved screenshot_regions.png');

    // navigate to trends
    console.log('Navigating to trends...');
    await send('Runtime.evaluate', { expression: 'navigateTo("trends")' });
    await new Promise(r => setTimeout(r, 1000));

    const evalGrowth = await send('Runtime.evaluate', {
      expression: `(() => {
        const c = charts.growth;
        if (!c) return 'No charts.growth';
        const meta = c.getDatasetMeta(0);
        return {
          hasData: c.data.datasets[0].data,
          dataCount: meta.data.length,
          firstBarProps: meta.data[0] ? {
            x: meta.data[0].x,
            y: meta.data[0].y,
            base: meta.data[0].base,
            width: meta.data[0].width,
            height: meta.data[0].height,
            options: meta.data[0].options
          } : null
        };
      })()`,
      returnByValue: true
    });
    console.log('growthChart evaluation:', JSON.stringify(evalGrowth, null, 2));

    const shot2 = await send('Page.captureScreenshot');
    require('fs').writeFileSync('screenshot_trends.png', Buffer.from(shot2.data, 'base64'));
    console.log('Saved screenshot_trends.png');

    chrome.kill();
    process.exit(0);
  });
}

run().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
