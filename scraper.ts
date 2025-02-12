const puppeteer = require('puppeteer');
import * as fs from 'fs';
import * as path from 'path';

interface QTEntry {
    event: string;
    age: string;
    gender: string;
    bodyweightDivision: string;
    qt: string;
}

async function scrapePDF(): Promise<void> {
    const browser = await puppeteer.launch();
    try {
        const page = await browser.newPage();
        
        // URL of the PDF
        const pdfUrl = 'https://assets.contentstack.io/v3/assets/blteb7d012fc7ebef7f/blt7baa06f8d5ccf8e4/670827cb3104e83ec290ef14/2025_-_Nationals_QT.pdf';
        
        // Navigate to the PDF URL
        await page.goto(pdfUrl);
        
        // Wait for PDF to load and get its content
        const pdfBuffer = await page.pdf();
        
        // Save the PDF locally for processing
        fs.writeFileSync('temp.pdf', pdfBuffer);
        
        // Use pdf-parse to extract text content
        const pdfParse = require('pdf-parse');
        const dataBuffer = fs.readFileSync('temp.pdf');
        
        const data = await pdfParse(dataBuffer);
        const lines: string[] = data.text.split('\n').filter((line: string) => line.trim());
        
        const entries: QTEntry[] = [];
        
        // Process each line after headers
        let startProcessing = false;
        
        for (const line of lines) {
            if (line.includes('Event') && line.includes('Age') && line.includes('Gender')) {
                startProcessing = true;
                continue;
            }
            
            if (startProcessing && line.trim()) {
                const parts: string[] = line.split(/\s+/).filter((part: string) => part.trim());
                if (parts.length >= 5) {
                    entries.push({
                        event: parts[0],
                        age: parts[1],
                        gender: parts[2],
                        bodyweightDivision: parts[3],
                        qt: parts[4]
                    });
                }
            }
        }
        
        // Save the extracted data to a JSON file
        fs.writeFileSync('qt_data.json', JSON.stringify(entries, null, 2));
        console.log('Data has been successfully scraped and saved to qt_data.json');
        
        // Clean up temporary PDF file
        fs.unlinkSync('temp.pdf');
        
    } catch (error) {
        console.error('Error occurred while scraping:', error);
    } finally {
        await browser.close();
    }
}

// Run the scraper
scrapePDF().catch(console.error); 