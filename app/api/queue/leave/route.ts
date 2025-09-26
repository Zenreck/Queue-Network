import { Redis } from "@upstash/redis"

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

export async function POST(request: Request) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return Response.json({ error: "User ID is required" }, { status: 400 })
    }

    // Remove user from queue and cleanup
    await redis.zrem("queue", userId)
    await redis.del(`user:${userId}`)

    return Response.json({ success: true })
  } catch (error) {
    console.error("Queue leave error:", error)
    return Response.json({ error: "Failed to leave queue" }, { status: 500 })
  }
}
