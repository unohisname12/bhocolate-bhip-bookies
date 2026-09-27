import React, { useState } from 'react';
import { Modal } from '../ui/Modal';

interface MailboxReward {
  tokens: number;
  message: string;
}

interface MailboxPopupProps {
  reward: MailboxReward | null;
  onClaim: () => void;
  onClose: () => void;
}

/**
 * In-world popup for the mailbox interaction.
 * Shows a reward card when something is available, or a "nothing new" message.
 */
export const MailboxPopup: React.FC<MailboxPopupProps> = ({ reward, onClaim, onClose }) => {
  const [claimed, setClaimed] = useState(false);

  const handleClaim = () => {
    setClaimed(true);
    onClaim();
    setTimeout(onClose, 800);
  };

  return (
    <Modal isOpen onClose={onClose} title="Mailbox">
        {reward && !claimed ? (
          <>
            {/* Reward message */}
            <p className="text-white/70 text-sm mb-4 leading-relaxed">
              {reward.message}
            </p>

            {/* Reward display */}
            <div
              className="rounded-xl p-3 mb-4 flex items-center gap-3"
              style={{
                background: 'linear-gradient(135deg, rgba(251,191,36,0.12) 0%, rgba(217,119,6,0.08) 100%)',
                border: '1px solid rgba(251,191,36,0.2)',
              }}
            >
              <img
                src="/assets/generated/final/reward_coin_stack.png"
                alt="coins"
                className="w-8 h-8"
                style={{ imageRendering: 'pixelated' }}
              />
              <div>
                <div className="text-yellow-300 font-black text-lg leading-none">
                  +{reward.tokens}
                </div>
                <div className="text-yellow-300/60 text-[10px] font-bold uppercase tracking-wider mt-0.5">
                  Tokens
                </div>
              </div>
            </div>

            {/* Claim button */}
            <button
              onClick={handleClaim}
              className="w-full py-2.5 rounded-xl font-bold text-sm text-white transition-all active:scale-95"
              style={{
                background: 'linear-gradient(180deg, #f59e0b 0%, #d97706 100%)',
                boxShadow: '0 2px 12px rgba(245,158,11,0.3), 0 1px 0 rgba(255,255,255,0.15) inset',
              }}
            >
              Claim Reward
            </button>
          </>
        ) : claimed ? (
          <div className="text-center py-4">
            <div className="text-3xl mb-2 anim-scene-claim-pop">✨</div>
            <p className="text-yellow-300 font-bold text-sm">Claimed!</p>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-white/50 text-sm">
              No new mail right now.<br />
              <span className="text-white/30 text-xs">Check back tomorrow!</span>
            </p>
          </div>
        )}
    </Modal>
  );
};
