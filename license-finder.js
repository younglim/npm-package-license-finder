import fs from 'fs';
import path from 'path';
import csvWriter from 'csv-writer';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fetch from 'npm-registry-fetch';
import axios from 'axios';
import * as tar from 'tar';
import https from 'https';
import { pipeline } from 'stream';
import { promisify } from 'util';
import zlib from 'zlib';

const pipelineAsync = promisify(pipeline);

// Get the current directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get the file path and output file from command line arguments
const inputPath = process.argv[2];
const outputPath = process.argv[3];
if (!inputPath || !outputPath) {
    console.error('Please provide the path to package-lock.json and the output CSV file as arguments.');
    process.exit(1);
}

const packageLockPath = path.resolve(inputPath);
const outputCsvPath = path.resolve(outputPath);

// Read package-lock.json
fs.readFile(packageLockPath, 'utf8', async (err, data) => {
    if (err) {
        console.error('Error reading package-lock.json:', err);
        process.exit(1);
    }

    try {
        // Parse JSON data
        const packageLock = JSON.parse(data);
        const dependencies = packageLock.packages;

        if (!dependencies || Object.keys(dependencies).length === 0) {
            console.error('No dependencies found in package-lock.json');
            process.exit(1);
        }

        // Extract dependencies and licenses
        const records = [];
        const licenseCounts = {};
        const unknownLicenses = [];

        // Add the root package information
        if (dependencies[""] && dependencies[""].name && dependencies[""].license) {
            const license = dependencies[""].license;
            records.push({ dependency: dependencies[""].name, license, homepage: 'No homepage available', tarballUrl: 'No tarball link available' });
            licenseCounts[license] = (licenseCounts[license] || 0) + 1;
        }

        for (const [name, details] of Object.entries(dependencies)) {
            if (name !== "" && details && typeof details === 'object') {
                let license = details.license || 'UNKNOWN';
                let homepage = details.homepage || 'No homepage available';
                let tarballUrl = details.resolved || 'No tarball link available';

                if (license === 'UNKNOWN') {
                    const packageName = name.replace('node_modules/', '').split('/').pop();
                    try {
                        console.log(`Querying npm registry for package: ${packageName}`);
                        const response = await fetch.json(`/${packageName}`);
                        license = response.license || 'UNKNOWN';
                        homepage = response.homepage || homepage;

                        if (license === 'UNKNOWN' && response.homepage) {
                            const homepageUrl = response.homepage.replace(/#.*$/, '').replace(/\/$/, '');
                            const githubApiUrl = homepageUrl.replace(/github\.com\//, 'api.github.com/repos/');
                            try {
                                console.log(`Querying GitHub API for license information: ${githubApiUrl}/license`);
                                const githubResponse = await axios.get(`${githubApiUrl}/license`);
                                if (githubResponse.data && githubResponse.data.license) {
                                    license = githubResponse.data.license.spdx_id || 'UNKNOWN';
                                    console.log(`License found on GitHub for ${packageName}: ${license}`);
                                }
                            } catch (githubError) {
                                if (githubError.response && githubError.response.status === 404) {
                                    console.error(`GitHub repository not found for ${packageName}: ${githubApiUrl}`);
                                } else {
                                    console.error(`Error fetching license from GitHub for ${packageName}:`, githubError.message);
                                }
                            }
                        }

                        if (license === 'UNKNOWN' && details.resolved) {
                            tarballUrl = details.resolved;
                            const tarballDir = path.join(__dirname, packageName);
                            if (!fs.existsSync(tarballDir)) {
                                fs.mkdirSync(tarballDir, { recursive: true });
                            }
                            const tarballPath = path.join(tarballDir, `${packageName}.tgz`);
                            try {
                                console.log(`Downloading tarball from: ${tarballUrl}`);
                                const tarballStream = fs.createWriteStream(tarballPath);
                                try {
                                    const response = await axios({ method: 'get', url: tarballUrl, responseType: 'stream' });
                                    await new Promise((resolve, reject) => {
                                        response.data.pipe(tarballStream);
                                        tarballStream.on('finish', resolve);
                                        tarballStream.on('error', reject);
                                    });
                                } catch (downloadError) {
                                    throw new Error(`Error downloading tarball for ${packageName}: ${downloadError.message}`);
                                }

                                console.log(`Extracting tarball for package: ${packageName} to ${tarballDir}`);
                                await tar.extract({
                                    file: tarballPath,
                                    cwd: tarballDir,
                                    filter: (p) => p.includes('package/package.json'),
                                });

                                const packageJsonPath = path.join(tarballDir, 'package', 'package.json');
                                if (fs.existsSync(packageJsonPath)) {
                                    const packageJsonData = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                                    if (packageJsonData.license) {
                                        license = packageJsonData.license;
                                        console.log(`License found in package.json for ${packageName}: ${license}`);
                                    } else if (packageJsonData.licenses && Array.isArray(packageJsonData.licenses)) {
                                        license = packageJsonData.licenses.map(lic => lic.type).join(',');
                                        console.log(`Licenses found in package.json for ${packageName}: ${license}`);
                                    }
                                }

                                // Cleanup extracted files
                                if (fs.existsSync(tarballDir)) {
                                    fs.rmSync(tarballDir, { recursive: true, force: true });
                                }
                                if (fs.existsSync(tarballPath)) {
                                    fs.unlinkSync(tarballPath);
                                }
                            } catch (tarballError) {
                                console.error(`Error downloading or extracting tarball for ${packageName}:`, tarballError.message);
                            }
                        }
                    } catch (apiError) {
                        if (apiError.statusCode === 404) {
                            console.log(`Package not found on npm registry: ${packageName}`);
                            continue; // Skip adding to records if npm package not found
                        } else {
                            console.error(`Error fetching license for ${packageName} from npmjs:`, apiError.message);
                        }
                    }
                }

                records.push({ dependency: name, license, homepage, tarballUrl });
                licenseCounts[license] = (licenseCounts[license] || 0) + 1;

                if (license === 'UNKNOWN') {
                    unknownLicenses.push({ name, homepage, tarballUrl });
                }
            }
        }

        // Write CSV file
        const writer = csvWriter.createObjectCsvWriter({
            path: outputCsvPath,
            header: [
                { id: 'dependency', title: 'Dependency' },
                { id: 'license', title: 'License' },
                { id: 'homepage', title: 'Homepage' },
                { id: 'tarballUrl', title: 'Tarball URL' },
            ],
        });

        writer
            .writeRecords(records)
            .then(() => {
                console.log(`License information has been written to ${outputCsvPath}`);

                // Output license counts
                console.log('License\tCounts:');
                for (const [license, count] of Object.entries(licenseCounts)) {
                    console.log(`${license}\t${count}`);
                }

                // Output unknown licenses with module names, homepage, and tarball link
                if (unknownLicenses.length > 0) {
                    console.log('\nModules with UNKNOWN licenses:');
                    unknownLicenses.forEach(({ name, homepage, tarballUrl }) => {
                        console.log(`${name}\tHomepage: ${homepage}\tTarball: ${tarballUrl}`);
                    });
                }
            })
            .catch((error) => {
                console.error('Error writing to CSV:', error);
                process.exit(1);
            });
    } catch (parseError) {
        console.error('Error parsing package-lock.json:', parseError);
        process.exit(1);
    }
});
