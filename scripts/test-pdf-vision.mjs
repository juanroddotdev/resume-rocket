import { readFileSync } from 'node:fs'
import { GoogleGenAI, Type } from '@google/genai'

const apiKey = process.env.GEMINI_API_KEY
if (!apiKey) {
  console.error('Set GEMINI_API_KEY')
  process.exit(1)
}

const pdfPath = process.argv[2]
if (!pdfPath) {
  console.error('Usage: node --env-file=.env scripts/test-pdf-vision.mjs <path-to.pdf>')
  process.exit(1)
}

const buffer = readFileSync(pdfPath)
const ai = new GoogleGenAI({ apiKey })

const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: [
    {
      inlineData: {
        mimeType: 'application/pdf',
        data: buffer.toString('base64'),
      },
    },
    {
      text: 'Read this nursing resume PDF visually and extract raw_resume_text plus first_name, last_name, email, phone.',
    },
  ],
  config: {
    responseMimeType: 'application/json',
    responseJsonSchema: {
      type: Type.OBJECT,
      properties: {
        raw_resume_text: { type: Type.STRING },
        first_name: { type: Type.STRING },
        last_name: { type: Type.STRING },
        email: { type: Type.STRING },
        phone: { type: Type.STRING },
      },
    },
  },
})

console.log(response.text)
