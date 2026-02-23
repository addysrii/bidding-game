import React from 'react';
import { motion } from 'framer-motion';

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const item = {
    hidden: { opacity: 0, scale: 0.9 },
    show: { opacity: 1, scale: 1 }
};

const TeamGrid = ({ teams, onTeamClick, title = "OTHER TEAMS", hidePurse = false }) => {
    return (
        <div className="team-section">
            {title && <h3>{title}</h3>}
            <motion.div
                className="team-grid"
                variants={container}
                initial="hidden"
                animate="show"
            >
                {teams.map((team) => (
                    <motion.div
                        key={team.id}
                        className="team-card squad-card"
                        variants={item}
                        whileHover={{ scale: 1.02, borderColor: team.color }}
                        style={{ borderLeft: `6px solid ${team.color}` }}
                        onClick={() => onTeamClick(team)}
                    >
                        <div className="team-header">
                            <div className="team-info-left">
                                <div className="team-code" style={{ color: team.color }}>{team.code}</div>
                                <div className="team-name">{team.name}</div>
                            </div>
                            <div className="team-stats-right">
                                {!hidePurse && <div className="funds-remaining">{team.funds}</div>}
                                <div className="player-count-badge">{team.players} Players</div>
                            </div>
                        </div>

                        <div className="squad-list-mini">
                            {team.roster && team.roster.length > 0 ? (
                                <div className="roster-pills">
                                    {team.roster.map((player, idx) => {
                                        const fullName = String(player?.name || 'Unknown Player').trim();
                                        const shortName = fullName.split(' ').pop() || fullName;
                                        return (
                                            <span key={player?.id || player?._id || idx} className="player-pill">
                                                {shortName}
                                            </span>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="empty-squad-text">No players yet</div>
                            )}
                        </div>
                    </motion.div>
                ))}
            </motion.div>
        </div>
    );
};

export default TeamGrid;
