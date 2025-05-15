
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { QrReader } from "@blackbox-vision/react-qr-reader";

// Custom ViewFinder overlay
function ViewFinder() {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        border: '3px solid #14f195',
        borderRadius: 16,
        boxSizing: 'border-box',
        pointerEvents: 'none',
        zIndex: 2,
      }}
    />
  );
}

export default function Pay() {
  const [showScanner, setShowScanner] = useState(true);
  const [checkoutInfo, setCheckoutInfo] = useState<any>(null);
  const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'success'>('idle');

  function handleScan(data: string | null) {
    if (data) {
      try {
        const info = JSON.parse(data);
        setCheckoutInfo(info);
      } catch {
        setCheckoutInfo({ raw: data });
      }
      setShowScanner(false);
    }
  }

  function handleConfirmPay() {
    setTxStatus('pending');
    setTimeout(() => setTxStatus('success'), 1500); // Simulate tx
  }

  function handleResetAndScan() {
    setCheckoutInfo(null);
    setTxStatus('idle');
    setShowScanner(true);
  }

  return (
    <div className="min-h-screen bg-[#19161c] flex flex-col items-center px-4 py-8 pb-16">
      <div className="w-full max-w-md flex flex-col gap-6 z-10">
        <div className="flex flex-col items-center gap-4 p-4 bg-gradient-to-br from-[#23202b] to-[#19161c] border border-[#2a2a3a] shadow-xl rounded-lg">
          <h2 className="text-xl font-bold text-white mb-2">Pay with QR</h2>

          {showScanner && (
            <div className="w-full flex flex-col items-center gap-2">
              <div style={{ position: 'relative', width: 320, height: 320 }} className="mx-auto">
                <QrReader
                  constraints={{ facingMode: 'environment' }}
                  onResult={(result, error) => {
                    if (result) {
                      handleScan(result.getText());
                      setShowScanner(false);
                    }
                    if (error) {
                      console.error(error);
                    }
                  }}
                  scanDelay={1500}
                  ViewFinder={ViewFinder}
                  className="rounded-lg shadow-lg"
                  containerStyle={{ width: '100%', height: '100%', background: '#000', borderRadius: 16, overflow: 'hidden', position: 'relative' }}
                  videoContainerStyle={{ width: '100%', height: '100%', borderRadius: 16, overflow: 'hidden', position: 'relative' }}
                  videoStyle={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 16 }}
                  videoId="pay-qr-video"
                />
              </div>
              <span className="text-white/80 text-xs mt-2">Point camera at a QR code</span>
              <Button variant="outline" className="mt-2 border-[#9945ff] text-[#9945ff]" onClick={() => setShowScanner(false)}>Close Scanner</Button>
            </div>
          )}

          {!showScanner && checkoutInfo && (
            <div className="w-full flex flex-col items-center gap-2 mt-2">
              <div className="w-full rounded bg-[#23202b] border border-[#9945ff] p-4 text-white/90 text-sm">
                <div className="mb-1 font-bold text-lg">Checkout</div>
                {/* {checkoutInfo.merchant && <div>Merchant: <span className="font-semibold">{checkoutInfo.merchant}</span></div>}
                {checkoutInfo.amount && <div>Amount: <span className="font-semibold text-[#14f195]">{checkoutInfo.amount} SOL</span></div>}
                {checkoutInfo.items && <div>Items: <span>{checkoutInfo.items}</span></div>} */}
                {checkoutInfo && <div className="text-xs break-all">Raw Data: {JSON.stringify(checkoutInfo)}</div>}
              </div>
              {txStatus === 'idle' && (
                <Button onClick={handleConfirmPay} className="w-full py-2 rounded-lg bg-gradient-to-r from-[#14f195] to-[#9945ff] text-[#19161c] font-bold shadow hover:from-[#9945ff] hover:to-[#14f195] hover:text-white transition">Confirm & Pay</Button>
              )}
              {txStatus === 'pending' && <div className="text-[#14f195] font-bold">Processing...</div>}
              {txStatus === 'success' && <div className="text-[#14f195] font-bold">Payment Successful!</div>}
              <Button onClick={handleResetAndScan} className="w-full py-2 rounded-lg border border-[#9945ff] text-[#9945ff] mt-2 hover:bg-[#9945ff]/10">Scan Another</Button>
            </div>
          )}

          {!showScanner && !checkoutInfo && (
            <div className="w-full flex flex-col items-center gap-2 mt-2">
              <p className="text-white/80 text-center">Scanner is closed.</p>
              <Button onClick={() => setShowScanner(true)} className="w-full py-2 rounded-lg bg-gradient-to-r from-[#14f195] to-[#9945ff] text-[#19161c] font-bold shadow hover:from-[#9945ff] hover:to-[#14f195] hover:text-white transition">Open Scanner</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 