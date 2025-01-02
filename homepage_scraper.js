import axios from 'axios';
import * as cheerio from 'cheerio';


export async function getPackageHomepage(packageName) {
    try {
        // Fetch package metadata from npm registry
        const npmApiUrl = `https://registry.npmjs.org/${encodeURIComponent(packageName)}`;
        const npmResponse = await axios.get(npmApiUrl);
        let homepage = npmResponse.data.homepage;

        // If homepage is not found in the npm registry response, fetch it from the npm page
        if (!homepage) {
            console.log(`Homepage not found in registry for ${packageName}. Trying to scrape npm page...`);
            const npmPageUrl = `https://www.npmjs.com/package/${encodeURIComponent(packageName)}`;
            const pageResponse = await axios.get(npmPageUrl);
            
            // Use cheerio to parse the HTML page
            const $ = cheerio.load(pageResponse.data);
            homepage = $('a[href^="http"]').first().attr('href'); // Extract first valid link
            
            if (!homepage) {
                console.log(`No homepage found for ${packageName} on npm page.`);
                homepage = 'No homepage available';
            }
        }

        return homepage;

    } catch (error) {
        console.error(`Error fetching homepage for ${packageName}:`, error.message);
        return 'No homepage available';
    }
}
