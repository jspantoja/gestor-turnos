import { useState, useMemo } from 'react';
import { addDays } from '../utils/helpers';

export const useSchedule = () => {
    const [viewMode, setViewMode] = useState('monthly');
    const [currentDate, setCurrentDate] = useState(new Date());

    const daysToShow = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const day = currentDate.getDate();
        const days = [];

        if (viewMode === 'monthly') {
            const numDays = new Date(year, month + 1, 0).getDate();
            const startDay = new Date(year, month, 1).getDay();

            for (let i = startDay; i > 0; i--) {
                days.push({ date: new Date(year, month, 1 - i), isCurrentMonth: false });
            }

            for (let i = 1; i <= numDays; i++) {
                days.push({ date: new Date(year, month, i), isCurrentMonth: true });
            }

            const remaining = (7 - (days.length % 7)) % 7;
            for (let i = 1; i <= remaining; i++) {
                days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
            }
        } else if (viewMode === 'biweekly') {
            const isFirstHalf = day <= 15;
            const startDay = isFirstHalf ? 1 : 16;
            const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
            const endDay = isFirstHalf ? 15 : lastDayOfMonth;

            for (let i = startDay; i <= endDay; i++) {
                days.push({ date: new Date(year, month, i), isCurrentMonth: true });
            }
        } else {
            const start = new Date(currentDate);
            const diff = start.getDate() - start.getDay() + (start.getDay() === 0 ? -6 : 1);
            start.setDate(diff);

            for (let i = 0; i < 7; i++) {
                days.push({ date: addDays(start, i), isCurrentMonth: true });
            }
        }
        return days;
    }, [currentDate, viewMode]);

    const navigate = (dir) => {
        const newDate = new Date(currentDate);
        if (viewMode === 'monthly') {
            newDate.setMonth(newDate.getMonth() + dir);
            newDate.setDate(1);
        } else if (viewMode === 'biweekly') {
            const day = newDate.getDate();
            if (dir > 0) {
                if (day <= 15) newDate.setDate(16);
                else {
                    newDate.setMonth(newDate.getMonth() + 1);
                    newDate.setDate(1);
                }
            } else {
                if (day > 15) newDate.setDate(1);
                else {
                    newDate.setMonth(newDate.getMonth() - 1);
                    newDate.setDate(16);
                }
            }
        } else {
            newDate.setDate(newDate.getDate() + (dir * 7));
        }
        setCurrentDate(newDate);
    };

    return {
        viewMode,
        setViewMode,
        currentDate,
        setCurrentDate,
        daysToShow,
        navigate
    };
};
