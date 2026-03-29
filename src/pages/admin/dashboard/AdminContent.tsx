import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth'
import { useOrgStore } from '@/stores/org'
import { supabase } from '@/lib/supabase'
import { ingestContent } from '@/lib/openclaw'
import { Button, Input, Card, Badge, EmptyState, Modal } from '@/components/ui'
import type { ContentType } from '@/types'
import { FileText, Link as LinkIcon, Youtube, Mic, Upload, Plus, X, ExternalLink, Check, Loader2 } from 'lucide-react'

const typeIcons: Record<ContentType, React.ReactNode> = {
  pdf: <FileText size={16} />,
  url: <LinkIcon size={16} />,
  video: <Youtube size={16} />,
  audio: <Mic size={16} />,
  text: <FileText size={16} />,
  social_link: <ExternalLink size={16} />,
}

export function AdminContent() {
  const { currentOrg, user } = useAuthStore()
  const { content, fetchContent, addContent } = useOrgStore()
  const [showUpload, setShowUpload] = useState(false)
  const [uploadType, setUploadType] = useState<ContentType>('url')
  const [title, setTitle] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [pasteContent, setPasteContent] = useState('')
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (currentOrg) fetchContent(currentOrg.id)
  }, [currentOrg?.id])

  const handleUpload = async () => {
    if (!currentOrg || !user) return
    setUploading(true)
    try {
      const item = await addContent({
        org_id: currentOrg.id,
        uploaded_by: user.id,
        type: uploadType,
        title: title || sourceUrl || 'Untitled',
        source_url: sourceUrl || undefined,
        description: pasteContent || '',
      })

      // Trigger ingestion for all org agents
      const { data: members } = await supabase
        .from('org_members')
        .select('agent_id')
        .eq('org_id', currentOrg.id)
        .not('agent_id', 'is', null)

      if (members) {
        for (const m of members) {
          if (m.agent_id) {
            ingestContent(m.agent_id, {
              type: uploadType,
              title: title || sourceUrl || 'Untitled',
              source_url: sourceUrl,
              text: pasteContent,
            }).catch(() => {})
          }
        }
      }

      setShowUpload(false)
      setTitle('')
      setSourceUrl('')
      setPasteContent('')
    } finally {
      setUploading(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !currentOrg || !user) return
    setUploading(true)
    try {
      const path = `content/${currentOrg.id}/${crypto.randomUUID()}-${file.name}`
      await supabase.storage.from('org-content').upload(path, file)
      const { data: { publicUrl } } = supabase.storage.from('org-content').getPublicUrl(path)

      await addContent({
        org_id: currentOrg.id,
        uploaded_by: user.id,
        type: file.type.includes('pdf') ? 'pdf' : file.type.includes('audio') ? 'audio' : 'text',
        title: file.name,
        file_path: publicUrl,
        storage_key: path,
      })
      setShowUpload(false)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="px-5 py-6 space-y-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading font-medium">Content</h1>
          <p className="text-body text-now-text-secondary">{content.length} items</p>
        </div>
        <Button size="sm" onClick={() => setShowUpload(true)}>
          <Plus size={14} /> Add
        </Button>
      </div>

      {content.length === 0 ? (
        <EmptyState
          icon={<Zap size={20} />}
          title="No content yet"
          description="Upload PDFs, paste URLs, add YouTube links, or paste text. Your AI learns from all of it."
          action={<Button size="sm" onClick={() => setShowUpload(true)}>Add content</Button>}
        />
      ) : (
        <div className="space-y-2">
          {content.map(c => (
            <Card key={c.id} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-now-accent-dim flex items-center justify-center text-now-text-secondary">
                {typeIcons[c.type]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-body truncate">{c.title}</p>
                <p className="text-micro text-now-text-tertiary">{c.type} · {new Date(c.created_at).toLocaleDateString()}</p>
              </div>
              <Badge variant={c.processed ? 'success' : 'warning'}>
                {c.processed ? 'Indexed' : 'Processing'}
              </Badge>
            </Card>
          ))}
        </div>
      )}

      {/* Upload modal */}
      <Modal open={showUpload} onClose={() => setShowUpload(false)}>
        <h2 className="text-title font-medium mb-6">Add content</h2>

        {/* Type selector */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {([
            { type: 'url' as const, label: 'URL', icon: LinkIcon },
            { type: 'video' as const, label: 'YouTube', icon: Youtube },
            { type: 'pdf' as const, label: 'File', icon: Upload },
            { type: 'text' as const, label: 'Paste', icon: FileText },
            { type: 'audio' as const, label: 'Audio', icon: Mic },
          ]).map(t => (
            <button
              key={t.type}
              onClick={() => setUploadType(t.type)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-caption whitespace-nowrap transition-all ${
                uploadType === t.type ? 'bg-white text-black' : 'bg-now-surface text-now-text-secondary'
              }`}
            >
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {(uploadType === 'url' || uploadType === 'video' || uploadType === 'audio') && (
            <>
              <Input label="Title" placeholder="Optional" value={title} onChange={e => setTitle(e.target.value)} />
              <Input
                label={uploadType === 'video' ? 'YouTube URL' : uploadType === 'audio' ? 'Audio/Podcast URL' : 'URL'}
                placeholder="https://..."
                value={sourceUrl}
                onChange={e => setSourceUrl(e.target.value)}
              />
            </>
          )}
          {uploadType === 'text' && (
            <>
              <Input label="Title" placeholder="Name this content" value={title} onChange={e => setTitle(e.target.value)} />
              <textarea
                className="now-input min-h-[200px] resize-none"
                placeholder="Paste your content here..."
                value={pasteContent}
                onChange={e => setPasteContent(e.target.value)}
              />
            </>
          )}
          {uploadType === 'pdf' && (
            <label className="block">
              <div className="border-2 border-dashed border-now-border rounded-xl p-8 text-center cursor-pointer hover:border-now-border-hover transition-colors">
                <Upload size={24} className="text-now-text-tertiary mx-auto mb-2" />
                <p className="text-caption text-now-text-secondary">Drop a file or click to browse</p>
                <p className="text-micro text-now-text-tertiary mt-1">PDF, DOCX, TXT, MP3, WAV</p>
              </div>
              <input type="file" className="hidden" accept=".pdf,.docx,.txt,.mp3,.wav,.m4a" onChange={handleFileUpload} />
            </label>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="secondary" size="md" onClick={() => setShowUpload(false)}>Cancel</Button>
          <Button size="md" onClick={handleUpload} loading={uploading} disabled={uploadType === 'pdf'}>
            Add content
          </Button>
        </div>
      </Modal>
    </div>
  )
}

function Zap(props: any) { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> }
