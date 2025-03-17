const puppeteer = require('puppeteer');
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

interface QTEntry {
    event: string;
    age: string;
    gender: string;
    bodyweightDivision: string;
    qt: string;
}

interface QTData {
    [event: string]: {
        [ageGroup: string]: {
            [gender: string]: {
                bodyweightDivision: string;
                qt: string;
            }[];
        };
    };
}

async function downloadPDF(url: string, outputPath: string): Promise<void> {
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'arraybuffer'
    });
    fs.writeFileSync(outputPath, response.data);
}

async function scrapePDF(): Promise<void> {
    try {
        // URL of the PDF
        const pdfUrl = 'https://assets.contentstack.io/v3/assets/blteb7d012fc7ebef7f/blt27dfc33809f96138/67a24eed1d94b55671050113/2025_-_Qualifying_Totals_-_New_Bodyweight_Classes_-_for_the_membership_team_(1).pdf';
        
        console.log('Downloading PDF...');
        await downloadPDF(pdfUrl, 'temp.pdf');
        console.log('PDF downloaded successfully');
        
        // Use pdf-parse to extract text content
        const pdfParse = require('pdf-parse');
        const dataBuffer = fs.readFileSync('temp.pdf');
        
        console.log('Parsing PDF...');
        const data = await pdfParse(dataBuffer);
        
        // Log the raw text for debugging
        console.log('Raw PDF text:');
        console.log(data.text);
        
        const lines: string[] = data.text
            .split('\n')
            .map((line: string) => line.trim())
            .filter((line: string) => line.length > 0);
        
        const entries: QTEntry[] = [];
        let currentEvent = '';
        let currentAge = '';
        let currentGender = '';
        
        for (const line of lines) {
            // Skip the header lines
            if (line.includes('EventAge') || line.includes('Gender') || line.includes('Bodyweight Division')) {
                continue;
            }

            // Match event, age and gender lines
            if (line.match(/^(VWS|VWF|Youth|Junior|National Championship)/)) {
                const parts = line.trim().split(/\s+/);
                if (parts.length >= 3) {
                    currentEvent = parts[0];
                    currentAge = parts[1];
                    currentGender = parts[2];

                    // Convert age groups
                    switch(currentAge) {
                        case '13&U': currentAge = 'U13'; break;
                        case '14-15yo': currentAge = 'U15'; break;
                        case '16-17yo': currentAge = 'U17'; break;
                        case 'Masters35': currentAge = 'Masters35'; break;
                        default: currentAge = currentAge;
                    }
                    continue;
                }
            }

            // Match weight class and QT (they're in columns)
            const weightQTMatch = line.match(/(\d+(?:\+)?kg)\s+(\d+)/);
            if (weightQTMatch && currentEvent && currentAge && currentGender) {
                const [_, weightClass, qt] = weightQTMatch;
                entries.push({
                    event: currentEvent,
                    age: currentAge,
                    gender: currentGender,
                    bodyweightDivision: formatWeightClass(weightClass),
                    qt: qt
                });
            }
        }
        
        console.log('Total entries found:', entries.length);
        
        // Organize data
        const organizedData: QTData = {};
        
        entries.forEach(entry => {
            if (!organizedData[entry.event]) {
                organizedData[entry.event] = {};
            }
            
            if (!organizedData[entry.event][entry.age]) {
                organizedData[entry.event][entry.age] = {};
            }
            
            if (!organizedData[entry.event][entry.age][entry.gender]) {
                organizedData[entry.event][entry.age][entry.gender] = [];
            }
            
            organizedData[entry.event][entry.age][entry.gender].push({
                bodyweightDivision: entry.bodyweightDivision,
                qt: entry.qt
            });
        });

        // Generate TypeScript output
        let tsOutput = 'export const qualifyingTotals = {\n';
        
        Object.entries(organizedData).forEach(([event, ageGroups], eventIndex, eventArr) => {
            tsOutput += `  ${event}: {\n`;
            
            Object.entries(ageGroups).forEach(([ageGroup, genders], ageIndex, ageArr) => {
                tsOutput += `    ${ageGroup}: {\n`;
                
                Object.entries(genders).forEach(([gender, weightClasses], genderIndex, genderArr) => {
                    tsOutput += `      ${gender}: [\n`;
                    weightClasses.forEach((wc, wcIndex) => {
                        tsOutput += `        {bodyweightDivision: "${wc.bodyweightDivision}", qt: "${wc.qt}"}${wcIndex < weightClasses.length - 1 ? ',' : ''}\n`;
                    });
                    tsOutput += `      ]${genderIndex < Object.keys(genders).length - 1 ? ',' : ''}\n`;
                });
                
                tsOutput += `    }${ageIndex < Object.keys(ageGroups).length - 1 ? ',' : ''}\n`;
            });
            
            tsOutput += `  }${eventIndex < eventArr.length - 1 ? ',' : ''}\n`;
        });
        
        tsOutput += '} as const;\n\n';
        tsOutput += 'export type QTEvent = keyof typeof qualifyingTotals;\n';
        tsOutput += 'export type QTAgeGroup = keyof typeof qualifyingTotals[QTEvent];\n';
        tsOutput += 'export type QTGender = keyof typeof qualifyingTotals[QTEvent][QTAgeGroup];\n';
        tsOutput += 'export type QTWeightClass = typeof qualifyingTotals[QTEvent][QTAgeGroup][QTGender][number];\n';

        // Save as TypeScript file
        fs.writeFileSync('qt_data.ts', tsOutput);
        console.log('Data has been successfully scraped and saved to qt_data.ts');
        
        // Clean up temporary PDF file
        fs.unlinkSync('temp.pdf');
        
    } catch (error) {
        console.error('Error occurred while scraping:', error);
        if (error instanceof Error) {
            console.error('Error stack:', error.stack);
        }
    }
}

// Add this helper function at the top level of the file
function formatWeightClass(weightClass: string): string {
    if (weightClass.includes('+')) {
        // Extract the number and add the plus sign in front
        const number = weightClass.replace(/\+kg$/, '');
        return `+${number}kg`;
    }
    return weightClass;
}

// Run the scraper
scrapePDF().catch(console.error); 