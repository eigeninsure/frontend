import 'server-only'
import { StreamingTextResponse } from 'ai'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/lib/db_types'
import { auth } from '@/auth'
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
    const userId = (await auth({ cookieStore }))?.user.id
    if (!userId) {
      return new Response('Unauthorized', { status: 401 })
    }

    // Use the last message as the prompt.
    const prompt = messages[messages.length - 1].content

    const regularPrompt = `You are EigenSurance, an AI-powered insurance assistant for car insurance via EigenLayer and Metamask. Introduce yourself and guide users.
    Flows:
    - **New Insurance:** Ask if they want to buy insurance, get car details (description/images) to compute premium & coverage, then confirm.
    - **Claims:** Ask if they want to file a claim, gather accident info (description, reports, photos) and process the claim.

    For code/content >10 lines, use artifacts.

    Always answer in this format precisely (no prefix or suffix to this):
    { "text": "response", "toolCall": { "name": "tool", "arguments": [args] } }
    If no tool is used, "toolCall" is null.

    Tools:
    - **buyInsurance:** Parameters: depositAmountUSD (positive number), securedAmountUSD (positive number)
    - **claimInsurance:** Parameters: claimDescription (non-empty string), claimAmount (positive number)
    - **createDocument:** Parameters: title (string), kind (enum)
    - **updateDocument:** Parameters: id (string), description (string)
    `

    // Log the prompt details for debugging.
    console.log("Sending request to generation API with prompt:", prompt)

    // Call your custom API endpoint.
    const apiResponse = await fetch("http://localhost:8000/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages: [prompt], system: regularPrompt }),
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
          controller.enqueue(encoder.encode(text))
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
