import React from 'react';
import { motion } from 'framer-motion';

const PlayerCard = ({ player, onBid, onSkip, currentBid, highestBidder, isAdmin, cardTheme }) => {
    if (!player) return null;

    const parsePriceToLakhs = (value) => {
        if (value == null) return NaN;
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
            const s = value.trim().toUpperCase();
            if (s.endsWith('L')) {
                const n = parseFloat(s.replace(/[^0-9.\-]/g, ''));
                return Number.isFinite(n) ? n : NaN;
            }
            if (s.endsWith('CR') || s.endsWith('CR.')) {
                const n = parseFloat(s.replace(/[^0-9.\-]/g, ''));
                return Number.isFinite(n) ? n * 100 : NaN;
            }
            const n = parseFloat(s.replace(/[^0-9.\-]/g, ''));
            return Number.isFinite(n) ? n : NaN;
        }
        return NaN;
    };

    const getIncrementForPlayer = () => {
        // Prefer current bid-driven increment (currentBid is in lakhs)
        const cb = parsePriceToLakhs(currentBid);
        if (Number.isFinite(cb)) {
            if (cb >= 1000) return 100;
            if (cb >= 200) return 50;
            if (cb >= 100) return 10;
            if (cb >= 80) return 5;
        }

        // Fallback to player's base price if no current bid
        const baseL = parsePriceToLakhs(player?.basePrice);
        if (Number.isFinite(baseL)) {
            if (baseL >= 80 && baseL <= 100) return 5;
            if (baseL > 100 && baseL <= 200) return 10;
            if (baseL > 200) return 50;
        }

        return 20; // default
    };
    const incrementL = getIncrementForPlayer();

    return (
        <motion.div
            className="player-card"
            style={cardTheme || {}}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <div className="live-badge">
                <motion.div
                    className="live-dot"
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                />
                {player?.isClosed ? player?.status || 'CLOSED' : 'LIVE'}
            </div>

            <div className="player-details">
                <div className="player-image-placeholder">
                    {player?.image ? (
                        <img src={player.image} alt={player?.name || 'Player'} />
                    ) : (
                        '👤'
                    )}
                </div>

                <div className="player-info">
                    <h2>{player.name}</h2>
                    <div className="player-country">{player.country}</div>

                    <div className="player-stats">
                        <div className="stat-box">
                            <span className="label">Category</span>
                            <span className="value">{player.category}</span>
                        </div>
                        <div className="stat-box">
                            <span className="label">Rating</span>
                            <span className="value">{player.rating}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="auction-status">
                <div className="stat-box">
                    <span className="label">Base Price</span>
                    <span className="value">{(player.basePrice/100)} CR</span>
                </div>

                <div className="current-bid">
                    <div className="label">CURRENT BID</div>
                    <motion.div
                        key={currentBid}
                        className="bid-amount"
                        initial={{ scale: 1.5, color: '#fff' }}
                        animate={{ scale: 1, color: '#22c55e' }}
                    >
                        {currentBid/100} CR
                    </motion.div>
                </div>

                <div className="stat-box" style={{ alignItems: 'flex-end' }}>
                    <span className="label">Highest Bidder</span>
                    <span className="value">{highestBidder || '—'}</span>
                </div>
            </div>

            <div className="auction-actions">
                {!isAdmin && (
                    <>
                        <motion.button
                            className="action-btn skip-btn"
                            whileTap={{ scale: 0.95 }}
                            onClick={onSkip}
                        >
                            SKIP
                        </motion.button>
                        <motion.button
                            className="action-btn bid-btn"
                            whileTap={{ scale: 0.95 }}
                            onClick={onBid}
                        >
                            {`BID (+${incrementL}L)`}
                        </motion.button>
                    </>
                )}
            </div>
        </motion.div>
    );
};

export default PlayerCard;
