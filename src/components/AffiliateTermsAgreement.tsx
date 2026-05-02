import React, { useState } from 'react'

export function AffiliateTermsAgreement() {
  const [consent, setConsent] = useState(false)
  const [saving, setSaving] = useState(false)

  const agree = async () => {
    setSaving(true)
    // In a real app, persist consent to user profile via API
    await new Promise(r => setTimeout(r, 400))
    setConsent(true)
    setSaving(false)
  }

  if (consent) {
    return <div className="p-4 bg-green-50 text-green-700 rounded-xl">Mengikuti ketentuan afiliasi telah disetujui.</div>
  }
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 p-4">
      <h4 className="font-bold mb-2">Affiliate Terms Agreement</h4>
      <p className="text-sm text-gray-600 mb-4">Silakan baca dan setujui persyaratan afiliasi sebelum lanjut.</p>
      <button onClick={agree} className="px-4 py-2 bg-indigo-600 text-white rounded">Setujui</button>
      {saving && <span className="ml-2 text-sm">Menyimpan...</span>}
    </div>
  )
}
