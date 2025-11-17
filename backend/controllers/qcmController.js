const fs = require("fs");
const pdfParse = require("pdf-parse");
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
            { 
              text: `Tu es un expert en création de QCM. Génère UNIQUEMENT un QCM valide en JSON (strictement valide, parsable) à partir de ce texte. 

IMPORTANT: Retourne UNIQUEMENT du JSON valide, rien d'autre. Pas de texte avant ou après.

Format JSON requis:
{
  "questions": [
    {
      "question": "Texte de la question?",
      "options": [
        {"text": "Option A"},
        {"text": "Option B"},
        {"text": "Option C"},
        {"text": "Option D"}
      ],
      "answer": {"text": "La bonne réponse"}
    }
  ]
}

Texte du PDF:
${text}` 
            }
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

    let resultText = response.data.candidates[0].content.parts.map(p => p.text).join("");
    
    // Nettoyer les marqueurs de code
    resultText = resultText.replace(/```json/g, "").replace(/```/g, "").trim();
    
    // Extraire JSON entre { et }
    const jsonMatch = resultText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ 
        error: "Aucun JSON trouvé dans la réponse Gemini", 
        raw: resultText.substring(0, 200) 
      });
    }
    
    resultText = jsonMatch[0];

    let qcm;
    try {
      qcm = JSON.parse(resultText);
    } catch (parseErr) {
      return res.status(500).json({ 
        error: "Erreur JSON Gemini: " + parseErr.message, 
        raw: resultText.substring(0, 300) 
      });
    }

    res.json({ qcm });
  } catch (err) {
    console.error("Erreur Gemini API:", err.response?.data ?? err.message);
    res.status(500).json({ error: err.message });
  }
};
