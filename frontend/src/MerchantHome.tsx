import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton, WalletDisconnectButton } from "@solana/wallet-adapter-react-ui";
import { getMerchantByWallet, createMerchant, updateMerchant } from "./services/merchantService";
import type { Merchant } from "./types/merchant";
import { toast } from "sonner";

// Simple modal/dialog for editing profile
function EditProfileModal({ open, onClose, editForm, setEditForm, onSave, loading }: {
    open: boolean;
    onClose: () => void;
    editForm: { name: string; email: string };
    setEditForm: (f: { name: string; email: string }) => void;
    onSave: (e: React.FormEvent) => void;
    loading: boolean;
}) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-[#23202b] rounded-2xl shadow-2xl p-8 w-full max-w-md relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-white/60 hover:text-[#14f195] text-xl font-bold"
                    aria-label="Close"
                >×</button>
                <h2 className="text-2xl font-bold text-white mb-4 text-center">Edit Profile</h2>
                <form onSubmit={onSave} className="flex flex-col gap-4">
                    <input
                        type="text"
                        placeholder="Name"
                        value={editForm.name}
                        onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                        className="rounded px-3 py-2 bg-[#19161c] border border-[#2a2a3a] text-white w-full"
                        required
                    />
                    <input
                        type="email"
                        placeholder="Email"
                        value={editForm.email}
                        onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                        className="rounded px-3 py-2 bg-[#19161c] border border-[#2a2a3a] text-white w-full"
                        required
                    />
                    <div className="flex gap-2 mt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2 rounded-lg border border-[#9945ff] text-white font-bold bg-[#23202b] hover:bg-[#9945ff] hover:text-[#19161c] transition"
                        >Cancel</button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-2 rounded-lg bg-gradient-to-r from-[#14f195] to-[#9945ff] text-[#19161c] font-bold shadow hover:from-[#9945ff] hover:to-[#14f195] hover:text-white transition"
                        >{loading ? "Saving..." : "Save"}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function MerchantHome() {
    const { publicKey, connected } = useWallet();
    const walletAddress = publicKey?.toBase58() || null;
    const [merchant, setMerchant] = useState<Merchant | null>(null);
    const [showSignUp, setShowSignUp] = useState(false);
    const [form, setForm] = useState({ name: "", email: "" });
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editForm, setEditForm] = useState({ name: "", email: "" });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch merchant info from Supabase when wallet connects
    useEffect(() => {
        if (walletAddress) {
            setLoading(true);
            getMerchantByWallet(walletAddress)
                .then((data) => {
                    if (data) {
                        setMerchant(data);
                        setShowSignUp(false);
                    } else {
                        setMerchant(null);
                        setShowSignUp(true);
                    }
                })
                .catch(() => {
                    setError("Failed to fetch merchant info");
                    setMerchant(null);
                    setShowSignUp(true);
                    toast.error("Failed to fetch merchant info");
                })
                .finally(() => setLoading(false));
        } else {
            setMerchant(null);
            setShowSignUp(false);
        }
    }, [walletAddress]);

    async function handleSignUp(e: React.FormEvent) {
        e.preventDefault();
        if (!walletAddress) return;
        setLoading(true);
        setError(null);
        try {
            const merchantData = await createMerchant({
                name: form.name,
                email: form.email,
                wallet_address: walletAddress
            });
            setMerchant(merchantData);
            setShowSignUp(false);
            toast.success("Sign up successful! Welcome, " + merchantData.name + ".");
        } catch (err: any) {
            setError("Failed to sign up: " + (err?.message || err));
            toast.error("Failed to sign up: " + (err?.message || err));
        } finally {
            setLoading(false);
        }
    }

    function openEditModal() {
        if (!merchant) return;
        setEditForm({ name: merchant.name, email: merchant.email });
        setEditModalOpen(true);
    }

    async function handleSaveEdit(e: React.FormEvent) {
        e.preventDefault();
        if (!merchant) return;
        setLoading(true);
        setError(null);
        try {
            const updated = await updateMerchant(merchant.id, {
                name: editForm.name,
                email: editForm.email,
            });
            setMerchant(updated);
            setEditModalOpen(false);
            toast.success("Profile updated successfully.");
        } catch (err: any) {
            setError("Failed to update profile: " + (err?.message || err));
            toast.error("Failed to update profile: " + (err?.message || err));
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#19161c] via-[#23202b] to-[#19161c] px-2 py-8">
            {/* Actions Bar */}
            <div className="absolute top-6 right-8 flex gap-2 z-10">
                {connected && merchant && (
                    <>
                        <WalletDisconnectButton className="!bg-[#23202b] !border !border-[#9945ff] !text-white !font-bold !rounded !px-3 !py-1 hover:!bg-[#9945ff] hover:!text-[#19161c] transition text-sm shadow" />
                    </>
                )}
            </div>
            <div className="w-full max-w-lg mx-auto relative p-4">

                {/* Header */}
                <div className="flex flex-col items-center gap-2 w-full">
                    <img src="/icon.png" alt="RWRD Logo" className="h-12 mb-8" />
                    <h1 className="text-xl md:text-2xl font-extrabold text-white drop-shadow text-center">
                        {merchant ? `Welcome, ${merchant.name}` : "Welcome"}
                    </h1>
                    <p className="text-white/70 text-center text-base max-w-xs mx-auto">
                        {merchant
                            ? ""
                            : "Start managing your business on Solana.\nConnect your wallet to get started."}
                    </p>
                </div>

                {/* Main Content */}
                <div className="w-full flex flex-col items-center gap-4 mt-2">
                    {!connected && (
                        <WalletMultiButton className="!bg-gradient-to-r !from-[#14f195] !to-[#9945ff] !text-[#19161c] !font-bold !shadow-lg !text-lg w-full" />
                    )}
                    {loading && <div className="text-white/80">Loading...</div>}
                    {error && <div className="text-red-500 text-center">{error}</div>}
                    {connected && walletAddress && !merchant && showSignUp && !loading && (
                        <form onSubmit={handleSignUp} className="w-full flex flex-col gap-4 mt-2">
                            <input
                                type="text"
                                placeholder="Name"
                                value={form.name}
                                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                className="rounded px-3 py-2 bg-[#19161c] border border-[#2a2a3a] text-white w-full"
                                required
                            />
                            <input
                                type="email"
                                placeholder="Email"
                                value={form.email}
                                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                className="rounded px-3 py-2 bg-[#19161c] border border-[#2a2a3a] text-white w-full"
                                required
                            />
                            <button type="submit" className="w-full py-2 rounded-lg bg-gradient-to-r from-[#14f195] to-[#9945ff] text-[#19161c] font-bold shadow hover:from-[#9945ff] hover:to-[#14f195] hover:text-white transition">Sign Up</button>
                        </form>
                    )}
                    {connected && walletAddress && merchant && !loading && (
                        <div className="w-full flex flex-col gap-4 mt-2">
                            <div className="grid grid-cols-1 gap-3">
                                <div className="flex flex-row justify-between items-center text-white/80"><span className="font-semibold">Wallet:</span><span className="font-mono text-white text-xs truncate max-w-[160px] text-right">{walletAddress}</span></div>
                                <div className="flex flex-row justify-between text-white/80"><span className="font-semibold">Email:</span><span className="font-bold text-white">{merchant.email}</span></div>
                                <div className="flex flex-row justify-between text-white/80"><span className="font-semibold">Trust Score:</span><span className="font-bold text-[#14f195]">{merchant.trust_score}</span></div>
                                <div className="flex flex-row justify-between text-white/80"><span className="font-semibold">Revenue:</span><span className="font-bold text-[#9945ff]">${merchant.revenue?.toLocaleString()}</span></div>
                                <button
                                    onClick={openEditModal}
                                    className="px-3 py-1 rounded bg-[#9945ff] text-white font-bold hover:bg-[#14f195] hover:text-[#19161c] transition text-sm shadow"
                                    title="Edit Profile"
                                >Edit</button>
                            </div>
                        </div>
                    )}
                </div>
                {/* Edit Profile Modal */}
                <EditProfileModal
                    open={editModalOpen}
                    onClose={() => setEditModalOpen(false)}
                    editForm={editForm}
                    setEditForm={setEditForm}
                    onSave={handleSaveEdit}
                    loading={loading}
                />
            </div>
        </div>
    );
} 