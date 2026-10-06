# SwarpPay Web Frontend

A modern, responsive web application for SwarpPay - a cryptocurrency payment platform built with Next.js, TypeScript, and Tailwind CSS.

## 🚀 Features

- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Modern UI**: Clean, professional interface matching the mobile app design
- **TypeScript**: Full type safety and developer experience
- **Fast Development**: Hot reload with Next.js and Turbopack
- **Animations**: Smooth transitions and micro-interactions
- **Multi-language**: Prepared for English/Arabic internationalization

## 🛠 Tech Stack

- **Framework**: Next.js 15.4.5 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Font**: Inter (Google Fonts)
- **Icons**: Custom SVG components
- **State Management**: React useState (expandable to Context API/Redux)

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── globals.css        # Global styles and Tailwind imports
│   ├── layout.tsx         # Root layout with metadata
│   └── page.tsx           # Main page with screen routing
├── components/
│   ├── ui/                # Reusable UI components
│   │   ├── SwarpPayLogo.tsx
│   │   └── LanguageSelector.tsx
│   ├── onboarding/        # Onboarding flow screens
│   │   ├── SplashScreen.tsx
│   │   ├── WelcomeScreen.tsx
│   │   └── SignUpOptionsScreen.tsx
│   └── auth/              # Authentication components (future)
├── lib/                   # Utility functions and configurations
│   └── colors.ts          # Brand color definitions
├── types/                 # TypeScript type definitions
│   └── index.ts
├── hooks/                 # Custom React hooks (future)
├── services/              # API service layers (future)
└── assets/                # Static assets
    ├── icons/
    └── images/
```

## 🎨 Design System

### Colors
- **Primary Teal**: `#4ECDC4` - Main brand color
- **Primary Blue**: `#3B82F6` - Secondary accent
- **Primary Purple**: `#8B5CF6` - Tertiary accent
- **Background Dark**: `#0F0F23` - Main background
- **Background Card**: `#1A1A2E` - Card backgrounds

### Typography
- **Font**: Inter (system fallback: system-ui, -apple-system, sans-serif)
- **Weights**: Regular (400), Medium (500), Semibold (600), Bold (700)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm, yarn, or pnpm

### Installation

1. Navigate to the web frontend directory:
   ```bash
   cd swarppay-web
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## 📱 Current Screens

### 1. Splash Screen
- **Route**: Initial load
- **Features**: Animated logo, loading indicator, auto-transition
- **Duration**: 3 seconds (configurable)

### 2. Welcome Screen
- **Route**: `/` (after splash)
- **Features**: 
  - Language selector (English/Arabic)
  - Animated background elements
  - "Create account" and "Sign in" buttons
  - Responsive design for all screen sizes

### 3. Sign Up Options
- **Route**: Accessed via "Create account"
- **Features**:
  - Apple Sign In
  - Google OAuth
  - Email/Phone registration
  - Terms and Privacy Policy links
  - Back navigation

## 🔗 Backend Integration

The frontend is designed to integrate with the SwarpPay NestJS backend:

### API Endpoints (Ready for Integration)
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /auth/google` - Google OAuth
- `GET /auth/apple` - Apple Sign In
- `POST /auth/verify-otp` - OTP verification
- `GET /auth/profile` - User profile

### Next Steps for Backend Integration
1. Install axios or fetch wrapper
2. Create API service layer in `src/services/`
3. Implement authentication context
4. Add form validation with react-hook-form
5. Connect OAuth providers

## 🌐 Responsive Design

The application is fully responsive with breakpoints:
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px  
- **Desktop**: > 1024px

### Key Responsive Features
- Adaptive component sizing
- Mobile-first approach
- Touch-friendly interactions
- Optimized typography scaling

## 🎯 Future Enhancements

### Immediate Next Steps
1. **Authentication Forms**: Email/phone registration and login forms
2. **Dashboard**: User dashboard with wallet overview
3. **Wallet Management**: Create, view, and manage crypto wallets
4. **Transaction Flow**: Send/receive cryptocurrency
5. **Settings**: User preferences and security settings

### Advanced Features
1. **Internationalization**: i18next integration for multi-language
2. **Push Notifications**: Web push notifications
3. **PWA**: Progressive Web App capabilities
4. **Real-time Updates**: WebSocket integration
5. **Advanced Security**: Biometric authentication, 2FA

## 🔧 Development Guidelines

### Code Style
- Use TypeScript for all components
- Follow React functional component patterns
- Implement proper prop typing
- Use Tailwind utility classes
- Keep components small and focused

### Component Structure
```tsx
'use client'; // If using client-side features

import React from 'react';
import { ComponentProps } from '@/types';

interface ComponentNameProps {
  // Props definition
}

export const ComponentName: React.FC<ComponentNameProps> = ({ 
  // Props destructuring
}) => {
  return (
    // JSX
  );
};
```

### File Naming
- Components: PascalCase (e.g., `UserProfile.tsx`)
- Utilities: camelCase (e.g., `formatCurrency.ts`)
- Types: camelCase with `.types.ts` suffix
- Constants: UPPER_SNAKE_CASE

## 📄 License

This project is proprietary to SwarpPay.

---

**SwarpPay Web Frontend** - Fast, Secure, Borderless Payments 🚀