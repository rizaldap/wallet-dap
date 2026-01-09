'use client';

import { useState, useRef, useCallback } from 'react';
import { Camera, Upload, X, Loader2, Check, RotateCcw } from 'lucide-react';
import { scanReceipt, parseReceiptData, formatParsedDate, ParsedReceiptData } from '@/lib/services/ocrService';

interface ReceiptScannerProps {
    onScanComplete: (data: {
        amount: number;
        description: string;
        date: string;
    }) => void;
    onClose: () => void;
}

type ScanStep = 'select' | 'preview' | 'scanning' | 'result';

export function ReceiptScanner({ onScanComplete, onClose }: ReceiptScannerProps) {
    const [step, setStep] = useState<ScanStep>('select');
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>('');
    const [progress, setProgress] = useState(0);
    const [scanResult, setScanResult] = useState<ParsedReceiptData | null>(null);
    const [error, setError] = useState<string>('');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = useCallback((file: File) => {
        if (!file.type.startsWith('image/')) {
            setError('Pilih file gambar (JPG, PNG)');
            return;
        }

        setSelectedImage(file);
        setError('');

        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
            setImagePreview(e.target?.result as string);
            setStep('preview');
        };
        reader.readAsDataURL(file);
    }, []);

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleCameraClick = () => {
        cameraInputRef.current?.click();
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFileSelect(file);
    };

    const handleScan = async () => {
        if (!selectedImage) return;

        setStep('scanning');
        setProgress(0);
        setError('');

        try {
            const text = await scanReceipt(selectedImage, setProgress);
            const parsed = parseReceiptData(text);
            setScanResult(parsed);
            setStep('result');
        } catch (err) {
            setError('Gagal scan gambar. Coba lagi dengan gambar yang lebih jelas.');
            setStep('preview');
        }
    };

    const handleUseResult = () => {
        if (!scanResult) return;

        onScanComplete({
            amount: scanResult.amount || 0,
            description: scanResult.description,
            date: formatParsedDate(scanResult.date),
        });
        onClose();
    };

    const handleRetry = () => {
        setStep('select');
        setSelectedImage(null);
        setImagePreview('');
        setScanResult(null);
        setError('');
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: '480px' }}
            >
                {/* Header */}
                <div className="modal-header">
                    <h3 className="modal-title">📷 Scan Struk</h3>
                    <button className="modal-close" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                {/* Hidden file inputs */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileInputChange}
                    style={{ display: 'none' }}
                />
                <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileInputChange}
                    style={{ display: 'none' }}
                />

                {/* Content based on step */}
                {step === 'select' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>
                            Ambil foto struk atau upload dari galeri
                        </p>

                        <button
                            onClick={handleCameraClick}
                            className="btn btn-primary"
                            style={{ justifyContent: 'flex-start', padding: '16px 20px' }}
                        >
                            <Camera size={20} />
                            Ambil Foto
                        </button>

                        <button
                            onClick={handleUploadClick}
                            className="btn btn-secondary"
                            style={{ justifyContent: 'flex-start', padding: '16px 20px' }}
                        >
                            <Upload size={20} />
                            Upload dari Galeri
                        </button>

                        {error && (
                            <p style={{ color: 'var(--accent-red)', fontSize: '13px' }}>{error}</p>
                        )}
                    </div>
                )}

                {step === 'preview' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{
                            borderRadius: 'var(--radius-md)',
                            overflow: 'hidden',
                            background: 'var(--bg-tertiary)',
                            maxHeight: '300px',
                        }}>
                            <img
                                src={imagePreview}
                                alt="Preview"
                                style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'contain', maxHeight: '300px' }}
                            />
                        </div>

                        {error && (
                            <p style={{ color: 'var(--accent-red)', fontSize: '13px' }}>{error}</p>
                        )}

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={handleRetry} className="btn btn-secondary" style={{ flex: 1 }}>
                                <RotateCcw size={18} />
                                Ganti Foto
                            </button>
                            <button onClick={handleScan} className="btn btn-primary" style={{ flex: 1 }}>
                                <Camera size={18} />
                                Scan
                            </button>
                        </div>
                    </div>
                )}

                {step === 'scanning' && (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '16px',
                        padding: '40px 0'
                    }}>
                        <Loader2 size={48} style={{ animation: 'spin 1s linear infinite' }} />
                        <p style={{ color: 'var(--text-secondary)' }}>Memproses gambar...</p>

                        {/* Progress bar */}
                        <div style={{ width: '100%', maxWidth: '200px' }}>
                            <div style={{
                                height: '6px',
                                background: 'var(--bg-tertiary)',
                                borderRadius: 'var(--radius-full)',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    height: '100%',
                                    width: `${progress}%`,
                                    background: 'var(--text-primary)',
                                    transition: 'width 0.3s ease'
                                }} />
                            </div>
                            <p style={{
                                textAlign: 'center',
                                fontSize: '12px',
                                color: 'var(--text-muted)',
                                marginTop: '8px'
                            }}>
                                {progress}%
                            </p>
                        </div>

                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </div>
                )}

                {step === 'result' && scanResult && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{
                            background: 'var(--bg-tertiary)',
                            borderRadius: 'var(--radius-md)',
                            padding: '16px',
                        }}>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                                HASIL SCAN
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div>
                                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Nominal</span>
                                    <p style={{
                                        fontSize: '24px',
                                        fontWeight: 700,
                                        color: scanResult.amount ? 'var(--text-primary)' : 'var(--accent-red)'
                                    }}>
                                        {scanResult.amount
                                            ? `Rp ${scanResult.amount.toLocaleString('id-ID')}`
                                            : 'Tidak terdeteksi'
                                        }
                                    </p>
                                </div>

                                <div>
                                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Deskripsi</span>
                                    <p style={{ fontSize: '14px' }}>{scanResult.description || '-'}</p>
                                </div>

                                <div>
                                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Tanggal</span>
                                    <p style={{ fontSize: '14px' }}>{scanResult.date || 'Hari ini'}</p>
                                </div>

                                {scanResult.items.length > 0 && (
                                    <div>
                                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                            Item ({scanResult.items.length})
                                        </span>
                                        <div style={{
                                            maxHeight: '100px',
                                            overflow: 'auto',
                                            fontSize: '12px',
                                            marginTop: '4px'
                                        }}>
                                            {scanResult.items.slice(0, 5).map((item, i) => (
                                                <div key={i} style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    padding: '4px 0',
                                                    borderBottom: '1px solid var(--border-color)'
                                                }}>
                                                    <span>{item.name}</span>
                                                    <span>Rp {item.price.toLocaleString('id-ID')}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
                            💡 Kamu bisa edit hasilnya di form setelah klik Gunakan
                        </p>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={handleRetry} className="btn btn-secondary" style={{ flex: 1 }}>
                                <RotateCcw size={18} />
                                Scan Ulang
                            </button>
                            <button onClick={handleUseResult} className="btn btn-primary" style={{ flex: 1 }}>
                                <Check size={18} />
                                Gunakan
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
