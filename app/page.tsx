"use client"

import { useEffect, useState } from "react"
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
    timeRemaining: 15,
  })

  const [isRedirecting, setIsRedirecting] = useState(false)

  // Generate or get user ID
  useEffect(() => {
    let userId = localStorage.getItem("queueUserId")
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem("queueUserId", userId)
    }

    setQueueState((prev) => ({ ...prev, userId }))
  }, [])

  // Queue management logic
  useEffect(() => {
    if (!queueState.userId) return

    const manageQueue = () => {
      // Get current active users from localStorage
      const activeUsers = JSON.parse(localStorage.getItem("activeUsers") || "[]")
      const currentTime = Date.now()

      // Remove users who haven't been active in the last 10 seconds
      const validUsers = activeUsers.filter((user: any) => currentTime - user.lastSeen < 10000)

      // Add or update current user
      const userIndex = validUsers.findIndex((user: any) => user.id === queueState.userId)
      if (userIndex >= 0) {
        validUsers[userIndex].lastSeen = currentTime
      } else {
        validUsers.push({
          id: queueState.userId,
          joinTime: currentTime,
          lastSeen: currentTime,
        })
      }

      // Sort by join time to maintain queue order
      validUsers.sort((a: any, b: any) => a.joinTime - b.joinTime)

      // Save updated active users
      localStorage.setItem("activeUsers", JSON.stringify(validUsers))

      // Determine user's position and if they need to wait
      const userPosition = validUsers.findIndex((user: any) => user.id === queueState.userId) + 1
      const shouldWait = validUsers.length > 1 && userPosition > 1

      setQueueState((prev) => ({
        ...prev,
        position: userPosition,
        totalUsers: validUsers.length,
        isWaiting: shouldWait,
      }))

      // If user is first in line or alone, start countdown
      if (!shouldWait && validUsers.length >= 1) {
        startCountdown()
      }
    }

    const startCountdown = () => {
      let timeLeft = 15
      setQueueState((prev) => ({ ...prev, timeRemaining: timeLeft }))

      const countdown = setInterval(() => {
        timeLeft -= 1
        setQueueState((prev) => ({ ...prev, timeRemaining: timeLeft }))

        if (timeLeft <= 0) {
          clearInterval(countdown)
          setIsRedirecting(true)

          // Clean up user from active users before redirect
          const activeUsers = JSON.parse(localStorage.getItem("activeUsers") || "[]")
          const filteredUsers = activeUsers.filter((user: any) => user.id !== queueState.userId)
          localStorage.setItem("activeUsers", JSON.stringify(filteredUsers))

          // Redirect after a brief delay
          setTimeout(() => {
            window.location.href = "https://nexto-network.vercel.app"
          }, 1000)
        }
      }, 1000)
    }

    // Initial queue check
    manageQueue()

    // Set up interval to continuously manage queue
    const interval = setInterval(manageQueue, 1000)

    return () => {
      clearInterval(interval)
    }
  }, [queueState.userId])

  // Cleanup on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      const activeUsers = JSON.parse(localStorage.getItem("activeUsers") || "[]")
      const filteredUsers = activeUsers.filter((user: any) => user.id !== queueState.userId)
      localStorage.setItem("activeUsers", JSON.stringify(filteredUsers))
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
              <div className="text-center space-y-2">
                <div className="text-3xl font-bold text-primary">#{queueState.position}</div>
                <p className="text-sm text-muted-foreground">Your position in queue</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Users ahead of you:</span>
                  <span className="font-medium">{queueState.position - 1}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Total users:</span>
                  <span className="font-medium">{queueState.totalUsers}</span>
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
              <div className="text-center space-y-4">
                <div className="text-6xl font-bold text-primary">{queueState.timeRemaining}</div>
                <p className="text-lg font-medium">
                  Redirecting in {queueState.timeRemaining} second{queueState.timeRemaining !== 1 ? "s" : ""}
                </p>
              </div>

              <Progress value={((15 - queueState.timeRemaining) / 15) * 100} className="w-full" />

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
