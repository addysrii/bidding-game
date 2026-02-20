import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
};

const modalVariants = {
    hidden: { y: "100%", opacity: 0 },
    visible: { y: "0%", opacity: 1, transition: { type: "spring", damping: 25, stiffness: 500 } },
    exit: { y: "100%", opacity: 0 }
};

const SquadModal = ({ team, onClose, isMyTeam, isAdmin }) => {
    if (!team) return null;

    // Calculate role breakdown
    const stats = {
        batters: team.roster?.filter(p => p.role === 'Batsman').length || 0,
        bowlers: team.roster?.filter(p => p.role === 'Bowler').length || 0,
        allRounders: team.roster?.filter(p => p.role === 'All-Rounder').length || 0,
        wks: team.roster?.filter(p => p.role === 'Wicket Keeper').length || 0,
    };

    const showDetails = isMyTeam || isAdmin;

    return (
        <AnimatePresence>
            <motion.div
                className="modal-backdrop"
                variants={backdropVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                onClick={onClose}
            >
                <motion.div
                    className="squad-modal"
                    variants={modalVariants}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="modal-header">
                        <h2 style={{ color: team.color }}>{team.name} <span className="squad-count">({team.players})</span></h2>
                        <button className="close-btn" onClick={onClose}>&times;</button>
                    </div>

                    <div className="modal-content">
                        {showDetails && (
                            <div className="role-breakdown">
                                <div className="role-stat">
                                    <span className="icon">🏏</span>
                                    <span className="count">{stats.batters}</span>
                                    <span className="label">Batters</span>
                                </div>
                                <div className="role-stat">
                                    <span className="icon">⚾</span>
                                    <span className="count">{stats.bowlers}</span>
                                    <span className="label">Bowlers</span>
                                </div>
                                <div className="role-stat">
                                    <span className="icon">⚔️</span>
                                    <span className="count">{stats.allRounders}</span>
                                    <span className="label">All-Rounders</span>
                                </div>
                                <div className="role-stat">
                                    <span className="icon">🧤</span>
                                    <span className="count">{stats.wks}</span>
                                    <span className="label">WK</span>
                                </div>
                            </div>
                        )}

                        <div className="roster-list">
                            <h3>Squad List</h3>
                            {team.roster && team.roster.length > 0 ? (
                                <ul>
                                    {team.roster.map((player, index) => (
                                        <li key={index} className="roster-item">
                                            <span className="p-name">{player.name}</span>
                                            <span className="p-role">{player.role}</span>
                                            <span className="p-role">{player.assignedCard?.label || 'Default Card'}</span>
                                            <span className="p-price">{player.soldPrice}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="empty-state">No players bought yet.</div>
                            )}
                        </div>

                        {!showDetails && (
                            <div className="restricted-notice">
                                * Purse details are hidden for other teams.
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default SquadModal;
