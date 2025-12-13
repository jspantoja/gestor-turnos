/**
 * Haptic Feedback Utility
 * Provides subtle vibration feedback on mobile devices
 */

export const hapticFeedback = (type = 'light') => {
    if (!('vibrate' in navigator)) return;

    const patterns = {
        light: 10,      // Quick tap
        medium: 25,     // Standard press
        heavy: 50,      // Strong feedback
        success: [10, 50, 10],   // Double tap for success
        error: [50, 30, 50, 30, 50],  // Warning pattern
        selection: 5    // Very subtle for selections
    };

    try {
        navigator.vibrate(patterns[type] || patterns.light);
    } catch (e) {
        // Vibration API might be restricted in some contexts
        console.debug('Haptic feedback not available');
    }
};

/**
 * Check if haptic feedback is available
 */
export const isHapticAvailable = () => {
    return 'vibrate' in navigator;
};

export default hapticFeedback;
