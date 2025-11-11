import { Text } from '@vercel/examples-ui'
import { useState } from 'react'
import { deleteMediaKey, fetchMediaKeys, MediaKeys, saveMediaKey } from '../lib/media-keys'
import { MediaKeyForm } from './MediaKeyForm'
import { MediaKeyTable } from './MediaKeyTable'

interface MediaKeyPanelProps {
  mediaKeys: MediaKeys;
  setMediaKeys: (keys: MediaKeys) => void;
  apiKey: string;
  loginPasswd: string;
}

export function MediaKeyPanel({
  mediaKeys,
  setMediaKeys,
  apiKey,
  loginPasswd
}: MediaKeyPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSaveMediaKey = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await saveMediaKey(apiKey, newKey, newValue)
      const keys = await fetchMediaKeys(apiKey, loginPasswd)
      setMediaKeys(keys)
      setNewKey('')
      setNewValue('')
    } catch (err) {
      setError('Failed to save media key')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteMediaKey = async (mediaKey: string) => {
    try {
      await deleteMediaKey(apiKey, mediaKey)
      const keys = await fetchMediaKeys(apiKey, loginPasswd)
      setMediaKeys(keys)
    } catch (err) {
      setError('Failed to delete media key')
    }
  }

  return (
    <div className="mb-6">
      <div 
        className="text-left mb-2 cursor-pointer flex items-center"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Text className="mb-0">Manage Media Keys</Text>
        <span className="ml-2">{isExpanded ? '▼' : '▶'}</span>
      </div>
      
      {isExpanded && (
        <>
          <div className="mb-4 text-sm text-gray-600">
            <p>Required keys for publishing platforms:</p>
            <ul className="list-disc pl-5">
              <li><strong>dev.to:</strong> Provide DEV_TO_APIKEY</li>
              <li><strong>Hashnode:</strong> Provide HASHNODE_APIKEY and HASHNODE_PUBLICATION_ID</li>
            </ul>
          </div>

          <MediaKeyForm
            onSubmit={handleSaveMediaKey}
            newKey={newKey}
            setNewKey={setNewKey}
            newValue={newValue}
            setNewValue={setNewValue}
            loading={loading}
          />

          {error && (
            <div className="text-red-500 mb-4">
              {error}
            </div>
          )}

          <div className="border rounded-lg overflow-hidden">
            <MediaKeyTable
              mediaKeys={mediaKeys}
              onDelete={handleDeleteMediaKey}
            />
          </div>
        </>
      )}
    </div>
  );
}
