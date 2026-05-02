import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { StaticPage } from '../types'

export function StaticPageViewer({ slug }: { slug: string }) {
  const [page, setPage] = useState<StaticPage | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPage = async () => {
      try {
        const q = query(collection(db, 'staticPages'), where('slug', '==', slug))
        const snap = await getDocs(q)
        if (!snap.empty) {
          const data = { id: snap.docs[0].id, ...(snap.docs[0].data() as any) } as StaticPage
          setPage(data)
        } else {
          setPage(null)
        }
      } catch (e) {
        console.error('StaticPageViewer fetch error', e)
        setPage(null)
      } finally {
        setLoading(false)
      }
    }
    fetchPage()
  }, [slug])

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading…</div>
  if (!page) return <div className="min-h-screen flex items-center justify-center">Halaman tidak ditemukan</div>
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-black text-gray-900 dark:text-white">{page.title}</h1>
      <div className="text-gray-700 dark:text-gray-200" dangerouslySetInnerHTML={{ __html: page.content }} />
    </div>
  )
}
