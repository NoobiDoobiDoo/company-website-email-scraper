const Apify = require('apify');
const { createObjectCsvWriter } = require('csv-writer');

Apify.main(async () => {
    try {
        // Load input data (list of company names)
        const input = await Apify.getInput();
        const companies = input.companies;

        if (!companies || !Array.isArray(companies)) {
            throw new Error('Input must contain an array of company names under the "companies" key.');
        }

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
                console.log(`Processing: ${company}`);

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

                console.log(`Found website for ${company}: ${website}`);

                // Step 2: Scrape emails from the website
                await page.goto(website, { timeout: 60000 });
                const emails = await page.evaluate(() => {
                    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
                    const bodyText = document.body.innerText;
                    const emails = bodyText.match(emailRegex) || [];
                    return [...new Set(emails)]; // Remove duplicates
                });

                console.log(`Found emails for ${company}: ${emails.join(', ')}`);

                // Save results
                results.push({
                    company,
                    website,
                    emails: emails.join(', '), // Combine multiple emails into a single string
                });
            } catch (error) {
                console.error(`Error processing ${company}:`, error);
                results.push({ company, website: 'Error