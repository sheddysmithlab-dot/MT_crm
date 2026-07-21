/**
 * Animation Error Handler for Framer Motion
 * Prevents animation-related crashes and provides fallbacks
 */

import React from 'react';

class AnimationErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    if (error.message && (
      error.message.includes('stop is not a function') ||
      error.message.includes('animate') ||
      error.message.includes('motion') ||
      error.message.includes('framer')
    )) {
      console.warn('⚠️ Animation error caught by boundary:', error);
      return { hasError: true };
    }
    return null;
  }

  componentDidCatch(error, errorInfo) {
    console.error('❌ Animation error boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Render fallback without animations
      return React.cloneElement(this.props.children, {
        // Remove motion properties and use regular div
        as: 'div',
        initial: undefined,
        animate: undefined,
        whileHover: undefined,
        whileTap: undefined,
        exit: undefined,
        transition: undefined,
      });
    }

    return this.props.children;
  }
}

/**
 * Safe motion wrapper that handles animation errors gracefully
 */
export const SafeMotion = ({ children, fallback = null, ...motionProps }) => {
  try {
    return (
      <AnimationErrorBoundary>
        {React.cloneElement(children, motionProps)}
      </AnimationErrorBoundary>
    );
  } catch (error) {
    console.warn('⚠️ Motion component error:', error);
    return fallback || children;
  }
};

export default AnimationErrorBoundary;