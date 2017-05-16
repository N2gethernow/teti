const phantom = require('phantom');

module.exports = async function (url) {
    const instance = await phantom.create();
    const page = await instance.createPage();
    await page.open(url);
    const { connectStart, domInteractive, domComplete } = await page.evaluate(function () {
        return window.performance.timing;
    });
    await instance.exit();

    return { connectStart, domInteractive, domComplete };
};
