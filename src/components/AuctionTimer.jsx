import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import '../styles/AuctionTimer.css';

const AuctionTimer = ({ initialSeconds = 60, onTimerChange, readOnly = false }) => {
    const [timeLeft, setTimeLeft] = useState(initialSeconds);
    const [isActive, setIsActive] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(initialSeconds);
    const [lastInitialSeconds, setLastInitialSeconds] = useState(initialSeconds);

    // Update timer when initialSeconds changes (when admin updates it)
    useEffect(() => {
        if (lastInitialSeconds !== initialSeconds) {
            setTimeLeft(initialSeconds);
            setEditValue(initialSeconds);
            setLastInitialSeconds(initialSeconds);  
            // Only restart if it's a read-only dashboard timer
            if (readOnly) {
                setIsActive(true);
            }
        }
    }, [initialSeconds, lastInitialSeconds, readOnly]);

    // Countdown effect
    useEffect(() => {
        if (!isActive || timeLeft <= 0 || isEditing) return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    setIsActive(false);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isActive, timeLeft, isEditing]);

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const percentage = (timeLeft / initialSeconds) * 100;

    // Color changes based on time remaining
    let timerColor = '#00D9FF'; // Cyan - Normal
    if (percentage <= 33) timerColor = '#FF006E'; // Pink - Critical
    else if (percentage <= 66) timerColor = '#FFD700'; // Gold - Warning

    const handleDecrement = () => {
        const newValue = Math.max(10, timeLeft - 5);
        setTimeLeft(newValue);
    };

    const handleIncrement = () => {
        const newValue = Math.min(300, timeLeft + 5);
        setTimeLeft(newValue);
    };

    const handleReset = () => {
        setTimeLeft(initialSeconds);
        setIsActive(false);
    };

    const handleEditSave = () => {
        const newValue = Math.max(10, Math.min(300, parseInt(editValue) || initialSeconds));
        setTimeLeft(newValue);
        onTimerChange?.(newValue);
        setIsEditing(false);
    };

    return (
        <motion.div
            className="auction-timer-container"
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <div className="timer-header">
                <span className="timer-label">AUCTION TIME</span>
            </div>

            <div className="timer-display">
                <svg className="timer-ring" viewBox="0 0 100 100">
                    <circle
                        className="timer-ring-bg"
                        cx="50"
                        cy="50"
                        r="45"
                    />
                    <motion.circle
                        className="timer-ring-progress"
                        cx="50"
                        cy="50"
                        r="45"
                        style={{
                            strokeDashoffset: 282.7 - (282.7 * percentage) / 100,
                            stroke: timerColor,
                        }}
                        animate={{
                            stroke: timerColor,
                        }}
                        transition={{ duration: 0.3 }}
                    />
                </svg>

                <motion.div
                    className="timer-value"
                    style={{ color: timerColor }}
                    animate={{ color: timerColor }}
                    transition={{ duration: 0.3 }}
                    onClick={() => setIsEditing(true)}
                >
                    {isEditing ? (
                        <input
                            type="number"
                            className="timer-input"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            min="10"
                            max="300"
                            autoFocus
                            onBlur={handleEditSave}
                            onKeyPress={(e) => e.key === 'Enter' && handleEditSave()}
                        />
                    ) : (
                        <span className="time-format">
                            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                        </span>
                    )}
                </motion.div>
            </div>

            {timeLeft <= 10 && !isEditing && (
                <motion.div
                    className="timer-warning"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                >
                    ⚠️ TIME RUNNING OUT
                </motion.div>
            )}

            {!readOnly && (
                <div className="timer-controls">
                    <button 
                        className="timer-btn decrement-btn"
                        onClick={handleDecrement}
                        disabled={isActive}
                        title="Decrease 5 seconds"
                    >
                        ➖
                    </button>
                    <button 
                        className={`timer-btn ${isActive ? 'pause-btn' : 'play-btn'}`}
                        onClick={() => setIsActive(!isActive)}
                        title={isActive ? 'Pause' : 'Start'}
                    >
                        {isActive ? '⏸️' : '▶️'}
                    </button>
                    <button 
                        className="timer-btn increment-btn"
                        onClick={handleIncrement}
                        disabled={isActive}
                        title="Increase 5 seconds"
                    >
                        ➕
                    </button>
                    <button 
                        className="timer-btn reset-btn"
                        onClick={handleReset}
                        title="Reset timer"
                    >
                        🔄
                    </button>
                </div>
            )}

            <div className="timer-status">
                {timeLeft === 0 ? (
                    <span className="status-expired">TIME'S UP!</span>
                ) : isActive ? (
                    <span className="status-active">🔴 LIVE</span>
                ) : (
                    <span className="status-paused">⏸️ PAUSED</span>
                )}
            </div>
        </motion.div>
    );
};

export default AuctionTimer;
