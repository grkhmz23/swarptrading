// Swarp Foundation Dashboard Brand Colors
export const colors = {
  primary: {
    teal: '#40E0D0', // Main teal/cyan color from Figma
    red: '#E91C48', // Red accent from Figma
    blue: '#3B82F6', // Blue accent
    purple: '#8B5CF6', // Purple accent
  },
  background: {
    dark: '#090A11', // Main dark background from Figma
    darker: '#000000', // Pure black for contrast
    card: '#131519', // Card backgrounds from Figma
    input: '#131519', // Input field background
  },
  text: {
    primary: '#FFFFFF', // Primary white text
    secondary: '#636466', // Secondary gray text from Figma
    muted: '#B3B5B6', // Muted text from Figma
    placeholder: '#B3B5B6', // Placeholder text
  },
  border: {
    default: '#2B2D30', // Default border color from Figma
    gray: '#919194', // Gray border
  },
  button: {
    primary: '#40E0D0', // Primary teal button
    secondary: '#131519', // Secondary dark button
    outline: 'rgba(255, 255, 255, 0.1)',
  },
  social: {
    google: {
      blue: '#4285F4',
      green: '#34A853',
      yellow: '#FBBC05',
      red: '#EB4335',
    }
  }
} as const;