import React, { useState, useRef, cloneElement, isValidElement, Children, HTMLAttributes } from 'react';
import {
  useFloating,
  offset,
  flip,
  shift,
  arrow,
  size,
  autoUpdate,
  type Placement,
} from '@floating-ui/react';

// Props that can be passed to the child element
interface ChildProps extends HTMLAttributes<HTMLElement> {
  ref?: React.Ref<HTMLElement>;
}

interface TooltipProps {
  text: string;
  children: React.ReactElement<ChildProps>; // Child must be able to accept a ref and typical HTML attributes
  placement?: Placement;
  className?: string;
}

const Tooltip: React.FC<TooltipProps> = ({ text, children, placement = 'top', className = '' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const arrowRef = useRef<SVGSVGElement | null>(null);

  const { x, y, strategy, refs, middlewareData, context } = useFloating({
    placement,
    open: isVisible,
    onOpenChange: setIsVisible,
    middleware: [
      offset(8),
      flip(),
      shift({ padding: 8 }),
      arrow({ element: arrowRef }),
      size({
        apply({ availableWidth, elements }) {
          Object.assign(elements.floating.style, {
            maxWidth: `${availableWidth}px`,
          });
        },
        padding: 8,
      }),
    ],
    whileElementsMounted: autoUpdate,
  });

  // Define a type for the keys of staticSideMap
  type StaticSideMapKey = 'top' | 'right' | 'bottom' | 'left';

  const staticSideMap: Record<StaticSideMapKey, StaticSideMapKey> = {
    top: 'bottom',
    right: 'left',
    bottom: 'top',
    left: 'right',
  };
  
  // Determine staticSide safely
  const placementStart = context.placement.split('-')[0] as StaticSideMapKey;
  const staticSide = staticSideMap[placementStart] || 'bottom'; // Fallback, though flip should prevent invalid states

  // Ensure we only attempt to clone a single, valid React element.
  const child = Children.only(children);
  let referenceElement = children; // Default to original children

  if (isValidElement<ChildProps>(child)) {
    const currentProps = child.props as ChildProps;
    referenceElement = cloneElement(child, {
      ref: refs.setReference as React.Ref<HTMLElement>, // Explicitly cast ref
      onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
        setIsVisible(true);
        currentProps.onMouseEnter?.(e);
      },
      onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
        setIsVisible(false);
        currentProps.onMouseLeave?.(e);
      },
      onFocus: (e: React.FocusEvent<HTMLElement>) => {
        setIsVisible(true);
        currentProps.onFocus?.(e);
      },
      onBlur: (e: React.FocusEvent<HTMLElement>) => {
        setIsVisible(false);
        currentProps.onBlur?.(e);
      },
      tabIndex: 
        currentProps.tabIndex === undefined && 
        typeof child.type === 'string' && 
        !['button', 'input', 'select', 'textarea', 'a', 'summary'].includes(child.type) 
        ? 0 
        : currentProps.tabIndex,
    });
  }

  return (
    <>
      {referenceElement}
      {isVisible && (
        <div
          ref={refs.setFloating}
          role="tooltip"
          className={`absolute z-20 px-3 py-2 text-xs sm:text-sm font-medium text-gray-100 bg-gray-700 rounded-lg shadow-xl whitespace-normal break-words max-w-[280px] sm:max-w-sm ${className}`}
          style={{
            position: strategy,
            top: y ?? 0,
            left: x ?? 0,
          }}
        >
          {text}
          <svg
            ref={arrowRef}
            width="8"
            height="4"
            viewBox="0 0 8 4"
            className="absolute"
            style={{
              left: middlewareData.arrow?.x != null ? `${middlewareData.arrow.x}px` : '',
              top: middlewareData.arrow?.y != null ? `${middlewareData.arrow.y}px` : '',
              [staticSide as string]: '-4px',
            }}
            aria-hidden="true"
          >
            <path d="M0 4L4 0L8 4H0Z" fill="#374151" />
          </svg>
        </div>
      )}
    </>
  );
};

export default Tooltip; 