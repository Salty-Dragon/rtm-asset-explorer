'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { IPFS_GATEWAYS } from '@/lib/constants'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { detectFileType, detectFileTypeFromMime, isValidCid } from '@/lib/fileTypes'
import { FilePreview } from './FilePreview'

interface IPFSImageProps {
  cid: string
  alt: string
  className?: string
  width?: number
  height?: number
  fill?: boolean
  priority?: boolean
  showActions?: boolean
}

export function IPFSImage({
  cid,
  alt,
  className,
  width = 400,
  height = 400,
  fill = false,
  priority = false,
  showActions,
}: IPFSImageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)
  const [gatewayIndex, setGatewayIndex] = useState(0)
  const [fileType, setFileType] = useState<ReturnType<typeof detectFileType> | null>(null)
  const [contentTypeChecked, setContentTypeChecked] = useState(false)

  // Clean CID (remove ipfs:// prefix if present)
  const cleanCid = cid.replace(/^ipfs:\/\//, '')

  // Check if the CID is valid
  const cidIsValid = isValidCid(cleanCid)

  // Detect file type on mount, and for unknown types, probe content type via HEAD request
  useEffect(() => {
    // If CID is invalid, skip detection and show placeholder immediately
    if (!cidIsValid) {
      setError(true)
      setIsLoading(false)
      setContentTypeChecked(true)
      return
    }

    const detectedType = detectFileType(cleanCid)
    setFileType(detectedType)

    // If file type is already known (has extension), no need to probe
    if (detectedType.type !== 'unknown') {
      setContentTypeChecked(true)
      return
    }

    // For unknown types (most IPFS CIDs don't have extensions), do a HEAD request
    // to check the actual content type before passing to Next.js Image
    const controller = new AbortController()
    const checkContentType = async () => {
      try {
        const url = `${IPFS_GATEWAYS[gatewayIndex]}/${cleanCid}`
        const response = await fetch(url, {
          method: 'HEAD',
          signal: controller.signal,
        })

        if (!response.ok) {
          // Server returned an error (e.g., 503) - show placeholder
          setError(true)
          setIsLoading(false)
          setContentTypeChecked(true)
          return
        }

        const contentType = response.headers.get('content-type')

        if (!contentType) {
          // No content type returned - show placeholder instead of letting Next.js Image fail
          setError(true)
          setIsLoading(false)
          setContentTypeChecked(true)
          return
        }

        // Check if the content is actually an image
        if (contentType.startsWith('image/')) {
          // It's an image - let Next.js Image handle it
          setFileType(detectFileTypeFromMime(contentType))
          setContentTypeChecked(true)
        } else {
          // Not an image (PDF, JSON, etc.) - update file type so FilePreview handles it
          const refinedType = detectFileTypeFromMime(contentType)
          setFileType(refinedType)
          setContentTypeChecked(true)
        }
      } catch {
        // Network error or aborted - show placeholder
        if (!controller.signal.aborted) {
          setError(true)
          setIsLoading(false)
          setContentTypeChecked(true)
        }
      }
    }

    checkContentType()

    return () => {
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanCid, gatewayIndex, cidIsValid])

  // Build image URL with current gateway
  const imageUrl = `${IPFS_GATEWAYS[gatewayIndex]}/${cleanCid}`

  const handleError = () => {
    // Try next gateway
    if (gatewayIndex < IPFS_GATEWAYS.length - 1) {
      setGatewayIndex(gatewayIndex + 1)
      setError(false)
    } else {
      // All gateways failed, show placeholder
      setError(true)
      setIsLoading(false)
    }
  }

  const handleLoad = () => {
    setIsLoading(false)
    setError(false)
  }

  // If CID is invalid, show placeholder immediately
  if (!cidIsValid) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-muted',
          fill ? 'absolute inset-0' : '',
          className
        )}
        style={!fill ? { width, height } : undefined}
      >
        <Image
          src="/placeholder-asset.svg"
          alt="Placeholder"
          width={fill ? undefined : width}
          height={fill ? undefined : height}
          fill={fill}
          className={cn('object-contain', className)}
        />
      </div>
    )
  }

  // Wait for content type check to complete before rendering
  if (!contentTypeChecked) {
    return (
      <div className={cn('relative', fill ? 'w-full h-full' : '', className)}>
        <Skeleton
          className={cn(
            'absolute inset-0',
            !fill && 'w-full h-full'
          )}
          style={!fill ? { width, height } : undefined}
        />
      </div>
    )
  }

  // If file type is detected and it's not an image, use FilePreview
  if (fileType && fileType.type !== 'image' && fileType.type !== 'unknown') {
    return (
      <FilePreview
        cid={cid}
        alt={alt}
        className={className}
        width={width}
        height={height}
        fill={fill}
        showActions={showActions}
      />
    )
  }

  if (error) {
    // Show placeholder
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-muted',
          fill ? 'absolute inset-0' : '',
          className
        )}
        style={!fill ? { width, height } : undefined}
      >
        <Image
          src="/placeholder-asset.svg"
          alt="Placeholder"
          width={fill ? undefined : width}
          height={fill ? undefined : height}
          fill={fill}
          className={cn('object-contain', className)}
        />
      </div>
    )
  }

  return (
    <div className={cn('relative', fill ? 'w-full h-full' : '', className)}>
      {isLoading && (
        <Skeleton
          className={cn(
            'absolute inset-0',
            !fill && 'w-full h-full'
          )}
          style={!fill ? { width, height } : undefined}
        />
      )}
      <Image
        src={imageUrl}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        fill={fill}
        priority={priority}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          'object-contain transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100',
          className
        )}
      />
    </div>
  )
}
