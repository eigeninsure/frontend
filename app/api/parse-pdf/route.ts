import { NextRequest, NextResponse } from 'next/server'
import { LlamaParse } from 'llama-parse'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const llamaParser = new LlamaParse({
      api_key: process.env.LLAMA_PARSE_API_KEY,
      result_type: "markdown"
    })

    // Convert File to buffer for LlamaParse
    const buffer = Buffer.from(await file.arrayBuffer())
    
    const result = await llamaParser.load_data(buffer)
    
    return NextResponse.json({ text: result[0].text })
    
  } catch (error) {
    console.error('PDF parsing error:', error)
    return NextResponse.json(
      { error: 'Error processing PDF' },
      { status: 500 }
    )
  }
} 