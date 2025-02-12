# QT PDF Scraper

This is a TypeScript-based scraper that extracts qualification data from a PDF document.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Build the TypeScript code:
```bash
npm run build
```

## Usage

Run the scraper:
```bash
npm start
```

The scraper will:
1. Download the PDF from the specified URL
2. Extract the data
3. Save the results to `qt_data.json`
4. Clean up temporary files

## Output

The data will be saved in `qt_data.json` with the following structure:
```json
[
  {
    "event": "Nationals",
    "age": "Open",
    "gender": "M/W",
    "bodyweightDivision": "weight",
    "qt": "qualifying total"
  }
]
``` 