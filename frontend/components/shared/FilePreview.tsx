'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { FileText, Download, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { detectFileType, isEncrypted, getPlaceholderImage, formatFileSize, type FileTypeInfo } from '@/lib/fileTypes'
import { IPFS_GATEWAYS } from '@/lib/constants'

interface FilePreviewProps {
  cid: string
  alt: string
  className?: string
  width?: number
  height?: number
  fill?: boolean
}

export function FilePreview({
  cid,
  alt,
  className,
  width = 400,
  height = 400,
  fill = false,
}: FilePreviewProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)
  const [fileType, setFileType] = useState<FileTypeInfo | null>(null)
  const [encrypted, setEncrypted] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [fileSize, setFileSize] = useState<number | null>(null)
  const [gatewayIndex, setGatewayIndex] = useState(0)

  // Clean CID (remove ipfs:// prefix if present)
  const cleanCid = cid.replace(/^ipfs:\/\//, '')
  const fileUrl = `${IPFS_GATEWAYS[gatewayIndex]}/${cleanCid}`

  useEffect(() => {
    // Detect file type from CID
    const detectedType = detectFileType(cleanCid)
    setFileType(detectedType)

    // If it's a known image type, don't fetch content
    if (detectedType.type === 'image') {
      setIsLoading(false)
      return
    }

    // Fetch file to check type and encryption
    fetchFilePreview()
  }, [cleanCid, gatewayIndex])

  const fetchFilePreview = async () => {
    try {
      // First, make a HEAD request to get content type and size without downloading the file
      const response = await fetch(fileUrl, {
        method: 'HEAD',
      })

      if (!response.ok) {
        throw new Error('Failed to fetch file')
      }

      // Get content type and size from headers
      const contentType = response.headers.get('content-type')
      const contentLength = response.headers.get('content-length')

      if (contentLength) {
        setFileSize(parseInt(contentLength, 10))
      }

      // If we have a content type, use it to refine file type detection
      if (contentType && fileType?.type === 'unknown') {
        const { detectFileTypeFromMime } = await import('@/lib/fileTypes')
        const refinedType = detectFileTypeFromMime(contentType)
        setFileType(refinedType)
      }

      // For text-based files, fetch content to show preview
      // Use Range request to fetch only first 1KB for preview and encryption check
      if (fileType?.canPreview && ['text', 'csv', 'json', 'xml'].includes(fileType.type)) {
        const fullResponse = await fetch(fileUrl, {
          headers: {
            'Range': 'bytes=0-1023' // Fetch first 1KB
          }
        })
        const text = await fullResponse.text()

        // Check if encrypted
        if (isEncrypted(text)) {
          setEncrypted(true)
        } else {
          // Show first 500 characters as preview
          setPreview(text.slice(0, 500))
        }
      } else if (fileType?.type === 'pdf') {
        // For PDFs, check if encrypted by reading first 2KB (enough for PDF header and encryption info)
        const fullResponse = await fetch(fileUrl, {
          headers: {
            'Range': 'bytes=0-2047' // Fetch first 2KB which includes PDF header
          }
        })
        const buffer = await fullResponse.arrayBuffer()
        const bytes = new Uint8Array(buffer)

        if (isEncrypted(bytes)) {
          setEncrypted(true)
        }
      }

      setIsLoading(false)
    } catch (err) {
      console.error('Error fetching file preview:', err)
      
      // Try next gateway
      if (gatewayIndex < IPFS_GATEWAYS.length - 1) {
        setGatewayIndex(gatewayIndex + 1)
      } else {
        setError(true)
        setIsLoading(false)
      }
    }
  }

  const handleImageError = () => {
    // Try next gateway
    if (gatewayIndex < IPFS_GATEWAYS.length - 1) {
      setGatewayIndex(gatewayIndex + 1)
    } else {
      setError(true)
      setIsLoading(false)
    }
  }

  const handleImageLoad = () => {
    setIsLoading(false)
    setError(false)
  }

  // If it's an image, render as image
  if (fileType?.type === 'image' && !error) {
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
          src={fileUrl}
          alt={alt}
          width={fill ? undefined : width}
          height={fill ? undefined : height}
          fill={fill}
          onLoad={handleImageLoad}
          onError={handleImageError}
          className={cn(
            'object-contain transition-opacity duration-300',
            isLoading ? 'opacity-0' : 'opacity-100',
            className
          )}
        />
      </div>
    )
  }

  // Show placeholder for other file types
  const placeholderImage = getPlaceholderImage(fileType || { type: 'unknown', category: 'unknown', canPreview: false }, encrypted)

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center bg-muted p-6',
        fill ? 'absolute inset-0' : '',
        className
      )}
      style={!fill ? { width, height } : undefined}
    >
      {isLoading ? (
        <Skeleton className="w-32 h-32" />
      ) : (
        <>
          {/* Placeholder Icon */}
          <Image
            src={placeholderImage}
            alt={encrypted ? 'Encrypted file' : fileType?.badge || 'File'}
            width={120}
            height={120}
            className="mb-4 opacity-80"
          />

          {/* File Type Badge */}
          {fileType?.badge && !encrypted && (
            <div className="mb-2 text-sm font-semibold text-muted-foreground">
              {fileType.badge} File
            </div>
          )}

          {encrypted && (
            <div className="mb-2 text-sm font-semibold text-destructive">
              Encrypted / Password Protected
            </div>
          )}

          {/* Text Preview */}
          {preview && !encrypted && (
            <div className="w-full max-w-md mb-4 p-3 bg-background rounded-lg border">
              <pre className="text-xs whitespace-pre-wrap break-words overflow-hidden max-h-32 text-muted-foreground font-mono">
                {preview}
                {preview.length >= 500 && '...'}
              </pre>
            </div>
          )}

          {/* File Size */}
          {fileSize && (
            <div className="text-xs text-muted-foreground mb-3">
              {formatFileSize(fileSize)}
            </div>
          )}

          {/* Action Buttons */}
          {!encrypted && fileType && (
            <div className="flex gap-2">
              {fileType.type === 'pdf' && (
                <Button size="sm" variant="outline" asChild>
                  <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View PDF
                  </a>
                </Button>
              )}
              <Button size="sm" variant="outline" asChild>
                <a href={fileUrl} download>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </a>
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
