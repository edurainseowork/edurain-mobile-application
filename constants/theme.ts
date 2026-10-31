/**
 * EduRain Unified Theme Tokens
 * Direct 1:1 match with web app tailwind.config.js
 */

export const Theme = {
  colors: {
    // Primary ink palette
    ink: {
      primary: '#175A67',   // Main brand teal
      soft: '#2A707C',      // Subheadings & secondary labels
      deep: '#0F3C45',      // Deepest teal for headers and drawers
      light: '#E6F0F2',     // Tinted background / chips
    },
    // Paper / canvas background
    paper: {
      cream: '#EAE3DE',     // Warm accent card
      light: '#F4F0EC',     // Main screen background
      white: '#FFFFFF',     // Clean card surface
      dark: '#121212',      // Low-light surface
    },
    // Functional accents
    accent: {
      emerald: '#10B981',   // Success, enrolled, completed
      gold: '#EAB308',      // Badges, stars
      amber: '#F59E0B',     // Lock / Soon badges
      flame: '#FF6B4A',     // Streak flame
      error: '#EF4444',     // Errors
      border: 'rgba(23, 90, 103, 0.15)',
    },
    // Translucent glass layers
    glass: {
      card: 'rgba(255, 255, 255, 0.88)',
      border: 'rgba(255, 255, 255, 0.65)',
      darkCard: 'rgba(18, 18, 18, 0.85)',
      overlay: 'rgba(15, 60, 69, 0.60)',
    },
    // Text colors
    text: {
      primary: '#0F3C45',
      secondary: '#2A707C',
      muted: '#64748B',
      light: '#FFFFFF',
      gold: '#B8860B',
    },
  },

  fonts: {
    regular: 'Poppins-Regular',
    medium: 'Poppins-Medium',
    semiBold: 'Poppins-SemiBold',
    bold: 'Poppins-Bold',
    display: 'CormorantGaramond-Bold',
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 40,
  },

  radii: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },

  shadows: {
    card: {
      shadowColor: '#175A67',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 3,
    },
    subtle: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 2,
    },
    elevated: {
      shadowColor: '#175A67',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 20,
      elevation: 6,
    },
  },
};

