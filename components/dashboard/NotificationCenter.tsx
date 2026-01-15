'use client';

import React, { useState, useRef } from 'react';
import { Bell, Trash2, Info, Coins, UserPlus, CreditCard, Receipt } from 'lucide-react';
import { useNotifications, Notification } from '@/hooks/dashboard/useNotifications';
import styles from './NotificationCenter.module.css';
import { useRouter } from 'next/navigation';

export default function NotificationCenter() {
    const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll, loading } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.is_read) {
            markAsRead(notification.id);
        }
        if (notification.link) {
            router.push(notification.link);
            setIsOpen(false);
        }
    };

    const handleMarkAllClick = () => {
        markAllAsRead();
    };

    const handleClearAll = () => {
        clearAll();
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'user': return <UserPlus size={16} className={styles.iconUser} />;
            case 'credit': return <Coins size={16} className={styles.iconCredit} />;
            case 'loan': return <CreditCard size={16} className={styles.iconLoan} />;
            case 'expense': return <Receipt size={16} className={styles.iconExpense} />;
            default: return <Info size={16} className={styles.iconSystem} />;
        }
    };

    return (
        <div className={styles.container}>
            <button
                className={`${styles.bellBtn} ${isOpen ? styles.active : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Notifications"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className={styles.badge}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    <div
                        className={styles.backdrop}
                        onClick={() => setIsOpen(false)}
                    />
                    <div className={styles.dropdown} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.header}>
                            <h3>Notifications</h3>
                            <div className={styles.headerActions}>
                                {unreadCount > 0 && (
                                    <button
                                        onClick={handleMarkAllClick}
                                        className={styles.markAllBtn}
                                    >
                                        Mark all read
                                    </button>
                                )}
                                {notifications.length > 0 && (
                                    <button
                                        onClick={handleClearAll}
                                        className={styles.clearBtn}
                                        title="Clear all notifications"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className={styles.list}>
                            {loading ? (
                                <div className={styles.loading}>Loading...</div>
                            ) : notifications.length === 0 ? (
                                <div className={styles.empty}>
                                    <Bell size={32} className={styles.emptyIcon} />
                                    <p>No notifications yet</p>
                                </div>
                            ) : (
                                notifications.map(notification => (
                                    <div
                                        key={notification.id}
                                        className={`${styles.item} ${!notification.is_read ? styles.unread : ''}`}
                                        onClick={() => handleNotificationClick(notification)}
                                    >
                                        <div className={styles.iconWrapper}>
                                            {getIcon(notification.type)}
                                        </div>
                                        <div className={styles.content}>
                                            <p className={styles.title}>{notification.title}</p>
                                            <p className={styles.message}>{notification.message}</p>
                                            <span className={styles.time}>
                                                {new Date(notification.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                        {!notification.is_read && (
                                            <div className={styles.indicator} />
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
