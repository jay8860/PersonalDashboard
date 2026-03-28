const { GoogleGenerativeAI } = require("@google/generative-ai");
const { GoogleAIFileManager } = require("@google/generative-ai/server");
const fs = require('fs');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY);

/**
 * Uses Gemini to analyze a medical report (image or PDF).
 * Handles large files via File API.
 * @param {string} filePath Path to the file.
 * @param {string} mimeType File mime type.
 * @returns {Promise<Object>} AI analysis result.
 */
async function analyzeReport(filePath, mimeType) {
  const stats = fs.statSync(filePath);
  const fileSizeMB = stats.size / (1024 * 1024);

  let filePart;

  if (mimeType === 'text/plain' || filePath.toLowerCase().endsWith('.txt')) {
    // For text files, read content directly
    const textData = fs.readFileSync(filePath, 'utf-8');
    filePart = { text: textData };
  } else if (fileSizeMB > 15) {
    // Use File API for larger files
    console.log(`Large file detected (${fileSizeMB.toFixed(2)}MB). Using File API...`);
    const uploadResponse = await fileManager.uploadFile(filePath, {
      mimeType,
      displayName: "Medical Report",
    });

    // Wait for processing if it's a video/large file (though for images/PDFs it's usually instant)
    filePart = {
      fileData: {
        fileUri: uploadResponse.file.uri,
        mimeType: uploadResponse.file.mimeType,
      },
    };
  } else {
    // Use inline data for smaller files
    const fileData = fs.readFileSync(filePath);
    filePart = {
      inlineData: {
        data: fileData.toString("base64"),
        mimeType: mimeType
      }
    };
  }

  console.log("AI Service: Analyzing report using model gemini-2.0-flash...");
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `
    Analyze this medical report/prescription provided. 
    1. Extract key health vitals and lab results (e.g., Hemoglobin, Vitamin D, Cholesterol, etc.).
    2. Identify any values that are outside the normal range (flag as concern).
    3. Summarize the overall health status based on this document.
    4. Suggest next steps or areas to discuss with a doctor.
    5. Highlight things that are going well.
    
    IMPORTANT: If the report is very large or contains many pages, provide a comprehensive summary but keep the JSON structure exactly as requested.
    
    Format the response as JSON with the following structure:
    {
      "vitals": [{"name": "...", "value": "...", "unit": "...", "status": "normal/high/low"}],
      "summary": "...",
      "highlights": [{"title": "...", "desc": "...", "color": "rose/emerald/indigo"}],
      "concerns": ["..."],
      "positives": ["..."],
      "nextSteps": ["..."]
    }
    
    Only return the JSON.
  `;

  const result = await model.generateContent([prompt, filePart]);
  const response = await result.response;
  const text = response.text();

  // Extract JSON from the markdown code block if present
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }

  throw new Error("Failed to parse AI response as JSON");
}

module.exports = { analyzeReport };
