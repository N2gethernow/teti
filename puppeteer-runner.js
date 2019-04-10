const puppeteer = require('puppeteer');

const ua = 'Mozilla/5.0 (Linux; Android 8.0.0; Nexus 5X Build/OPR4.170623.006) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3756.0 Mobile Safari/537.36';

module.exports = async function (url) {
    const browser = await puppeteer.launch({
        headless: true,
        defaultViewport: {
            width: 412,
            height: 732,
            deviceScaleFactor: 2,
            isMobile: true,
            hasTouch: true
        }
    });

    const page = await browser.newPage();
    const client = await page.target().createCDPSession();
    await client.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: 1.5 * 1024 * 1024 / 8,
        uploadThroughput: 750 * 1024 / 8,
        latency: 40
    });
    await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.setUserAgent(ua);
    await page.setDefaultTimeout(60 * 1000);
    // await page.setCookie({
    //     name: 'gdpr_permission_given',
    //     value: '1',
    //     url: 'https://allegro.pl/',
    // });
    // await page.evaluateOnNewDocument(longTaskObserverCode);

//     await page.evaluateOnNewDocument(`
//     !function(){if('PerformanceLongTaskTiming' in window){var g=window.__tti={e:[]};
// g.o=new PerformanceObserver(function(l){g.e=g.e.concat(l.getEntries())});
// g.o.observe({entryTypes:['longtask']})}}();`);
    await page.goto(url);
    // await page.addScriptTag({ path: require.resolve('tti-polyfill') });

    const { timing, paint, mark } = await page.evaluate(async () => ({
        timing: JSON.stringify(window.performance.timing),
        paint: JSON.stringify(performance.getEntriesByType('paint')),
        mark: JSON.stringify(
            performance.getEntriesByType('mark')
                // .concat({ name: 'time-to-interactive', startTime: await window.ttiPolyfill.getFirstConsistentlyInteractive() })
        )
    }));

    await page.close();
    await browser.close();

    return new Promise(resolve => {
        resolve({
            timing: JSON.parse(timing),
            paint: JSON.parse(paint),
            mark: JSON.parse(mark)
        });
    })
}
