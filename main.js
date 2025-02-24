const Apify = require('apify');
const { createObjectCsvWriter } = require('csv-writer');

Apify.main(async () => {
    // Load input data (list of company names)
    const input = await Apify.getInput();
    const companies = input.companies;

    // Initialize CSV writer
    const csvWriter = createObjectCsvWriter({
        path: 'output.csv',
        header: [
            { id: 'company', title: 'Company' },
            { id: 'website', title: 'Website' },
            { id: 'emails', title: 'Emails' },
        ],
    });

    const results = [];

    // Launch Puppeteer browser
    const browser = await Apify.launchPuppeteer();
    const page = await browser.newPage();

    for (const company of companies) {
        try {
            // Step 1: Search for the company website
            const searchQuery = `${company} official website`;
            await page.goto(`https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`, { timeout: 60000 });
            await page.waitForSelector('h3', { timeout: 60000 });

            // Extract the first search result URL
            const website = await page.evaluate(() => {
                const result = document.querySelector('h3')?.closest('a')?.href;
                return result || null;
            });

            if (!website) {
                console.log(`No website found for: ${company}`);
                results.push({ company, website: 'Not found', emails: 'Not found' });
                continue;
            }

            // Step 2: Scrape