const fs = require('fs');
const xml2js = require('xml2js');

/**
 * Parses a CDA (Clinical Document Architecture) XML file.
 */
async function parseCDA(filePath) {
    const xml = fs.readFileSync(filePath, 'utf-8');
    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(xml);

    const doc = result.ClinicalDocument;
    const observations = [];

    // Navigate to components/structuredBody/component/section/entry/observation
    // Clinical documents can be complex, this is a simplified targeted extraction
    try {
        const components = doc.component.structuredBody.component;
        const sections = Array.isArray(components) ? components : [components];

        sections.forEach(sec => {
            const section = sec.section;
            if (!section || !section.entry) return;

            const entries = Array.isArray(section.entry) ? section.entry : [section.entry];
            entries.forEach(entry => {
                // Look for observations
                const obs = entry.observation || (entry.organizer && entry.organizer.component && entry.organizer.component.observation);
                if (!obs) return;

                const observationsList = Array.isArray(obs) ? obs : [obs];
                observationsList.forEach(o => {
                    observations.push({
                        name: o.code && o.code.$.displayName,
                        value: o.value && o.value.$.value,
                        unit: o.value && o.value.$.unit,
                        date: o.effectiveTime && o.effectiveTime.$.value,
                        status: o.statusCode && o.statusCode.$.code
                    });
                });
            });
        });
    } catch (e) {
        console.warn("CDA Parsing: Could not find structured body, returning partial data", e.message);
    }

    return {
        type: 'cda_document',
        title: doc.title || "Clinical Document",
        date: doc.effectiveTime && doc.effectiveTime.$.value,
        patient: doc.recordTarget && doc.recordTarget.patientRole && doc.recordTarget.patientRole.patient && doc.recordTarget.patientRole.patient.name,
        observations: observations.filter(o => o.name && o.value)
    };
}

module.exports = { parseCDA };
