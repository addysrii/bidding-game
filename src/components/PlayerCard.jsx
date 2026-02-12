import React from 'react';
import { motion } from 'framer-motion';

const PlayerCard = ({ player, onBid, currentBid, highestBidder, isAdmin }) => {
    if (!player) return null;

    return (
        <motion.div
            className="player-card"
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
                LIVE
            </div>

            <div className="player-details">
                <div className="player-image-placeholder">
                    👤
                </div>

                <div className="player-info">
                    <h2>{player.name}</h2>
                    <div className="player-country">{player.country}</div>

                    <div className="player-stats">
                        <div className="stat-box">
                            <span className="label">Role</span>
                            <span className="value">{player.role}</span>
                        </div>
                        <div className="stat-box">
                            <span className="label">Runs</span>
                            <span className="value">{player.runs}</span>
                        </div>
                        <div className="stat-box">
                            <span className="label">Wickets</span>
                            <span className="value">{player.wickets}</span>
                        </div>
                        <div className="stat-box">
                            <span className="label">Avg</span>
                            <span className="value">{player.average}</span>
                        </div>
                        <div className="stat-box">
                            <span className="label">SR</span>
                            <span className="value">{player.strikeRate}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="auction-status">
                <div className="stat-box">
                    <span className="label">Base Price</span>
                    <span className="value">{player.basePrice}</span>
                </div>

                <div className="current-bid">
                    <div className="label">CURRENT BID</div>
                    <motion.div
                        key={currentBid}
                        className="bid-amount"
                        initial={{ scale: 1.5, color: '#fff' }}
                        animate={{ scale: 1, color: '#22c55e' }}
                    >
                        {currentBid} L
                    </motion.div>
                </div>

                <div className="stat-box" style={{ alignItems: 'flex-end' }}>
                    <span className="label">Highest Bidder</span>
                    <span className="value">{highestBidder || '—'}</span>
                </div>
            </div>

            <div className="auction-actions">
                {!isAdmin && (
                    <motion.button
                        className="action-btn bid-btn"
                        whileTap={{ scale: 0.95 }}
                        onClick={onBid}
                    >
                        BID (+20L)
                    </motion.button>
                )}
            </div>
        </motion.div>
    );
};

export default PlayerCard;
