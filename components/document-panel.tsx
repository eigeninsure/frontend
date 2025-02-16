'use client'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { IconPlus } from '@/components/ui/icons'
import { uploadJsonToPinata } from '@/lib/ipfs'
import { cn } from '@/lib/utils'
import { toast } from 'react-hot-toast'

interface ChatDocument {
  id: string
  chat_id: string
  user_id: string
  name: string
  type: 'pdf' | 'image'
  preview: string
  ipfs_hash: string
  created_at: string
}

interface DocumentPanelProps {
  documents: ChatDocument[]
  onUpload: (file: File, preview: string, type: 'pdf' | 'image') => Promise<void>
}

export function DocumentPanel({ documents, onUpload }: DocumentPanelProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const preview = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(file)
      })

      const type = file.type.startsWith('application/pdf') ? 'pdf' : 'image'
      await onUpload(file, preview, type)
    } catch (error) {
      console.error('Error uploading file:', error)
      toast.error('Failed to upload file')
    }
  }

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex flex-row gap-4 p-4 min-w-max">
        <Button
          variant="outline"
          className="shrink-0 h-32 w-24 flex flex-col items-center justify-center gap-2"
          onClick={() => fileInputRef.current?.click()}
        >
          <IconPlus />
          <span className="text-xs">Add File</span>
        </Button>
        
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="shrink-0 h-32 w-24 border rounded-lg overflow-hidden flex flex-col"
          >
            {doc.type === 'pdf' ? (
              <div className="h-full w-full bg-gray-100 flex items-center justify-center">
                <span className="text-sm font-medium">PDF</span>
              </div>
            ) : (
              <img
                src={doc.preview}
                alt={doc.name}
                className="h-full w-full object-cover"
              />
            )}
            <div className="p-2 text-xs truncate bg-white border-t">
              {doc.name}
            </div>
          </div>
        ))}
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </div>
  )
} 