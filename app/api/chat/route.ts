import 'server-only'
import {StreamingTextResponse } from 'ai'
import { Configuration, OpenAIApi } from 'openai-edge'
import { cookies } from 'next/headers'
import { nanoid } from 'nanoid'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/lib/db_types'

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY
})


    const json = await req.json()
    const { messages, previewToken } = json
    const userId = (await auth({ cookieStore }))?.user.id
    if (!userId) {
      return new Response('Unauthorized', { status: 401 })
    }

export async function POST(req: Request) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient<Database>({
    cookies: () => cookieStore
  })
  const json = await req.json()
  const { messages, previewToken } = json
  const session = cookieStore.get('session')
  const userId = session?.value

  if (!userId) {
    return new Response('Unauthorized', {
      status: 401
    const regularPrompt = `You are EigenSurance, an AI-powered insurance assistant for home insurance via EigenLayer and Metamask. Introduce yourself the first time and guide users.
    Flows:
    - **Buy Insurance:** Ask if they want to buy insurance, purchase the insurance as soon as the coverage amount / home value is provided (optional home details, description/images/home ownership contract).
    - **Submit Claims:** Ask if they want to file a claim, process the claim as soon as the damage amount is provided (optional gather accident info, description, police reports, photos).

    Always answer in this format precisely (no prefix or suffix to this):
    { "text": "response", "toolCall": { "name": "tool", "arguments": [args] } }
    If no tool is used, "toolCall" is null.

    Tools:
    - **buyInsurance:** Parameters: coverageAmountUSD (positive number)
    - **claimInsurance:** Parameters: claimDescription (non-empty string), claimAmount (positive number)
    `

    // Log the messages for debugging
    console.log("Sending request to generation API with messages:", messages)

    // Update the API call to send the full message history
    const apiResponse = await fetch("http://localhost:8000/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        messages: messages,  // Pass the entire messages array
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

    // Insert the chat into your database.
    await supabase.from('chats').upsert({ id, payload }).throwOnError()

    // Format the response as JSON
    const responseText = JSON.stringify({
      text: result.text,
      toolCall: result.toolCall
    })

    // Create a ReadableStream
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
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
