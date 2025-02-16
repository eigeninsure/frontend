import 'server-only'

import { Database } from '@/lib/db_types'
import { StreamingTextResponse } from 'ai'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { nanoid } from '@/lib/utils'

export const runtime = 'edge'

export async function POST(req: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient<Database>({
      cookies: () => cookieStore,
    })

    const json = await req.json()
    const { messages, previewToken } = json
    const session = cookieStore.get('session')
    const userId = session?.value
    
    if (!userId) {
      return new Response('Unauthorized', { status: 401 })
    }

    // Remove single prompt extraction since we'll use full history
    // const prompt = messages[messages.length - 1].content

    const regularPrompt = `You are EigenSurance, an AI-powered insurance assistant for home insurance via EigenLayer and Metamask. Introduce yourself the first time and guide users.
    Flows:
    - **Buy Insurance:** Ask if they want to buy insurance, purchase the insurance as soon as the coverage amount / home value is provided (optional home details, description/images/home ownership contract).
    - **Submit Claims:** Ask if they want to file a claim, process the claim as soon as the damage amount is provided (optional gather accident info, description, police reports, photos).
    Always answer in this format precisely (no prefix or suffix to this):
    { "text": "response", "toolCall": { "name": "tool", "arguments": [args] } }
    If no tool is used, "toolCall" is null.

    Tools:
    - **buyInsurance:** Parameters: homeDescription (non-empty string), coverageAmountUSD (positive number)
    - **claimInsurance:** Parameters: claimDescription (non-empty string), claimAmount (positive number)
`

    // Log the full message history for debugging
    console.log("Sending request to generation API with messages:", messages)

    // Call your custom API endpoint with full message history
    const apiResponse = await fetch("http://localhost:8000/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        messages: messages,  // Send the entire message history
        system: regularPrompt 
      }),
    })

    console.log("API response status:", apiResponse.status)
    if (!apiResponse.ok) {
      const errorText = await apiResponse.text()
      console.error("Error response from generation API:", errorText)
      return new Response("Error from generation API", { status: apiResponse.status })
    }

    // Expect your endpoint to return JSON with a "content" property.
    const result = await apiResponse.json()
    console.log("API response result:", result)
    if (!result || typeof result.text !== "string") {
      console.error("Invalid API response shape:", result)
      return new Response("Invalid API response", { status: 500 })
    }
    const text = result.text

    const responseText = JSON.stringify({
      text: result.text,
      toolCall: result.toolCall
    })

    // Save the completed chat to the database.
    const title = text.substring(0, 100)
    const id = json.id ?? nanoid()
    const createdAt = Date.now()
    const path = `/chat/${id}`
    const payload = {
      id,
      title,
      userId,
      createdAt,
      path,
      messages: [
        ...messages,
        {
          content: text,
          role: 'assistant',
        },
      ],
    }

    // Create a ReadableStream that first sends an empty chunk then the complete text.
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Immediately enqueue an empty chunk.
          controller.enqueue(encoder.encode(""))
          // Wait briefly to simulate streaming.
          await new Promise(resolve => setTimeout(resolve, 50))
          // Enqueue the full text.
          controller.enqueue(encoder.encode(responseText))
          controller.close()
        } catch (err) {
          console.error("Streaming error:", err)
          controller.error(err)
        }
      },
    })

    return new StreamingTextResponse(stream)
  } catch (err: unknown) {
    console.error(
      "Error in POST handler:",
      err,
      JSON.stringify(err, Object.getOwnPropertyNames(err))
    )
    return new Response("Internal Server Error", { status: 500 })
  }
}