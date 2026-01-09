import React from 'react';

/**
 * ScrollContainer - A reusable component that provides invisible scrolling
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.direction - Scroll direction: 'vertical', 'horizontal', or 'both'
 * @param {number} props.maxHeight - Maximum height for the container
 * @param {Object} props.style - Inline styles
 */
export default function ScrollContainer({ 
  children, 
  className = '', 
  direction = 'vertical',
  maxHeight,
  style = {},
  ...props 
}) {
  const getScrollClass = () => {
    switch (direction) {
      case 'horizontal':
        return 'overflow-x-scroll-invisible overflow-y-hidden';
      case 'both':
        return 'overflow-scroll-invisible';
      case 'vertical':
      default:
        return 'overflow-y-scroll-invisible overflow-x-hidden';
    }
  };

  const containerStyle = {
    ...style,
    ...(maxHeight && { maxHeight: `${maxHeight}px` })
  };

  return (
    <div 
      className={`${getScrollClass()} ${className}`}
      style={containerStyle}
      {...props}
    >
      {children}
    </div>
  );
}

// Specific scroll containers for common use cases
export const VerticalScrollContainer = ({ children, className = '', maxHeight, ...props }) => (
  <ScrollContainer 
    direction="vertical" 
    className={className} 
    maxHeight={maxHeight}
    {...props}
  >
    {children}
  </ScrollContainer>
);

export const HorizontalScrollContainer = ({ children, className = '', ...props }) => (
  <ScrollContainer 
    direction="horizontal" 
    className={className} 
    {...props}
  >
    {children}
  </ScrollContainer>
);

export const TableScrollContainer = ({ children, className = '', maxHeight = 400, ...props }) => (
  <ScrollContainer 
    direction="both" 
    className={`border border-gray-200 rounded-lg ${className}`} 
    maxHeight={maxHeight}
    {...props}
  >
    {children}
  </ScrollContainer>
);