"use client";

import { Copy, CheckCircle2, MonitorSmartphone } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

export default function EmbedPage() {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const embedCode = `<script 
  src="https://agentify.io/widget.js"
  data-token="agt_cityclinic_123"
  data-business="City Medical Clinic"
></script>`;

  const directLink = "https://agentify.io/chat/city-medical-clinic";

  const handleCopyCode = () => {
    navigator.clipboard.writeText(embedCode);
    setCopiedCode(true);
    toast.success("Widget code copied!");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(directLink);
    setCopiedLink(true);
    toast.success("Direct link copied!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-1">Add Agent To Your Website</h2>
        <p className="text-text-secondary">Choose how you want to share your AI agent with customers.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-8">
          {/* Section 1 */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-bold text-lg mb-2">1. Website Embed</h3>
            <p className="text-sm text-text-secondary mb-4">Copy this code and paste it before the closing &lt;/body&gt; tag of your website.</p>
            
            <div className="relative mb-4">
              <pre className="bg-background border border-border rounded-lg p-4 text-sm font-mono overflow-x-auto text-primary">
                {embedCode}
              </pre>
              <button 
                onClick={handleCopyCode}
                className="absolute top-2 right-2 p-2 bg-card border border-border rounded-md hover:bg-border transition-colors text-text-secondary"
              >
                {copiedCode ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            
            <details className="group border border-border rounded-lg bg-background mb-2">
              <summary className="p-3 font-medium cursor-pointer flex justify-between items-center text-sm">
                WordPress Guide
                <span className="text-text-secondary group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="p-3 pt-0 text-sm text-text-secondary border-t border-border mt-1">
                Go to Appearance → Theme Editor → footer.php → paste before &lt;/body&gt;
              </div>
            </details>
            <details className="group border border-border rounded-lg bg-background">
              <summary className="p-3 font-medium cursor-pointer flex justify-between items-center text-sm">
                Shopify Guide
                <span className="text-text-secondary group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="p-3 pt-0 text-sm text-text-secondary border-t border-border mt-1">
                Online Store → Themes → Edit Code → theme.liquid → paste before &lt;/body&gt;
              </div>
            </details>
          </div>

          {/* Section 2 */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-bold text-lg mb-2">2. Direct Chat Link</h3>
            <p className="text-sm text-text-secondary mb-4">Don't have a website? Share this link on WhatsApp or social media.</p>
            
            <div className="flex gap-2 mb-4">
              <input 
                type="text" 
                readOnly 
                value={directLink}
                className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none"
              />
              <button 
                onClick={handleCopyLink}
                className="px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                {copiedLink ? <CheckCircle2 className="w-4 h-4" /> : "Copy Link"}
              </button>
            </div>
          </div>
        </div>

        {/* Section 3 - Preview */}
        <div className="bg-card border border-border rounded-xl p-6 flex flex-col h-[500px]">
          <div className="flex items-center gap-2 mb-4">
            <MonitorSmartphone className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-lg">Live Preview</h3>
          </div>
          
          <div className="flex-1 bg-background border border-border rounded-xl relative overflow-hidden group/preview">
            {/* Fake website bg */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "radial-gradient(#16a34a 1px, transparent 1px)", backgroundSize: "20px 20px" }}></div>
            
            {/* Real Preview Overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[2px] opacity-0 group-hover/preview:opacity-100 transition-opacity z-10">
              <a 
                href="/test-website.html" 
                target="_blank" 
                className="px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-xl hover:scale-105 transition-transform flex items-center gap-2"
              >
                <MonitorSmartphone className="w-5 h-5" />
                Open Live Preview
              </a>
            </div>

            {/* Widget Button */}
            <div className="absolute bottom-4 right-4 w-14 h-14 bg-primary rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(22,163,74,0.3)] cursor-pointer hover:scale-105 transition-transform group">
              <div className="text-2xl group-hover:hidden block">💬</div>
              <div className="text-2xl group-hover:block hidden font-bold">X</div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-background animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
