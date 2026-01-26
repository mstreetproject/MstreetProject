'use client';

import React, { useState } from 'react';
import {
    useFloating,
    autoUpdate,
    offset,
    flip,
    shift,
    useClick,
    useDismiss,
    useRole,
    useInteractions,
    FloatingPortal,
} from '@floating-ui/react';
import { MoreVertical } from 'lucide-react';
import styles from './SmartDropdown.module.css';

export interface DropdownAction {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    variant?: 'default' | 'danger';
    disabled?: boolean;
}

interface SmartDropdownProps {
    actions: DropdownAction[];
    triggerIcon?: React.ReactNode;
    className?: string;
}

export default function SmartDropdown({
    actions,
    triggerIcon,
    className = '',
}: SmartDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);

    const { refs, floatingStyles, context } = useFloating({
        open: isOpen,
        onOpenChange: setIsOpen,
        middleware: [
            offset(4),
            flip({
                fallbackAxisSideDirection: 'start',
                padding: 8,
            }),
            shift({ padding: 8 }),
        ],
        whileElementsMounted: autoUpdate,
        placement: 'bottom-end',
    });

    const click = useClick(context);
    const dismiss = useDismiss(context);
    const role = useRole(context, { role: 'menu' });

    const { getReferenceProps, getFloatingProps } = useInteractions([
        click,
        dismiss,
        role,
    ]);

    const handleActionClick = (action: DropdownAction, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!action.disabled) {
            setIsOpen(false);
            // Small delay to let the menu close smoothly before action
            setTimeout(() => {
                action.onClick();
            }, 50);
        }
    };

    if (actions.length === 0) {
        return null;
    }

    return (
        <div className={`${styles.dropdownContainer} ${className}`}>
            <button
                ref={refs.setReference}
                {...getReferenceProps({
                    onClick: (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                    },
                })}
                className={`${styles.trigger} ${isOpen ? styles.triggerActive : ''}`}
                aria-label="Actions menu"
                aria-expanded={isOpen}
                type="button"
            >
                {triggerIcon || <MoreVertical size={18} />}
            </button>

            {isOpen && (
                <FloatingPortal>
                    <div
                        ref={refs.setFloating}
                        style={floatingStyles}
                        {...getFloatingProps()}
                        className={styles.menu}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {actions.map((action, index) => (
                            <button
                                key={index}
                                className={`${styles.menuItem} ${action.variant === 'danger' ? styles.danger : ''
                                    } ${action.disabled ? styles.disabled : ''}`}
                                onClick={(e) => handleActionClick(action, e)}
                                disabled={action.disabled}
                                type="button"
                            >
                                {action.icon && (
                                    <span className={styles.icon}>{action.icon}</span>
                                )}
                                <span>{action.label}</span>
                            </button>
                        ))}
                    </div>
                </FloatingPortal>
            )}
        </div>
    );
}
