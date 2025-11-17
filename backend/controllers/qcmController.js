const fs = require("fs");
const pdfParse = require("pdf-parse"); // ✅ version 1.1.1
const axios = require("axios");

exports.generateQCM = async (req, res) => {
  try {
    const fileBuffer = fs.readFileSync(req.file.path);
    const pdfData = await pdfParse(fileBuffer); 
    const text = pdfData.text;

    const body = {
      contents: [
        {
          parts: [
            { text: `Génère un QCM clair en JSON à partir de ce texte :\n\n${text}` }
          ],
          role: "user"
        }
      ],
      model: "gemini-2.5-flash"
    };

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${body.model}:generateContent`,
      body,
      {
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY
        }
      }
    );

    fs.unlinkSync(req.file.path);

    // ✅ Utiliser let pour pouvoir modifier
    let resultText = response.data.candidates[0].content.parts.map(p => p.text).join("");
    resultText = resultText.replace(/```json/g, "").replace(/```/g, "").trim();

    let qcm;
    try {
      qcm = JSON.parse(resultText);
    } catch (parseErr) {
      return res.status(500).json({ error: "Erreur JSON Gemini: " + parseErr.message, raw: resultText });
    }

    res.json({ qcm });
  } catch (err) {
    console.error("Erreur Gemini API:", err.response?.data ?? err.message);
    res.status(500).json({ error: err.message });
  }
};
