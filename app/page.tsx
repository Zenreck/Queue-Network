"use client"

import { useEffect, useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Users, Clock, ArrowRight } from "lucide-react"

interface QueueState {
  userId: string
  position: number
  totalUsers: number
  isWaiting: boolean
  timeRemaining: number
}

export default function QueuePage() {
  const [queueState, setQueueState] = useState<QueueState>({
    userId: "",
    position: 0,
    totalUsers: 0,
    isWaiting: false,
    timeRemaining: 30,
  })

  const [isRedirecting, setIsRedirecting] = useState(false)
  const countdownRef = useRef<NodeJS.Timeout | null>(null)
  const isCountdownActiveRef = useRef(false)

  useEffect(() => {
    let userId = localStorage.getItem("queueUserId")
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem("queueUserId", userId)
    }

    setQueueState((prev) => ({ ...prev, userId }))

    // Join the queue via API
    const joinQueue = async () => {
      try {
        const response = await fetch("/api/queue/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        })

        if (response.ok) {
          const data = await response.json()
          console.log("[v0] Joined queue:", data)
        }
      } catch (error) {
        console.error("[v0] Failed to join queue:", error)
      }
    }

    joinQueue()
  }, [])

  useEffect(() => {
    if (!queueState.userId) return

    const manageQueue = async () => {
      try {
        const response = await fetch("/api/queue/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: queueState.userId }),
        })

        if (response.ok) {
          const data = await response.json()

          setQueueState((prev) => ({
            ...prev,
            position: data.position || 1,
            totalUsers: data.totalInQueue || 1,
            isWaiting: !data.canProceed,
          }))

          if ((data.canProceed || data.shouldStartCountdown) && !isCountdownActiveRef.current) {
            startCountdown()
          } else if (!data.canProceed && isCountdownActiveRef.current && !data.shouldStartCountdown) {
            // Stop countdown if user needs to wait
            if (countdownRef.current) {
              clearInterval(countdownRef.current)
              countdownRef.current = null
              isCountdownActiveRef.current = false
            }
            setQueueState((prev) => ({ ...prev, timeRemaining: 30 }))
          }
        }
      } catch (error) {
        console.error("[v0] Failed to get queue status:", error)
      }
    }

    const startCountdown = () => {
      if (isCountdownActiveRef.current) return

      isCountdownActiveRef.current = true
      let timeLeft = 30
      setQueueState((prev) => ({ ...prev, timeRemaining: timeLeft }))

      countdownRef.current = setInterval(() => {
        timeLeft -= 1
        setQueueState((prev) => ({ ...prev, timeRemaining: timeLeft }))

        if (timeLeft <= 0) {
          if (countdownRef.current) {
            clearInterval(countdownRef.current)
            countdownRef.current = null
            isCountdownActiveRef.current = false
          }
          setIsRedirecting(true)

          fetch("/api/queue/complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: queueState.userId }),
          }).catch(console.error)

          setTimeout(() => {
            window.location.href = "https://nexto-network.vercel.app/"
          }, 1000)
        }
      }, 1000)
    }

    // Initial queue check
    manageQueue()

    // Set up interval to continuously check queue status
    const interval = setInterval(manageQueue, 2000) // Check every 2 seconds

    return () => {
      clearInterval(interval)
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
        countdownRef.current = null
        isCountdownActiveRef.current = false
      }
    }
  }, [queueState.userId])

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (queueState.userId) {
        // Use sendBeacon for reliable cleanup on page unload
        navigator.sendBeacon("/api/queue/leave", JSON.stringify({ userId: queueState.userId }))
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [queueState.userId])

  if (isRedirecting) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <h2 className="text-xl font-semibold">Redirecting...</h2>
              <p className="text-muted-foreground">Taking you to Nexto Network</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Users className="h-6 w-6" />
            Queue System
          </CardTitle>
          <CardDescription>Managing access to ensure optimal experience</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {queueState.isWaiting ? (
            <>
              <div className="flex items-center gap-6 p-4 bg-muted/50 rounded-lg">
                <div className="text-center">
                  <div className="text-5xl font-bold text-primary">{queueState.position}</div>
                  <p className="text-xs text-muted-foreground mt-1">Your Position</p>
                </div>
                <div className="flex-1 text-center">
                  <div className="text-2xl font-semibold">of {queueState.totalUsers}</div>
                  <p className="text-sm text-muted-foreground">people in queue</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {queueState.position === 1 ? "You're next!" : `${queueState.position - 1} ahead of you`}
                  </p>
                </div>
              </div>

              <div className="text-center">
                <div className="animate-pulse flex items-center justify-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Please wait your turn...</span>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg text-sm">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {queueState.totalUsers} in queue
                </span>
                <span className="font-medium">Position #{queueState.position}</span>
              </div>

              <div className="text-center space-y-4">
                <div className="text-6xl font-bold text-primary">{queueState.timeRemaining}</div>
                <p className="text-lg font-medium">
                  Redirecting in {queueState.timeRemaining} second{queueState.timeRemaining !== 1 ? "s" : ""}
                </p>
              </div>

              <Progress value={((30 - queueState.timeRemaining) / 30) * 100} className="w-full" />

              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <span>Taking you to Nexto Network</span>
                <ArrowRight className="h-4 w-4" />
              </div>
            </>
          )}

          <div className="pt-4 border-t">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>User ID: {queueState.userId.slice(-8)}</span>
              <span>
                {queueState.totalUsers} active user{queueState.totalUsers !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
