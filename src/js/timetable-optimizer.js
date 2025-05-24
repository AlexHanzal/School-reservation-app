/**
 * Timetable data optimizer - Utility functions to optimize timetable data storage
 */

/**
 * Optimizes the timetable data structure to reduce file size by:
 * 1. Removing empty days, hours, and dates
 * 2. Using the permanentHours structure efficiently
 * 3. Restructuring data to minimize redundancy
 * 
 * @param {Object} timetable - The timetable object to optimize
 * @returns {Object} - The optimized timetable
 */
function optimizeTimetableData(timetable) {
    if (!timetable || typeof timetable !== 'object') {
        return timetable;
    }

    const optimized = {
        ...timetable,
        data: {}
    };

    // Copy only non-empty date data
    for (const dateString in timetable.data) {
        const dateData = timetable.data[dateString];
        
        // Skip dates with no data
        if (!hasContent(dateData)) {
            continue;
        }

        // Create optimized date entry
        optimized.data[dateString] = [];
        
        // Process each day in the date
        for (let dayIndex = 0; dayIndex < dateData.length; dayIndex++) {
            const dayData = dateData[dayIndex] || [];
            
            // Skip days that match permanent hours exactly
            if (isPermanentHourDay(dayData, timetable.permanentHours?.[dayIndex])) {
                optimized.data[dateString][dayIndex] = [];
                continue;
            }
            
            // Add day data, trimming trailing empty entries
            optimized.data[dateString][dayIndex] = trimEmptyEntries(dayData);
        }
        
        // Remove the date if it ended up empty after optimization
        if (!hasContent(optimized.data[dateString])) {
            delete optimized.data[dateString];
        }
    }

    return optimized;
}

/**
 * Checks if the date data has any content
 * @param {Array} dateData - Array of day data
 * @returns {boolean} - True if there is content
 */
function hasContent(dateData) {
    if (!dateData || !Array.isArray(dateData)) {
        return false;
    }
    
    for (const dayData of dateData) {
        if (!dayData || !Array.isArray(dayData)) {
            continue;
        }
        
        for (const cell of dayData) {
            if (cell && typeof cell === 'string' && cell.trim() !== '') {
                return true;
            }
        }
    }
    
    return false;
}

/**
 * Checks if a day's data matches its permanent hours exactly
 * @param {Array} dayData - Array of hour data for a day
 * @param {Object} permanentHours - Permanent hours for that day
 * @returns {boolean} - True if the day matches permanent hours exactly
 */
function isPermanentHourDay(dayData, permanentHours) {
    if (!permanentHours || Object.keys(permanentHours).length === 0) {
        return false;
    }
    
    if (!dayData || !Array.isArray(dayData)) {
        return false;
    }

    // Check that all non-empty cells match their corresponding permanent hours
    for (let hourIndex = 0; hourIndex < dayData.length; hourIndex++) {
        const cellContent = dayData[hourIndex];
        
        // Skip empty cells
        if (!cellContent || cellContent.trim() === '') {
            continue;
        }
        
        // If this hour has content but doesn't match the permanent hour, return false
        const permanentHour = permanentHours[hourIndex + 1];
        if (!permanentHour || permanentHour !== cellContent) {
            return false;
        }
    }
    
    // Check that all permanent hours are represented in the day data
    for (const hourKey in permanentHours) {
        const hourIndex = parseInt(hourKey) - 1;
        const permanentContent = permanentHours[hourKey];
        
        if (hourIndex >= dayData.length || dayData[hourIndex] !== permanentContent) {
            return false;
        }
    }
    
    return true;
}

/**
 * Trims trailing empty entries from an array
 * @param {Array} array - Array to trim
 * @returns {Array} - Trimmed array
 */
function trimEmptyEntries(array) {
    if (!array || !Array.isArray(array)) {
        return [];
    }
    
    let lastIndex = array.length - 1;
    while (lastIndex >= 0 && (!array[lastIndex] || array[lastIndex].trim() === '')) {
        lastIndex--;
    }
    
    return lastIndex < 0 ? [] : array.slice(0, lastIndex + 1);
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        optimizeTimetableData,
        hasContent,
        isPermanentHourDay,
        trimEmptyEntries
    };
}
