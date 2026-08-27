import { readFileSync } from 'node:fs'
import Anthropic from '@anthropic-ai/sdk'
import { jsonSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/json-schema'

const apiKey = process.env.ANTHROPIC_API_KEY
if (!apiKey) {
  console.error('Set ANTHROPIC_API_KEY')
  process.exit(1)
}

const pdfPath = process.argv[2]
if (!pdfPath) {
  console.error('Usage: node --env-file=.env scripts/test-claude-pdf-vision.mjs <path-to.pdf>')
  process.exit(1)
}

const buffer = readFileSync(pdfPath)
const client = new Anthropic({ apiKey })

const response = await client.messages.parse({
  model: process.env.CLAUDE_MODEL || 'claude-sonnet-5',
  max_tokens: 2048,
  messages: [
    {
      role: 'user',
      content: [
        {
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: buffer.toString('base64'),
          },
        },
        {
          type: 'text',
          text: 'Read this nursing resume PDF visually and extract raw_resume_text plus first_name, last_name, email, phone.',
        },
      ],
    },
  ],
  output_config: {
    format: jsonSchemaOutputFormat({
      type: 'object',
      additionalProperties: false,
      properties: {
        raw_resume_text: { type: 'string' },
        first_name: { type: 'string' },
        last_name: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
      },
    }),
  },
})

console.log(JSON.stringify(response.parsed_output, null, 2))
