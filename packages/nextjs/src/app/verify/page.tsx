'use client';

import { useState } from 'react';
import Image from 'next/image';

interface C2PAManifest {
  manifestPresent: boolean;
  title?: string;
  claimGenerator?: string;
  signature?: {
    issuer?: string;
    time?: string;
  };
  assertions?: Array<{
    label: string;
    data: any;
  }>;
}

export default function VerifyPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [manifest, setManifest] = useState<C2PAManifest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setManifest(null);
      setError(null);
    }
  };

  const handleVerify = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/verify-c2pa', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Verification failed');
      }

      const data = await response.json();
      setManifest(data.manifest);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const renderAssertionData = (label: string, data: any) => {
    if (label === 'org.x402.requirements') {
      return (
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">💰 Payment Requirements (x402)</h4>
          {data.accepts?.map((accept: any, idx: number) => (
            <div key={idx} className="text-sm space-y-1">
              <p><span className="font-medium">Scheme:</span> {accept.scheme}</p>
              <p><span className="font-medium">Network:</span> {accept.network}</p>
              <p><span className="font-medium">Amount:</span> {accept.parameters?.amount} {accept.parameters?.currency}</p>
              <p><span className="font-medium">Recipient:</span> <code className="text-xs bg-blue-100 px-2 py-1 rounded">{accept.parameters?.recipient}</code></p>
            </div>
          ))}
        </div>
      );
    }

    if (label === 'stds.schema-org.CreativeWork') {
      return (
        <div className="bg-green-50 p-4 rounded-lg">
          <h4 className="font-semibold text-green-900 mb-2">👤 Creator & Work Info</h4>
          <div className="text-sm space-y-1">
            {data.author && (
              <>
                <p><span className="font-medium">Author:</span> {data.author.name}</p>
                {data.author.sameAs && (
                  <p><span className="font-medium">Twitter:</span> <a href={data.author.sameAs} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{data.author.sameAs}</a></p>
                )}
                {data.author.description && (
                  <p><span className="font-medium">Bio:</span> {data.author.description}</p>
                )}
              </>
            )}
            {data.description && (
              <p><span className="font-medium">Description:</span> {data.description}</p>
            )}
            {data.offers && (
              <div className="mt-2 pt-2 border-t border-green-200">
                <p><span className="font-medium">Price:</span> {data.offers.price} {data.offers.priceCurrency}</p>
                <p className="text-xs text-green-700">{data.offers.description}</p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <pre className="bg-gray-50 p-4 rounded-lg text-xs overflow-auto max-h-64">
        {JSON.stringify(data, null, 2)}
      </pre>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              🔍 C2PA Credential Verifier
            </h1>
            <p className="text-gray-600">
              Verify Content Credentials embedded in images (Local verification for test-signed assets)
            </p>
          </div>

          {/* File Upload */}
          <div className="mb-8">
            <label className="block w-full">
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-500 transition-colors cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="text-gray-600">
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  {file ? (
                    <p className="text-lg font-medium text-gray-900">{file.name}</p>
                  ) : (
                    <>
                      <p className="text-lg font-medium">Drop an image here or click to select</p>
                      <p className="text-sm text-gray-500 mt-1">JPEG, PNG, WebP supported</p>
                    </>
                  )}
                </div>
              </div>
            </label>

            {file && (
              <button
                onClick={handleVerify}
                disabled={loading}
                className="mt-4 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                {loading ? 'Verifying...' : 'Verify C2PA Credentials'}
              </button>
            )}
          </div>

          {/* Preview */}
          {preview && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Image Preview</h3>
              <div className="relative w-full max-w-2xl mx-auto bg-gray-100 rounded-lg overflow-hidden">
                <img src={preview} alt="Preview" className="w-full h-auto" />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">❌ {error}</p>
            </div>
          )}

          {/* Results */}
          {manifest && (
            <div className="space-y-6">
              {manifest.manifestPresent ? (
                <>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <h2 className="text-2xl font-bold text-green-900 mb-2">
                      ✅ Content Credential Found
                    </h2>
                    <p className="text-green-700">
                      This image has valid C2PA credentials embedded.
                    </p>
                  </div>

                  {/* Manifest Info */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Manifest Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      {manifest.title && (
                        <div>
                          <span className="font-medium text-gray-700">Title:</span>
                          <p className="text-gray-900">{manifest.title}</p>
                        </div>
                      )}
                      {manifest.claimGenerator && (
                        <div>
                          <span className="font-medium text-gray-700">Claim Generator:</span>
                          <p className="text-gray-900">{manifest.claimGenerator}</p>
                        </div>
                      )}
                      {manifest.signature?.issuer && (
                        <div>
                          <span className="font-medium text-gray-700">Signer:</span>
                          <p className="text-gray-900">{manifest.signature.issuer}</p>
                        </div>
                      )}
                      {manifest.signature?.time && (
                        <div>
                          <span className="font-medium text-gray-700">Signed At:</span>
                          <p className="text-gray-900">{new Date(manifest.signature.time).toLocaleString()}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Assertions */}
                  {manifest.assertions && manifest.assertions.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">🔐 Assertions ({manifest.assertions.length})</h3>
                      <div className="space-y-4">
                        {manifest.assertions.map((assertion, idx) => (
                          <div key={idx}>
                            <h4 className="text-sm font-mono text-gray-600 mb-2">{assertion.label}</h4>
                            {renderAssertionData(assertion.label, assertion.data)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                  <h2 className="text-2xl font-bold text-yellow-900 mb-2">
                    ⚠️ No Content Credential
                  </h2>
                  <p className="text-yellow-700">
                    This image does not contain C2PA credentials.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
