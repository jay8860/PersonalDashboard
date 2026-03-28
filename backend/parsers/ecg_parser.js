const fs = require('fs');

/**
 * Parses an Apple Health ECG CSV file.
 */
async function parseECG(filePath) {
    const data = fs.readFileSync(filePath, 'utf-8');
    const lines = data.split('\n');

    const metadata = {};
    const samples = [];
    let leadName = 'Lead I';
    let dataStarted = false;

    lines.forEach(line => {
        if (!line.trim()) return;

        if (!dataStarted) {
            const parts = line.split(',');
            if (parts.length >= 2) {
                const key = parts[0].trim();
                const value = parts.slice(1).join(',').replace(/"/g, '').trim();

                if (key === 'Recorded Date') metadata.date = value;
                if (key === 'Classification') metadata.classification = value;
                if (key === 'Sample Rate') metadata.hz = parseInt(value);
                if (key === 'Lead') leadName = value;
                if (key === 'Unit') metadata.unit = value;
            }

            // Typical ECG CSV has a specific header before values
            if (line.includes('Lead,') || (line.match(/^-?\d+\.\d+$/))) {
                dataStarted = true;
            }
        } else {
            const val = parseFloat(line.trim());
            if (!isNaN(val)) {
                samples.push(val);
            }
        }
    });

    return {
        type: 'electrocardiogram',
        metadata,
        leadName,
        samples: samples.slice(0, 5000) // Limit to first 5000 for visualization performance
    };
}

module.exports = { parseECG };
