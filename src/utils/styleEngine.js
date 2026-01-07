/**
 * THE STYLE ENGINE
 * Centralized logic for shift label appearance.
 * Adopts the "Apple Style" philosophy of unifying visual systems.
 */

// Defaults if settings are missing
const DEFAULT_APPEARANCE = {
    shiftVariant: 'soft', // 'solid', 'soft', 'outline', 'minimal'
    shiftRadius: 'md',    // 'sm', 'md', 'lg', 'full'
};

/**
 * Generates the CSS classes and inline styles for a shift pill/chip.
 * 
 * @param {Object} colorData - The resolved color object { bg, text, border, hex }
 * @param {Object} settings - Global application settings containing 'appearance'
 * @returns {Object} { className, style }
 */
export const getShiftStyle = (colorData, settings) => {
    const appearance = settings?.appearance || DEFAULT_APPEARANCE;
    const variant = appearance.shiftVariant || 'soft';
    const radius = appearance.shiftRadius || 'md';

    let baseClasses = `text-[10px] font-bold px-2 py-0.5 truncate transition-all duration-200`;
    let style = {};

    // 1. Radius System
    const radii = {
        'none': 'rounded-none',
        'sm': 'rounded',
        'md': 'rounded-md',
        'lg': 'rounded-lg',
        'full': 'rounded-full'
    };
    baseClasses += ` ${radii[radius] || 'rounded-md'}`;

    // 2. Color System Resolution
    // If we have a Tailwind Class object
    if (colorData?.bg && colorData?.text) {
        // --- TAILWIND COLORS ---
        const bgBase = colorData.bg.replace('bg-', ''); // e.g., 'blue-100' or 'blue-500' depending on source
        const textBase = colorData.text;

        switch (variant) {
            case 'solid':
                // For solid, we usually want a stronger start. 
                // If the input is 'bg-blue-100', we might want 'bg-blue-500'.
                // But simplifying: Use the input background BUT force high opacity if it was low.
                // Actually, our constants usually give 'bg-blue-100' for soft. 
                // We'll rely on the existing class but modify generic opacity if present.
                baseClasses += ` ${colorData.bg} ${colorData.text} border border-transparent`;
                break;

            case 'soft':
                // Classic "Pastel" look. Existing constants are good for this.
                // Ensure opacity is handled if needed.
                baseClasses += ` ${colorData.bg} ${colorData.text} border border-transparent`;
                // Add backdrop blur for extra "Apple" feel?
                // baseClasses += ' backdrop-blur-sm'; 
                break;

            case 'outline':
                baseClasses += ` bg-transparent border ${colorData.text.replace('text-', 'border-')} ${colorData.text}`;
                break;

            case 'minimal':
                baseClasses += ` bg-transparent border-none ${colorData.text} p-0 px-1 italic`;
                break;
        }
    }
    // If we have a Hex Color (Custom)
    else if (colorData?.hex) {
        // --- HEX COLORS ---
        const hex = colorData.hex;

        switch (variant) {
            case 'solid':
                style = { backgroundColor: hex, color: '#ffffff', borderColor: hex };
                baseClasses += ` border`;
                break;

            case 'soft':
                // Create a dynamic pastel from the hex using CSS opacity
                // We assume the background is the hex with low opacity, text is the hex.
                style = {
                    backgroundColor: `${hex}25`, // 15% opacity
                    color: hex,
                    borderColor: 'transparent'
                };
                baseClasses += ` border`;
                break;

            case 'outline':
                style = {
                    backgroundColor: 'transparent',
                    color: hex,
                    borderColor: hex
                };
                baseClasses += ` border`;
                break;

            case 'minimal':
                style = {
                    backgroundColor: 'transparent',
                    color: hex
                };
                baseClasses += ` px-1 italic`;
                break;
        }
    }
    // Fallback (Gray)
    else {
        baseClasses += ' bg-gray-100 text-gray-500';
    }

    return { className: baseClasses, style };
};
