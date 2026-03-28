const fs = require('fs');
const readline = require('readline');

/**
 * Parses Apple Health export.xml or export_cda.xml using a stream-based approach.
 * This prevents memory issues with large files (500MB+).
 * @param {string} filePath Path to the XML file.
 * @returns {Promise<Object>} Extracted health data.
 */
async function parseAppleHealth(filePath) {
    const fileStream = fs.createReadStream(filePath);

    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    // Mapping relevant HK Types to our internal keys
    const typeMapping = {
        'HKQuantityTypeIdentifierHeartRate': 'heartRate',
        'HKQuantityTypeIdentifierRestingHeartRate': 'restingHeartRate',
        'HKQuantityTypeIdentifierHeartRateVariabilitySDNN': 'heartRateVariabilitySDNN',
        'HKQuantityTypeIdentifierWalkingHeartRateAverage': 'walkingHeartRateAverage',
        'HKQuantityTypeIdentifierHeartRateRecoveryOneMinute': 'heartRateRecoveryOneMinute',
        'HKQuantityTypeIdentifierRespiratoryRate': 'respiratoryRate',
        'HKQuantityTypeIdentifierVO2Max': 'vo2Max',
        'HKQuantityTypeIdentifierOxygenSaturation': 'oxygenSaturation',
        'HKQuantityTypeIdentifierBodyTemperature': 'bodyTemperature',

        'HKQuantityTypeIdentifierStepCount': 'stepCount',
        'HKQuantityTypeIdentifierDistanceWalkingRunning': 'distanceWalkingRunning',
        'HKQuantityTypeIdentifierFlightsClimbed': 'flightsClimbed',
        'HKQuantityTypeIdentifierActiveEnergyBurned': 'activeEnergyBurned',
        'HKQuantityTypeIdentifierBasalEnergyBurned': 'basalEnergyBurned',
        'HKQuantityTypeIdentifierAppleExerciseTime': 'appleExerciseTime',
        'HKQuantityTypeIdentifierAppleStandTime': 'standTime',

        'HKQuantityTypeIdentifierBodyMass': 'bodyMass',
        'HKQuantityTypeIdentifierBodyFatPercentage': 'bodyFatPercentage',
        'HKQuantityTypeIdentifierHeight': 'height',
        'HKQuantityTypeIdentifierBodyMassIndex': 'bodyMassIndex',
        'HKQuantityTypeIdentifierLeanBodyMass': 'leanBodyMass',
        'HKQuantityTypeIdentifierWaistCircumference': 'waistCircumference',

        'HKQuantityTypeIdentifierBloodPressureSystolic': 'bloodPressureSystolic',
        'HKQuantityTypeIdentifierBloodPressureDiastolic': 'bloodPressureDiastolic',
        'HKQuantityTypeIdentifierBloodGlucose': 'bloodGlucose',

        'HKQuantityTypeIdentifierWalkingSpeed': 'walkingSpeed',
        'HKQuantityTypeIdentifierWalkingStepLength': 'walkingStepLength',
        'HKQuantityTypeIdentifierWalkingAsymmetryPercentage': 'walkingAsymmetryPercentage',
        'HKQuantityTypeIdentifierWalkingDoubleSupportPercentage': 'walkingDoubleSupportPercentage',

        'HKQuantityTypeIdentifierEnvironmentalAudioExposure': 'environmentalAudioExposure',
        'HKQuantityTypeIdentifierHeadphoneAudioExposure': 'headphoneAudioExposure',

        'HKQuantityTypeIdentifierDietaryEnergyConsumed': 'dietaryEnergyConsumed',
        'HKQuantityTypeIdentifierDietaryWater': 'dietaryWater'
    };

    // Regex
    const typeRegex = /type="([^"]+)"/;
    const valueRegex = /value="([^"]+)"/;
    const startDateRegex = /startDate="([^"]+)"/;
    const endDateRegex = /endDate="([^"]+)"/;
    const sourceNameRegex = /sourceName="([^"]+)"/;

    // Aggregates
    // dailyAggregates[day] = { 
    //   date: 'YYYY-MM-DD',
    //   metrics: { [key]: { sum, count, min, max, bySource: { [sourceName]: val } } },
    //   sleepIntervals: [] 
    // }
    const dailyAggregates = {};

    const getDayKey = (dateStr) => dateStr.substring(0, 10);

    return new Promise((resolve, reject) => {
        rl.on('line', (line) => {
            if (!line.includes('<Record')) return;

            const typeMatch = line.match(typeRegex);
            if (!typeMatch) return;
            const type = typeMatch[1];
            const mappedKey = typeMapping[type];

            // Check for Sleep Category
            const isSleep = type === 'HKCategoryTypeIdentifierSleepAnalysis';

            if (!mappedKey && !isSleep) return;

            const dateMatch = line.match(startDateRegex);
            if (!dateMatch) return;
            const day = getDayKey(dateMatch[1]);

            if (!dailyAggregates[day]) {
                dailyAggregates[day] = { date: day, metrics: {}, sleepIntervals: [] };
            }

            // 1. Handle Quantitative Data
            if (mappedKey) {
                const valueMatch = line.match(valueRegex);
                const sourceMatch = line.match(sourceNameRegex);
                if (valueMatch) {
                    const val = parseFloat(valueMatch[1]);
                    if (!isNaN(val)) {
                        if (!dailyAggregates[day].metrics[mappedKey]) {
                            dailyAggregates[day].metrics[mappedKey] = { sum: 0, count: 0, min: val, max: val, bySource: {} };
                        }
                        const m = dailyAggregates[day].metrics[mappedKey];

                        // Default Aggregation (Sum/Count)
                        m.sum += val;
                        m.count += 1;
                        if (val < m.min) m.min = val;
                        if (val > m.max) m.max = val;

                        // Source-based Aggregation (for Deduplication)
                        const source = sourceMatch ? sourceMatch[1] : 'Unknown';
                        if (!m.bySource[source]) m.bySource[source] = 0;
                        m.bySource[source] += val;
                    }
                }
            }

            // 2. Handle Sleep
            if (isSleep) {
                const valueMatch = line.match(valueRegex);
                const endDateMatch = line.match(endDateRegex);

                if (valueMatch && endDateMatch) {
                    const sleepValue = valueMatch[1];
                    // Only count actual sleep states
                    const isAsleep = sleepValue.includes('Asleep') || ['3', '4', '5'].includes(sleepValue);

                    if (isAsleep) {
                        const start = new Date(dateMatch[1]);
                        const end = new Date(endDateMatch[1]);
                        dailyAggregates[day].sleepIntervals.push({ start, end });
                    }
                }
            }
        });

        rl.on('close', () => {
            // Processing
            const history = Object.values(dailyAggregates)
                .map(dayData => {
                    const processedDay = { date: dayData.date };

                    // Process Metrics (with Deduplication logic for Steps)
                    Object.keys(dayData.metrics).forEach(key => {
                        const m = dayData.metrics[key];

                        // For Steps and Distance: Prioritize Watch, fallback to iPhone/Other
                        if (['stepCount', 'distanceWalkingRunning', 'activeEnergyBurned'].includes(key)) {
                            const sources = Object.keys(m.bySource);
                            const watchSource = sources.find(s => s.toLowerCase().includes('watch'));

                            if (watchSource) {
                                // Use ONLY Watch data if available
                                processedDay[key] = { sum: m.bySource[watchSource], count: 1 };
                            } else {
                                // If no Watch, usually assume the highest single source is the "primary" tracker, or sum all distinct?
                                // Summing all distinct sources is risky (Double Counting). 
                                // Best heuristics: use the source with the highest total value (most active tracker).
                                const maxSource = sources.reduce((a, b) => m.bySource[a] > m.bySource[b] ? a : b);
                                processedDay[key] = { sum: m.bySource[maxSource], count: 1 };
                            }
                        } else {
                            // For Vitals (HR, etc.), we usually want the Aggregate (Average of all samples)
                            processedDay[key] = { sum: m.sum, count: m.count, min: m.min, max: m.max };
                        }
                    });

                    // Process Sleep (Union of Intervals)
                    if (dayData.sleepIntervals.length > 0) {
                        // Sort by start time
                        const sorted = dayData.sleepIntervals.sort((a, b) => a.start - b.start);
                        let merged = [];
                        let current = sorted[0];

                        for (let i = 1; i < sorted.length; i++) {
                            const next = sorted[i];
                            if (next.start < current.end) {
                                // Overlap
                                current.end = new Date(Math.max(current.end, next.end));
                            } else {
                                merged.push(current);
                                current = next;
                            }
                        }
                        merged.push(current);

                        // Calculate total minutes
                        const totalMinutes = merged.reduce((acc, interval) => {
                            return acc + (interval.end - interval.start) / 1000 / 60;
                        }, 0);

                        processedDay.sleep = totalMinutes;
                    } else {
                        processedDay.sleep = null;
                    }

                    return processedDay;
                })
                .sort((a, b) => new Date(a.date) - new Date(b.date));

            const latest = history[history.length - 1] || {};

            const result = {
                history: history.slice(-365),
                latest: latest,
                metrics: {}
            };

            // Flatten latest
            Object.keys(latest).forEach(key => {
                if (key === 'date') return;
                if (typeof latest[key] === 'object') {
                    // For activity, we already set 'sum' as the de-duped value, so using sum/count is fine (count is 1)
                    // For vitals, sum/count is the average.
                    result.metrics[key] = latest[key].sum / latest[key].count;
                    if (['stepCount', 'activeEnergyBurned', 'distanceWalkingRunning', 'flightsClimbed'].includes(key)) {
                        result.metrics[key] = latest[key].sum;
                    }
                } else {
                    result.metrics[key] = latest[key];
                }
            });

            console.log(`Stream parsing complete. Processed ${history.length} days of history.`);
            resolve(result);
        });

        rl.on('error', (err) => {
            console.error("Stream parsing error:", err);
            reject(err);
        });
    });
}

module.exports = { parseAppleHealth };
