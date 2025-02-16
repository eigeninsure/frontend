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
    const files = Array.from(e.target.files || [])
    
    for (const file of files) {
      const reader = new FileReader()
      
      reader.onload = async (e) => {
        const preview = e.target?.result as string
        const type = file.type.startsWith('image/') ? 'image' : 'pdf'
        await onUpload(file, preview, type)
      }
      
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="fixed right-0 top-20 w-1/3 h-full p-4 overflow-y-auto">
      <h2 className="text-lg font-semibold mb-4">Documents</h2>
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        multiple
        accept="application/pdf,image/*"
        className="hidden"
      />
      
      <div className="grid grid-cols-2 gap-2">
        {documents.map(doc => (
          <div
            key={doc.id}
            className="relative group border rounded-lg overflow-hidden h-32"
          >
            {doc.type === 'image' ? (
              <img
                src={doc.preview}
                alt={doc.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                PDF
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white p-1 text-xs truncate">
              {doc.name}
            </div>
          </div>
        ))}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="h-32 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors"
        >
          <IconPlus className="h-8 w-8 text-gray-400" />
        </div>
      </div>
    </div>
  )
} 