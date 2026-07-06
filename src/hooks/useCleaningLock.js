import { useState, useEffect, useRef } from 'react';
import { collection, query, where, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

export const useCleaningLock = () => {
  const { userData } = useAuth();
  const [isLocked, setIsLocked] = useState(false);
  const [loadingLock, setLoadingLock] = useState(true);

  // Keep a ref to the inner logs listener so we can tear it down
  // before creating a new one whenever branch_settings changes.
  const unsubLogsRef = useRef(null);

  useEffect(() => {
    if (!userData) {
      setIsLocked(false);
      setLoadingLock(false);
      return;
    }

    // Only receptionists need to upload cleaning photos
    if (userData.role !== 'receptionist') {
      setIsLocked(false);
      setLoadingLock(false);
      return;
    }

    const branchId = userData.branchId || userData.branchName;
    if (!branchId) {
      setLoadingLock(false);
      return;
    }

    const getWeekRange = (d) => {
      const date = new Date(d);
      date.setHours(0, 0, 0, 0);
      const day = date.getDay();
      const sunday = new Date(date);
      sunday.setDate(date.getDate() - day);
      const saturday = new Date(sunday);
      saturday.setDate(sunday.getDate() + 6);
      return { start: sunday, end: saturday };
    };

    // Outer listener — branch_settings (fires when HR changes the date)
    const unsubSettings = onSnapshot(
      doc(db, 'branch_settings', branchId),
      (docSnap) => {
        const overrideDateStr = docSnap.exists()
          ? docSnap.data().overrideCleaningDate
          : null;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const { start: weekStart, end: weekEnd } = getWeekRange(today);

        // Default target = Thursday (day 4)
        let targetDate = new Date(weekStart);
        targetDate.setDate(weekStart.getDate() + 4);

        // If HR override is in the current week, use it
        if (overrideDateStr) {
          const oDate = new Date(overrideDateStr);
          oDate.setHours(0, 0, 0, 0);
          if (oDate >= weekStart && oDate <= weekEnd) {
            targetDate = oDate;
          }
        }

        // If today is on or before the target date → never lock
        if (today <= targetDate) {
          setIsLocked(false);
          setLoadingLock(false);

          // ✅ KEY FIX: tear down any existing logs listener before returning
          if (unsubLogsRef.current) {
            unsubLogsRef.current();
            unsubLogsRef.current = null;
          }
          return;
        }

        // ✅ KEY FIX: tear down the OLD logs listener before creating a new one.
        // Without this, every HR date change stacks a new listener, causing
        // conflicting state (slow/no unlock).
        if (unsubLogsRef.current) {
          unsubLogsRef.current();
          unsubLogsRef.current = null;
        }

        // Inner listener — cleaning_logs for this branch
        const logsRef = collection(db, 'cleaning_logs');
        const q = query(logsRef, where('branchId', '==', branchId));

        const unsubLogs = onSnapshot(
          q,
          (logsSnap) => {
            const uploadsAfterTarget = logsSnap.docs.filter((d) => {
              const data = d.data();
              const logTimestamp = data.timestamp?.toDate
                ? data.timestamp.toDate()
                : data.timestamp
                ? new Date(data.timestamp)
                : null;
              return logTimestamp && logTimestamp >= targetDate;
            });

            setIsLocked(uploadsAfterTarget.length === 0);
            setLoadingLock(false);
          },
          (err) => {
            console.error('[useCleaningLock] Error listening to cleaning logs:', err);
            setLoadingLock(false);
          }
        );

        // Store the new inner listener ref
        unsubLogsRef.current = unsubLogs;
      },
      (err) => {
        console.error('[useCleaningLock] Error listening to branch_settings:', err);
        setLoadingLock(false);
      }
    );

    return () => {
      // Tear down both listeners on unmount
      unsubSettings();
      if (unsubLogsRef.current) {
        unsubLogsRef.current();
        unsubLogsRef.current = null;
      }
    };
  }, [userData]);

  return { isLocked, loadingLock };
};
