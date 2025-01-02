import fs from 'fs';
import csv from 'csv-parser';

function processCsvToTxt(inputCsvPath, termsCsvPath, outputTxtPath) {
    const licenseTerms = {};

    //match parentheses, quotation marks, "or", and "," and get the first occuring license
    function parseLicense(license) {
        if (!license) return 'No License Available';
        const match = license.match(/["(]([^")]+)["')]/);
        if (match) {
            return match[1].split(' OR ')[0].split(',')[0].trim();
        }
        return license.split(',')[0].trim();
    }

    fs.createReadStream(termsCsvPath)
        .pipe(csv())
        .on('data', (row) => {
            const license = parseLicense(row['License']);
            const terms = row['Terms'] || 'No Terms Available';
            licenseTerms[license] = terms;
        })
        .on('end', () => {

            const outputLines = [];

            
            fs.createReadStream(inputCsvPath)
                .pipe(csv())
                .on('data', (row) => {
                    const license = parseLicense(row['License']);
                    const author = row['Author'] || 'No Author Available';
                    const dependencyName = row['Dependency'] || 'No Dependency Available';
                    const termsFromCsv = row['Terms'] || ''; // Read the 'Terms' column from inputCsvPath
                    const finalTerms = termsFromCsv.trim() || licenseTerms[license] || 'No Terms Available';

                    //append the formatted string to the outputLines array
                    outputLines.push(`${license}\n--------------\n${dependencyName}\nCopyright (c) to ${author}\n${finalTerms}\n===========\n`);
                })
                .on('end', () => {
                    //join all lines and write to output file
                    fs.writeFileSync(outputTxtPath, outputLines.join('\n').trim());
                    console.log('Export completed successfully!');
                });
        });
}

//parse command-line arguments
const args = process.argv.slice(2);
if (args.length < 3) {
    console.error('Usage: node licensing.js <input_csv_path> <terms_csv_path> <output_txt_path>');
    process.exit(1);
}

const [inputCsvPath, termsCsvPath, outputTxtPath] = args;

processCsvToTxt(inputCsvPath, termsCsvPath, outputTxtPath);
