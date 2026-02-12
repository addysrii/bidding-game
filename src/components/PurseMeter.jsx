import React from 'react';
import { motion } from 'framer-motion';

const PurseMeter = ({ total, spent, remaining }) => {
    // Convert "100 Cr" string to number for calculation if needed, 
    // but here we can assume simplified props or parse them.
    // For visual simplicity, let's assume total is always 100 for percentage calculation 
    // or we parse the strings.

    const parseAmount = (str) => parseFloat(str.replace('₹', '').replace(' Cr', ''));
    const totalVal = parseAmount(total);
    const spentVal = parseAmount(spent);
    const percentage = (spentVal / totalVal) * 100;

    return (
        <div className="purse-meter-container">
            <div className="purse-info">
                <span className="label">Purse Used</span>
                <span className="value">{Math.round(percentage)}%</span>
            </div>
            <div className="meter-track">
                <motion.div
                    className="meter-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                />
            </div>
            <div className="purse-details-mini">
                <span>{spent} / {total}</span>
            </div>
        </div>
    );
};

export default PurseMeter;
