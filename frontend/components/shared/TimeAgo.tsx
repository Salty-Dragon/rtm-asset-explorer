'use client'

import { useEffect, useState } from 'react'
import { formatTimeAgo } from '@/lib/formatters'

interface TimeAgoProps {
  timestamp: number | string | Date
  className?: string
}

export function TimeAgo({ timestamp, className }: TimeAgoProps) {
  const [timeAgo, setTimeAgo] = useState('')

  useEffect(() => {
    const updateTime = () => {
      setTimeAgo(formatTimeAgo(timestamp))
    }

    updateTime()
    
    // Update every minute
    const interval = setInterval(updateTime, 60000)

    return () => clearInterval(interval)
  }, [timestamp])

  return <span className={className}>{timeAgo}</span>
}
