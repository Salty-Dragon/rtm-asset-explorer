'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { IPFS_GATEWAYS } from '@/lib/constants'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { detectFileType } from '@/lib/fileTypes'
import { FilePreview } from './FilePreview'

interface IPFSImageProps {
  cid: string
  alt: string
  className?: string
  width?: number
  height?: number
  fill?: boolean
  priority?: boolean
}

export function IPFSImage({
  cid,
  alt,
  className,
  width = 400,
  height = 400,
  fill = false,
  priority = false,
}: IPFSImageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)
  const [gatewayIndex, setGatewayIndex] = useState(0)
  const [fileType, setFileType] = useState<ReturnType<typeof detectFileType> | null>(null)

  // Clean CID (remove ipfs:// prefix if present)
  const cleanCid = cid.replace(/^ipfs:\/\//, '')

  // Detect file type on mount
  useEffect(() => {
    const detectedType = detectFileType(cleanCid)
    setFileType(detectedType)
  }, [cleanCid])

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

  // If file type is detected and it's not an image, use FilePreview
  if (fileType && fileType.type !== 'image' && !error) {
    return (
      <FilePreview
        cid={cid}
        alt={alt}
        className={className}
        width={width}
        height={height}
        fill={fill}
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
