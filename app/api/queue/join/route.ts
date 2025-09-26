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

    // Add user to queue with timestamp
    const timestamp = Date.now()
    await redis.zadd("queue", { score: timestamp, member: userId })

    // Set user as active with 30 second expiry
    await redis.setex(`user:${userId}`, 30, timestamp.toString())

    // Get queue position and total count
    const queuePosition = await redis.zrank("queue", userId)
    const totalInQueue = await redis.zcard("queue")

    return Response.json({
      success: true,
      position: queuePosition !== null ? queuePosition + 1 : 1,
      totalInQueue,
      userId,
    })
  } catch (error) {
    console.error("Queue join error:", error)
    return Response.json({ error: "Failed to join queue" }, { status: 500 })
  }
}
