// Data formatting utilities

import { format, formatDistance, formatRelative } from 'date-fns'

/**
 * Format a number with commas
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num)
}

/**
 * Format a large number with suffix (K, M, B)
 */
export function formatCompactNumber(num: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
  }).format(num)
}

/**
 * Format RTM amount
 * @param amount - Amount in satoshis (smallest unit)
 * @param decimals - Number of decimal places to show
 */
export function formatRTM(amount: number, decimals = 8): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '0 RTM'
  }
  const rtm = amount / 100000000 // Convert satoshis to RTM
  return `${rtm.toFixed(decimals)} RTM`
}

/**
 * Format a percentage
 */
export function formatPercentage(value: number, decimals = 2): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '0%'
  }
  return `${value.toFixed(decimals)}%`
}

/**
 * Format a date/timestamp
 */
export function formatDate(timestamp: number | string | Date, formatStr = 'PPpp'): string {
  const date = typeof timestamp === 'number' ? new Date(timestamp * 1000) : new Date(timestamp)
  return format(date, formatStr)
}

/**
 * Format a date as relative time (e.g., "2 hours ago")
 */
export function formatTimeAgo(timestamp: number | string | Date): string {
  const date = typeof timestamp === 'number' ? new Date(timestamp * 1000) : new Date(timestamp)
  return formatDistance(date, new Date(), { addSuffix: true })
}

/**
 * Format a date as relative (e.g., "today at 3:00 PM")
 */
export function formatRelativeTime(timestamp: number | string | Date): string {
  const date = typeof timestamp === 'number' ? new Date(timestamp * 1000) : new Date(timestamp)
  return formatRelative(date, new Date())
}

/**
 * Format bytes to human-readable size
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

/**
 * Format duration in seconds to human-readable format
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  const parts = []
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`)

  return parts.join(' ')
}

/**
 * Format a hash rate
 */
export function formatHashRate(hashRate: number): string {
  if (hashRate === undefined || hashRate === null || isNaN(hashRate) || hashRate === 0) {
    return '0 H/s'
  }
  
  const units = ['H/s', 'KH/s', 'MH/s', 'GH/s', 'TH/s', 'PH/s', 'EH/s']
  let unitIndex = 0
  let rate = hashRate

  while (rate >= 1000 && unitIndex < units.length - 1) {
    rate /= 1000
    unitIndex++
  }

  return `${rate.toFixed(2)} ${units[unitIndex]}`
}

/**
 * Format difficulty
 */
export function formatDifficulty(difficulty: number): string {
  if (difficulty === undefined || difficulty === null || isNaN(difficulty)) {
    return '0'
  }
  
  if (difficulty >= 1e12) {
    return `${(difficulty / 1e12).toFixed(2)} T`
  } else if (difficulty >= 1e9) {
    return `${(difficulty / 1e9).toFixed(2)} B`
  } else if (difficulty >= 1e6) {
    return `${(difficulty / 1e6).toFixed(2)} M`
  } else if (difficulty >= 1e3) {
    return `${(difficulty / 1e3).toFixed(2)} K`
  }
  return difficulty.toFixed(2)
}

/**
 * Format USD amount
 */
export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

/**
 * Format asset type for display
 */
export function formatAssetType(type: string): string {
  switch (type) {
    case 'fungible':
      return 'Fungible'
    case 'nft':
      return 'NFT'
    default:
      return type
  }
}

/**
 * Format export status for display
 */
export function formatExportStatus(status: string): string {
  switch (status) {
    case 'pending_payment':
      return 'Pending Payment'
    case 'processing':
      return 'Processing'
    case 'completed':
      return 'Completed'
    case 'failed':
      return 'Failed'
    case 'expired':
      return 'Expired'
    default:
      return status
  }
}
