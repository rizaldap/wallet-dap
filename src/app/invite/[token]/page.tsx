'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
// import { claimInvitation } from '@/lib/supabase/goals'; // Removed server-side import
import { createClient } from '@/lib/supabase/browser';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/components/providers/SessionProvider';

export default function InvitePage() {
    const params = useParams();
    const router = useRouter();
    const token = params.token as string;
    const { user, loading: authLoading } = useAuth();

    const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (authLoading) return;

        if (!user) {
            // Redirect to login if not authenticated
            // Appending next parameter to allow return after login if supported
            router.push(`/login?next=/invite/${token}`);
            return;
        }

        const joinGoal = async () => {
            try {
                // Call RPC via browser client
                const supabase = createClient();
                const { data: goalId, error } = await supabase.rpc('claim_invitation', {
                    p_token: token
                });

                if (error) throw error;

                setStatus('success');
                setTimeout(() => {
                    router.push(`/goals/${goalId}`);
                }, 1500);
            } catch (err: any) {
                console.error(err);
                setStatus('error');
                // Extract error message from Supabase error if possible
                const msg = err.message || 'Failed to join goal';
                if (msg.includes('already been used')) {
                    setErrorMessage('This invitation link has expired or reached its usage limit.');
                } else if (msg.includes('Invalid invitation')) {
                    setErrorMessage('This invitation link is invalid.');
                } else {
                    setErrorMessage(msg);
                }
            }
        };

        joinGoal();
    }, [token, user, authLoading, router]);

    if (authLoading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="animate-spin text-zinc-500" size={32} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4 font-sans">
            <div className="max-w-md w-full bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
                {status === 'verifying' && (
                    <>
                        <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto animate-pulse">
                            <Loader2 className="animate-spin text-zinc-400" size={32} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white mb-2">Verifying Invitation...</h2>
                            <p className="text-zinc-500">Please wait while we connect you to the goal.</p>
                        </div>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto animate-in zoom-in duration-300">
                            <CheckCircle2 className="text-green-500" size={32} />
                        </div>
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <h2 className="text-xl font-bold text-white mb-2">Invitation Accepted!</h2>
                            <p className="text-zinc-500">Redirecting you to the goal dashboard...</p>
                        </div>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                            <AlertCircle className="text-red-500" size={32} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white mb-2">Invitation Failed</h2>
                            <p className="text-zinc-400 mb-8 text-sm leading-relaxed">{errorMessage}</p>
                            <button
                                onClick={() => router.push('/goals')}
                                className="w-full py-3.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-all border border-white/5 shadow-lg active:scale-95"
                            >
                                Back to Goals
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
