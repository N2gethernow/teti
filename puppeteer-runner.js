const fs = require('fs');
const puppeteer = require('puppeteer');

const ua = 'Mozilla/5.0 (Linux; Android 8.0.0; Nexus 5X Build/OPR4.170623.006) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3756.0 Mobile Safari/537.36';

const NETWORK_PRESETS = {
    Good3G: {
        offline: false,
        downloadThroughput: 1.5 * 1024 * 1024 / 8,
        uploadThroughput: 750 * 1024 / 8,
        latency: 40
    },
    Regular3G: {
        offline: false,
        downloadThroughput: 750 * 1024 / 8,
        uploadThroughput: 250 * 1024 / 8,
        latency: 100
    }
};

const NETWORK_PRESET = process.argv.includes('--regular3G') ? NETWORK_PRESETS.Regular3G : NETWORK_PRESETS.Good3G;
const TTI_FLAG = process.argv.includes('--tti');

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
    await client.send('Network.emulateNetworkConditions', NETWORK_PRESET);
    await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.setUserAgent(ua);
    await page.setDefaultTimeout(60 * 1000);
    // await page.setCookie({
    //     name: 'gdpr_permission_given',
    //     value: '1',
    //     url: 'https://allegro.pl/',
    // });
    // await page.evaluateOnNewDocument(longTaskObserverCode);

    await page.evaluateOnNewDocument(`
    !function(){if('PerformanceLongTaskTiming' in window){var g=window.__tti={e:[]};
g.o=new PerformanceObserver(function(l){g.e=g.e.concat(l.getEntries())});
g.o.observe({entryTypes:['longtask']})}}();
${fs.readFileSync(require.resolve('tti-polyfill'))}`);
    await page.goto(url);
    const {
        timing,
        paint,
        mark
    } = TTI_FLAG ?
    await page.evaluate(async () => ({
        timing: JSON.stringify(window.performance.timing),
        paint: JSON.stringify(performance.getEntriesByType('paint')),
        mark: JSON.stringify(
            performance.getEntriesByType('mark')
                .concat({ name: 'time-to-interactive', startTime: await window.ttiPolyfill.getFirstConsistentlyInteractive() })
        )
    })) :
    await page.evaluate(async () => ({
        timing: JSON.stringify(window.performance.timing),
        paint: JSON.stringify(performance.getEntriesByType('paint')),
        mark: JSON.stringify(performance.getEntriesByType('mark'))
    }));

    await page.close();
    await browser.close();

    return new Promise(resolve => {
        resolve({
            timing: JSON.parse(timing),
            paint: JSON.parse(paint),
            mark: JSON.parse(mark)
        });
    });
};
