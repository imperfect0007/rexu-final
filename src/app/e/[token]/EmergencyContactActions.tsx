'use client';

import { Phone } from 'lucide-react';

type SafeContact = {
  id: string;
  name: string;
  relation: string;
  phone: string;
};

interface EmergencyContactActionsProps {
  guardianPhone: string | null;
  secondaryPhone: string | null;
  contacts: SafeContact[];
}

export function EmergencyContactActions({
  guardianPhone,
  secondaryPhone,
  contacts,
}: EmergencyContactActionsProps) {
  const triggerGuardian = () => {
    if (!guardianPhone) return;
    window.location.href = `tel:${guardianPhone}`;
  };

  const triggerSecondary = () => {
    if (!secondaryPhone) return;
    window.location.href = `tel:${secondaryPhone}`;
  };

  return (
    <div className="space-y-3">
      {guardianPhone && (
        <button
          type="button"
          onClick={triggerGuardian}
          className="block w-full py-4 px-4 rounded-[20px] bg-[#101518]/90 border border-white/10 hover:border-[#9AC57A]/40 hover:bg-[#101518] transition-colors active:scale-[0.98] text-left"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#0F3D2E]/40 border border-[#145A3A]/40 flex items-center justify-center">
                <Phone className="w-5 h-5 text-[#9AC57A]" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white">Call Guardian</div>
                <div className="text-[11px] text-[#B7BEC4]/60 uppercase tracking-[0.18em]">
                  Primary emergency contact
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-[#B7BEC4]/50">Tap to call (number hidden)</div>
            </div>
          </div>
        </button>
      )}

      {secondaryPhone && (
        <button
          type="button"
          onClick={triggerSecondary}
          className="block w-full py-4 px-4 rounded-[20px] bg-[#101518]/90 border border-white/10 hover:border-[#9AC57A]/30 hover:bg-[#101518] transition-colors active:scale-[0.98] text-left"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#2B3136] border border-[#3A3F45] flex items-center justify-center">
                <Phone className="w-5 h-5 text-[#B7BEC4]" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white">Call Emergency Contact</div>
                <div className="text-[11px] text-[#B7BEC4]/60 uppercase tracking-[0.18em]">
                  Backup / secondary
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-[#B7BEC4]/50">Tap to call (number hidden)</div>
            </div>
          </div>
        </button>
      )}

      {contacts.length > 1 && (
        <div className="pt-1 space-y-1">
          {contacts.slice(0, 3).map((contact) => (
            <a
              key={contact.id}
              href={`tel:${contact.phone}`}
              className="block w-full py-3 px-3 rounded-[16px] bg-[#101518]/70 border border-white/5 hover:border-white/10 transition-colors active:scale-[0.98]"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-left">
                  <div className="text-xs font-semibold text-white">{contact.name}</div>
                  <div className="text-[10px] text-[#B7BEC4]/50 uppercase tracking-[0.16em]">
                    {contact.relation}
                  </div>
                </div>
                <div className="text-right text-[11px] text-[#B7BEC4] font-mono">
                  {contact.phone.length > 6
                    ? `${contact.phone.slice(0, 4)}${'*'.repeat(contact.phone.length - 6)}${contact.phone.slice(-2)}`
                    : '******'}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

