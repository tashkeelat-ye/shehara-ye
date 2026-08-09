import { useEffect, useState } from "react";

/**
 * Hook مخصص لحفظ واسترجاع البيانات محلياً (Offline Persistence)
 */
export function useOfflineData<T>(key: string, initialData: T): [T, (data: T) => void] {
  const [data, setData] = useState<T>(() => {
    if (typeof window === "undefined") return initialData;
    try {
      const localData = localStorage.getItem(`tashkilat_offline_${key}`);
      return localData ? JSON.parse(localData) : initialData;
    } catch (error) {
      console.error("Error reading offline data:", error);
      return initialData;
    }
  });

  const updateData = (newData: T) => {
    setData(newData);
    try {
      localStorage.setItem(`tashkilat_offline_${key}`, JSON.stringify(newData));
    } catch (error) {
      console.error("Error saving offline data:", error);
    }
  };

  useEffect(() => {
    if (data && typeof window !== "undefined") {
      try {
        localStorage.setItem(`tashkilat_offline_${key}`, JSON.stringify(data));
      } catch (error) {
        console.error("Error syncing offline data:", error);
      }
    }
  }, [key, data]);

  return [data, updateData];
}
