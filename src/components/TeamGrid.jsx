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

const TeamGrid = ({ teams, onTeamClick, title = "OTHER TEAMS" }) => {
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
                        className="team-card"
                        variants={item}
                        whileHover={{ scale: 1.05, borderColor: team.color }}
                        style={{ borderLeft: `4px solid ${team.color}` }}
                        onClick={() => onTeamClick(team)}
                    >
                        <div>
                            <div className="team-code" style={{ color: team.color }}>{team.code}</div>
                            <div className="team-name">{team.name}</div>
                        </div>

                        <div className="team-footer">
                            <span className="player-count">{team.players} 🏏</span>
                            <span className="funds-remaining">{team.funds}</span>
                        </div>
                    </motion.div>
                ))}
            </motion.div>
        </div>
    );
};

export default TeamGrid;
