import { useCallback, useEffect, useState } from "react";
import {
  offlineGetMetadata,
  offlineSetMetadata,
} from "@/lib/offline-db";

type OfflineDataState<T> = {
  value: T;
  hydrated: boolean;
};

function metadataKey(key: string): string {
  return `hook:${key}`;
}

/**
 * حفظ واسترجاع بيانات بسيطة محلياً باستخدام IndexedDB.
 *
 * يستخدم هذا الـHook للبيانات غير الحساسة التي نريد الاحتفاظ بها
 * أثناء انقطاع الإنترنت.
 */
export function useOfflineData<T>(
  key: string,
  initialData: T,
): [T, (data: T) => void] {
  const [state, setState] = useState<OfflineDataState<T>>({
    value: initialData,
    hydrated: false,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const stored = await offlineGetMetadata<T>(
          metadataKey(key),
        );

        if (!cancelled && stored !== null) {
          setState({
            value: stored,
            hydrated: true,
          });

          return;
        }

        if (!cancelled) {
          setState({
            value: initialData,
            hydrated: true,
          });
        }
      } catch (error) {
        console.warn(
          `[Offline] تعذر قراءة البيانات المحلية للمفتاح "${key}".`,
          error,
        );

        if (!cancelled) {
          setState({
            value: initialData,
            hydrated: true,
          });
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [key, initialData]);

  const updateData = useCallback(
    (newData: T) => {
      setState({
        value: newData,
        hydrated: true,
      });

      void offlineSetMetadata(
        metadataKey(key),
        newData,
      ).catch((error) => {
        console.warn(
          `[Offline] تعذر حفظ البيانات المحلية للمفتاح "${key}".`,
          error,
        );
      });
    },
    [key],
  );

  return [state.value, updateData];
}
